"use client";
import { useState } from "react";

export function OrderTicket({ symbol, broker, mode }: { symbol: string; broker: string; mode: "PAPER" | "LIVE" }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState(10);
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        broker, mode, symbol, side, type, quantity: qty,
        timeInForce: "DAY",
        limitPrice: type === "LIMIT" ? Number(limitPrice) : undefined,
      }),
    });
    const json = await res.json();
    setBusy(false);
    setResult(json.status === "REJECTED" ? `Rejected: ${json.reason}` : `${json.status ?? "Submitted"} — order ${json.order?.id ?? ""}`);
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
        <label style={{ fontSize: 11, color: "var(--muted)" }}>Quantity</label>
        <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} style={{ width: "100%" }} />
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
