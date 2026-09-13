"use client";
import { useEffect, useState } from "react";

const PRESETS_KEY = "beryl.orderTicket.qtyPresets";
const DEFAULT_PRESETS = [10, 25, 50, 100];

export function OrderTicket({ symbol, broker, mode, onOrderPlaced }: { symbol: string; broker: string; mode: "PAPER" | "LIVE"; onOrderPlaced?: () => void }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState(10);
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Quick-size presets — the same pattern as Axiom/Padre's P1/P2/P3 quick-buy
  // buttons, adapted to share quantity instead of a notional SOL amount:
  // one click loads a preset size instead of retyping it every order.
  // Presets are a local UI convenience only (kept in localStorage) — they
  // never submit an order by themselves, unlike those platforms' "Instant
  // Trade" one-click execute, which isn't something to copy blindly for
  // orders that hit a real broker.
  const [presets, setPresets] = useState<number[]>(DEFAULT_PRESETS);
  const [editingPresets, setEditingPresets] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PRESETS_KEY);
      if (saved) setPresets(JSON.parse(saved));
    } catch { /* localStorage unavailable or bad JSON — fall back to defaults */ }
  }, []);

  function updatePreset(index: number, value: number) {
    const next = presets.map((p, i) => (i === index ? value : p));
    setPresets(next);
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker, mode, symbol, side, type, quantity: qty,
          timeInForce: "DAY",
          limitPrice: type === "LIMIT" ? Number(limitPrice) : undefined,
        }),
      });
      let json: any = null;
      try { json = await res.json(); } catch { /* non-JSON error body — server-side crash, not our route's own error */ }
      if (!res.ok || !json) { setResult(`Request failed (${res.status}). Try again in a moment.`); return; }
      setResult(json.status === "REJECTED" ? `Rejected: ${json.reason}` : `${json.status ?? "Submitted"} — order ${json.order?.id ?? ""}`);
      if (json.status !== "REJECTED") onOrderPlaced?.();
    } catch {
      setResult("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 14, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        <button onClick={() => setSide("BUY")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: side === "BUY" ? "var(--green-dim)" : "transparent", color: side === "BUY" ? "var(--green)" : "var(--text)", fontWeight: 700 }}>Buy</button>
        <button onClick={() => setSide("SELL")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: side === "SELL" ? "var(--red-dim)" : "transparent", color: side === "SELL" ? "var(--red)" : "var(--text)", fontWeight: 700 }}>Sell</button>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 12 }}>
        <span onClick={() => setType("MARKET")} style={{ cursor: "pointer", color: type === "MARKET" ? "var(--text)" : "var(--muted)", borderBottom: type === "MARKET" ? "2px solid var(--green)" : "none" }}>Market</span>
        <span onClick={() => setType("LIMIT")} style={{ cursor: "pointer", color: type === "LIMIT" ? "var(--text)" : "var(--muted)", borderBottom: type === "LIMIT" ? "2px solid var(--green)" : "none" }}>Limit</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ fontSize: 11, color: "var(--muted)" }}>Quantity</label>
          <span onClick={() => setEditingPresets((v) => !v)} style={{ fontSize: 10.5, color: "var(--faint)", cursor: "pointer" }}>
            {editingPresets ? "Done" : "Edit presets"}
          </span>
        </div>
        <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: "100%", marginBottom: 6 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {presets.map((p, i) =>
            editingPresets ? (
              <input
                key={i}
                type="number"
                value={p}
                onChange={(e) => updatePreset(i, Number(e.target.value))}
                style={{ flex: 1, padding: "4px 2px", fontSize: 11, textAlign: "center" }}
              />
            ) : (
              <button
                key={i}
                onClick={() => setQty(p)}
                style={{ flex: 1, padding: "5px 0", fontSize: 11, borderRadius: 6, border: "1px solid var(--border)", background: qty === p ? "var(--panel2)" : "transparent", color: qty === p ? "var(--text)" : "var(--muted)", cursor: "pointer" }}
              >
                {p}
              </button>
            )
          )}
        </div>
      </div>
      {type === "LIMIT" && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: "var(--muted)" }}>Limit price</label>
          <input type="number" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: "100%" }} />
        </div>
      )}
      <button onClick={submit} disabled={busy} style={{ width: "100%", padding: 11, borderRadius: 6, border: "none", fontWeight: 700, background: side === "BUY" ? "var(--green)" : "var(--red)", color: side === "BUY" ? "#04150F" : "#2A0410" }}>
        {busy ? "Submitting…" : `${side === "BUY" ? "Buy" : "Sell"} ${qty} ${symbol}`}
      </button>
      {result && <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--muted)" }}>{result}</div>}
    </div>
  );
}
