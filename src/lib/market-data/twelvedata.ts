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

const REST_BASE = "https://api.twelvedata.com";
const WS_URL = "wss://ws.twelvedata.com/v1/quotes/price";

export class TwelveDataService implements MarketDataService {
  constructor(private apiKey: string = process.env.TWELVEDATA_API_KEY ?? "") {
    if (!this.apiKey) {
      throw new Error("TWELVEDATA_API_KEY is not set — add it in your Vercel project's environment variables.");
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    const res = await fetch(`${REST_BASE}/price?symbol=${encodeURIComponent(symbol)}&apikey=${this.apiKey}`);
    const json = await res.json();
    if (json.status === "error" || json.code) {
      throw new Error(`Twelve Data error for ${symbol}: ${json.message ?? JSON.stringify(json)}`);
    }
    return { symbol, price: parseFloat(json.price), timestamp: new Date().toISOString() };
  }

  async getBars(symbol: string, interval: string, outputSize = 100): Promise<Bar[]> {
    const url = `${REST_BASE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&outputsize=${outputSize}&apikey=${this.apiKey}`;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status === "error" || json.code) {
      throw new Error(`Twelve Data error for ${symbol}: ${json.message ?? JSON.stringify(json)}`);
    }
    const values = (json.values ?? []) as any[];
    return values
      .map((v) => ({
        timestamp: v.datetime,
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume ?? "0"),
      }))
      .reverse(); // Twelve Data returns newest-first; charts want oldest-first
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
