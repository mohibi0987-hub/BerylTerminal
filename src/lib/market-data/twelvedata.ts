// Twelve Data provider.
//
// Works today on the free Basic plan (twelvedata.com/pricing): 800 API credits/day, real-time
// REST quotes for US equities/forex/crypto, plus a trial allotment of WebSocket credits — enough
// to prove the whole pipeline works before paying anything. Full WebSocket streaming across your
// whole symbol universe needs the Pro plan ($99/mo) or above; this file works unmodified on
// either tier — only the credit ceiling changes.
//
// Required env var: TWELVEDATA_API_KEY

import type { Bar, MarketDataService, Quote } from "./types";
import { getCached, setCached } from "./cache";

const REST_BASE = "https://api.twelvedata.com";
const WS_URL = "wss://ws.twelvedata.com/v1/quotes/price";

// Matches the Chart component's own 15s poll interval — caching for the
// same window means a poll that lands on an already-warm cache entry
// costs zero Twelve Data credits instead of one per request.
const QUOTE_TTL_MS = 15_000;
const BARS_TTL_MS = 15_000;

export class TwelveDataService implements MarketDataService {
  constructor(private apiKey: string = process.env.TWELVEDATA_API_KEY ?? "") {
    if (!this.apiKey) {
      throw new Error("TWELVEDATA_API_KEY is not set — add it in your Vercel project's environment variables.");
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    const cacheKey = `quote:${symbol}`;
    const cached = getCached<Quote>(cacheKey);
    if (cached) return cached;

    const res = await fetch(`${REST_BASE}/price?symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`);
    const json = await res.json();
    if (json.status === "error" || json.code) {
      throw new Error(`Twelve Data error for ${symbol}: ${json.message ?? JSON.stringify(json)}`);
    }
    const quote: Quote = { symbol, price: parseFloat(json.price), timestamp: new Date().toISOString() };
    setCached(cacheKey, quote, QUOTE_TTL_MS);
    return quote;
  }

  // Batch quotes for more than one symbol at once. Twelve Data's /price
  // endpoint accepts a comma-separated symbol list and, when given more
  // than one symbol, returns an object keyed by symbol instead of a single
  // flat {price: "..."} — this method is what actually understands both
  // shapes. Prior to this, callers (Watchlist, the Markets page) were
  // joining symbols with commas and calling getQuote() directly, which only
  // ever handled the single-symbol shape — a real, silent bug for anyone
  // with more than one item in their watchlist.
  async getQuotes(symbols: string[]): Promise<Quote[]> {
    const uncached: string[] = [];
    const results: Quote[] = [];
    for (const symbol of symbols) {
      const cached = getCached<Quote>(`quote:${symbol}`);
      if (cached) results.push(cached); else uncached.push(symbol);
    }
    if (uncached.length === 0) return results;

    const res = await fetch(`${REST_BASE}/price?symbol=${encodeURIComponent(uncached.join(","))}&apikey=${this.apiKey}`);
    const json = await res.json();
    if (json.status === "error" || json.code) {
      throw new Error(`Twelve Data error for ${uncached.join(",")}: ${json.message ?? JSON.stringify(json)}`);
    }

    if (uncached.length === 1) {
      // Single-symbol shape even though we went through the batch path —
      // Twelve Data only switches to the keyed shape once 2+ symbols are requested.
      const quote: Quote = { symbol: uncached[0], price: parseFloat(json.price), timestamp: new Date().toISOString() };
      setCached(`quote:${uncached[0]}`, quote, QUOTE_TTL_MS);
      results.push(quote);
    } else {
      for (const symbol of uncached) {
        const entry = json[symbol];
        if (!entry || entry.status === "error") continue; // skip symbols Twelve Data couldn't resolve, rather than fail the whole batch
        const quote: Quote = { symbol, price: parseFloat(entry.price), timestamp: new Date().toISOString() };
        setCached(`quote:${symbol}`, quote, QUOTE_TTL_MS);
        results.push(quote);
      }
    }
    return results;
  }

  async getBars(symbol: string, interval: string, outputSize = 100): Promise<Bar[]> {
    const cacheKey = `bars:${symbol}:${interval}:${outputSize}`;
    const cached = getCached<Bar[]>(cacheKey);
    if (cached) return cached;

    const url = `${REST_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputSize}&apikey=${this.apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === "error" || json.code) {
      throw new Error(`Twelve Data error for ${symbol}: ${json.message ?? JSON.stringify(json)}`);
    }
    const values = (json.values ?? []) as any[];
    const bars = values
      .map((v) => ({
        timestamp: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume ?? "0"),
      }))
      .reverse(); // Twelve Data returns newest-first; charts want oldest-first
    setCached(cacheKey, bars, BARS_TTL_MS);
    return bars;
  }

  // Node's `ws` package is required server-side for this (browsers use native WebSocket instead —
  // see the /api/market-data/stream route, which relays this server-side connection to the client).
  subscribe(symbols: string[], onQuote: (q: Quote) => void): () => void {
    // Lazy import so this file can still be imported in contexts that never call subscribe().
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WebSocket = require("ws");
    const ws = new WebSocket(`${WS_URL}?apikey=${this.apiKey}`);
    ws.on("open", () => {
      ws.send(JSON.stringify({ action: "subscribe", params: { symbols: symbols.join(",") } }));
    });
    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.event === "price" && msg.symbol && msg.price != null) {
          onQuote({ symbol: msg.symbol, price: parseFloat(msg.price), timestamp: new Date().toISOString() });
        }
      } catch {
        // ignore malformed frames rather than crashing the stream
      }
    });
    return () => ws.close();
  }
}
