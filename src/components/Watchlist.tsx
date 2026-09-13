"use client";
import { useEffect, useState } from "react";

export function Watchlist({ onSelectSymbol }: { onSelectSymbol: (symbol: string) => void }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);

  async function refresh() {
    const res = await fetch("/api/watchlist");
    if (!res.ok) { setItems([]); return; }
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => { refresh(); }, []);

  // One batched quote call for the whole list rather than one per
  // symbol — same reasoning as everywhere else quotes are fetched for
  // more than one symbol at a time.
  useEffect(() => {
    if (!items || items.length === 0) return;
    const symbols = items.map((i) => i.instrument.symbol).join(",");
    fetch(`/api/market-data/quote?symbol=${encodeURIComponent(symbols)}`)
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [data];
        setQuotes(Object.fromEntries(list.filter((q) => q?.symbol).map((q) => [q.symbol, q])));
      })
      .catch(() => {});
  }, [items]);

  async function handleAdd() {
    if (!input.trim()) return;
    setAdding(true);
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol: input.trim() }),
    });
    setAdding(false);
    if (res.ok) { setInput(""); refresh(); }
  }

  async function handleRemove(id: string) {
    setItems((list) => (list ?? []).filter((i) => i.id !== id));
    await fetch(`/api/watchlist?id=${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>
        Watchlist {items && items.length > 0 && `(${items.length})`}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add symbol"
          style={{ flex: 1, fontSize: 12 }}
        />
        <button onClick={handleAdd} disabled={adding} style={{ padding: "4px 10px", fontSize: 12, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)", cursor: "pointer" }}>
          Add
        </button>
      </div>

      {items === null ? (
        <div style={{ fontSize: 12, color: "var(--faint)" }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ fontSize: 12, color: "var(--faint)" }}>No symbols yet — add one above.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {items.map((item) => {
            const sym = item.instrument.symbol;
            const q = quotes[sym];
            return (
              <div
                key={item.id}
                onClick={() => onSelectSymbol(sym)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 6, cursor: "pointer", fontSize: 12.5 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-soft)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontWeight: 700, minWidth: 56 }}>{sym}</span>
                {q ? (
                  <>
                    <span className="mono">${Number(q.price ?? q.close ?? 0).toFixed(2)}</span>
                    <span className="mono" style={{ color: (q.percent_change ?? 0) >= 0 ? "var(--green)" : "var(--red)", marginLeft: "auto" }}>
                      {(q.percent_change ?? 0) >= 0 ? "+" : ""}{Number(q.percent_change ?? 0).toFixed(2)}%
                    </span>
                  </>
                ) : (
                  <span style={{ color: "var(--faint)", marginLeft: "auto" }}>—</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                  style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 14, padding: "0 2px" }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
