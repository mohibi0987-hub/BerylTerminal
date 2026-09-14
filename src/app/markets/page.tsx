"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { Watchlist } from "@/components/Watchlist";
import { SymbolSearch } from "@/components/SymbolSearch";

// Curated symbol lists, not a real market-wide screener — Twelve Data's
// current plan here doesn't support scanning the whole market, and this
// app doesn't have a futures data source with real continuous-contract
// coverage. Rows for symbols Twelve Data can't resolve are simply skipped
// (see getQuotes in twelvedata.ts) rather than shown with fake numbers.
const CATEGORIES = {
  stocks: { label: "Stocks", symbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA", "META", "JPM"] },
  crypto: { label: "Crypto", symbols: ["BTC/USD", "ETH/USD", "SOL/USD", "XRP/USD"] },
  futures: { label: "Futures", symbols: ["ES", "NQ", "CL", "GC"] },
} as const;

type Quote = { symbol: string; price: number; timestamp: string };
type Tab = "overview" | "stocks" | "crypto" | "futures" | "watchlist";

function QuoteTable({ symbols, onOpen }: { symbols: readonly string[]; onOpen: (s: string) => void }) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(symbols.join(","))}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(data?.error ?? `Couldn't load quotes (${res.status}).`); return; }
        setError(null);
        const list = Array.isArray(data) ? data : [data];
        setQuotes(Object.fromEntries(list.filter((q) => q?.symbol).map((q) => [q.symbol, q])));
      } catch {
        if (!cancelled) setError("Couldn't reach the server.");
      }
    }
    load();
    const poll = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(poll); };
  }, [symbols]);

  return (
    <div>
      {error && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{error}</div>}
      {symbols.map((sym) => {
        const q = quotes[sym];
        return (
          <div
            key={sym}
            onClick={() => onOpen(sym)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}
          >
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>{sym}</span>
            <span className="mono" style={{ fontSize: 13.5, color: q ? "var(--text)" : "var(--faint)" }}>
              {q ? `$${q.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function MarketsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [symbol, setSymbol] = useState("AAPL");

  function openInTerminal(sym: string) {
    router.push(`/terminal?symbol=${encodeURIComponent(sym)}`);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "stocks", label: "Stocks" },
    { key: "crypto", label: "Crypto" },
    { key: "futures", label: "Futures" },
    { key: "watchlist", label: "Watchlist" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0A0E17", color: "var(--text)" }}>
      <div style={{ height: 54, display: "flex", alignItems: "center", gap: 16, padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
        <a href="/" className="disp" style={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green)", boxShadow: "0 0 12px rgba(45,212,167,.65)" }} />
          BerylTerminal
        </a>
        <div style={{ width: 220 }}>
          <SymbolSearch value={symbol} onChange={setSymbol} onSelect={openInTerminal} />
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <a href="/terminal" style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontWeight: 700, fontSize: 12, textDecoration: "none" }}>
            Open Terminal
          </a>
          <UserButton afterSignOutUrl="/login" appearance={clerkAppearance} />
        </div>
      </div>

      <div style={{ height: 40, display: "flex", alignItems: "center", gap: 4, padding: "0 16px", borderBottom: "1px solid var(--border)" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: "7px 14px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
              background: tab === t.key ? "var(--panel2)" : "transparent",
              color: tab === t.key ? "var(--text)" : "var(--muted)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {tab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              {(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).map((key) => (
                <div key={key} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: 13 }}>{CATEGORIES[key].label}</div>
                  <QuoteTable symbols={CATEGORIES[key].symbols.slice(0, 4)} onOpen={openInTerminal} />
                </div>
              ))}
            </div>
          )}

          {(tab === "stocks" || tab === "crypto" || tab === "futures") && (
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <QuoteTable symbols={CATEGORIES[tab].symbols} onOpen={openInTerminal} />
            </div>
          )}

          {tab === "watchlist" && (
            <div style={{ maxWidth: 420 }}>
              <Watchlist onSelectSymbol={openInTerminal} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
