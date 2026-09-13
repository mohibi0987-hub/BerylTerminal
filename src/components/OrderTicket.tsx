"use client";
import { useEffect, useState } from "react";

const PRESETS_KEY = "beryl.orderTicket.qtyPresets";
const INSTANT_KEY = "beryl.orderTicket.instantTrade";
const DEFAULT_PRESETS = [10, 25, 50, 100];

export function OrderTicket({ symbol, broker, mode, onOrderPlaced }: { symbol: string; broker: string; mode: "PAPER" | "LIVE"; onOrderPlaced?: () => void }) {
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [qty, setQty] = useState(10);
  const [type, setType] = useState<"MARKET" | "LIMIT">("MARKET");
  const [limitPrice, setLimitPrice] = useState<number | "">("");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Quick-size presets — the same pattern as Axiom/Padre's P1/P2/P3 quick-buy
  // buttons, adapted to share quantity instead of a notional SOL amount.
  const [presets, setPresets] = useState<number[]>(DEFAULT_PRESETS);
  const [editingPresets, setEditingPresets] = useState(false);

  // "Instant Trade" — the Axiom/Padre one-click-execute pattern, built as an
  // explicit, OFF-by-default opt-in (persisted locally, not per-order). This
  // is real money hitting a real broker, so unlike a memecoin swap this
  // stays opt-in with a visible on/off state at all times, the same way
  // real brokerage platforms gate their own one-click trading features.
  const [instantTrade, setInstantTrade] = useState(false);

  useEffect(() => {
    try {
      const savedPresets = localStorage.getItem(PRESETS_KEY);
      if (savedPresets) setPresets(JSON.parse(savedPresets));
      setInstantTrade(localStorage.getItem(INSTANT_KEY) === "true");
    } catch { /* localStorage unavailable or bad JSON — fall back to defaults */ }
  }, []);

  function updatePreset(index: number, value: number) {
    const next = presets.map((p, i) => (i === index ? value : p));
    setPresets(next);
    try { localStorage.setItem(PRESETS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function toggleInstantTrade() {
    const next = !instantTrade;
    setInstantTrade(next);
    try { localStorage.setItem(INSTANT_KEY, String(next)); } catch { /* ignore */ }
  }

  async function submit(overrideQty?: number) {
    const submittedQty = overrideQty ?? qty;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker, mode, symbol, side, type, quantity: submittedQty,
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

  function clickPreset(p: number) {
    setQty(p);
    if (instantTrade && type === "MARKET") submit(p); // instant mode only fires for market orders — a limit order still needs a price
  }

  return (
    <div style={{ padding: 14, background: "var(--bg-soft)", border: "1px solid var(--border)", borderRadius: 10 }}>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        <button onClick={() => setSide("BUY")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: side === "BUY" ? "var(--green-dim)" : "transparent", color: side === "BUY" ? "var(--green)" : "var(--text)", fontWeight: 700 }}>Buy</button>
        <button onClick={() => setSide("SELL")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: side === "SELL" ? "var(--red-dim)" : "transparent", color: side === "SELL" ? "var(--red)" : "var(--text)", fontWeight: 700 }}>Sell</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <span onClick={() => setType("MARKET")} style={{ cursor: "pointer", color: type === "MARKET" ? "var(--text)" : "var(--muted)", borderBottom: type === "MARKET" ? "2px solid var(--green)" : "none" }}>Market</span>
          <span onClick={() => setType("LIMIT")} style={{ cursor: "pointer", color: type === "LIMIT" ? "var(--text)" : "var(--muted)", borderBottom: type === "LIMIT" ? "2px solid var(--green)" : "none" }}>Limit</span>
        </div>
        <div onClick={toggleInstantTrade} title="When on, clicking a quantity preset submits a market order immediately — no confirm step" style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: instantTrade ? "var(--red)" : "var(--faint)" }}>Instant</span>
          <span style={{ width: 26, height: 14, borderRadius: 8, background: instantTrade ? "var(--red-dim)" : "var(--panel2)", border: `1px solid ${instantTrade ? "var(--red)" : "var(--border)"}`, position: "relative" }}>
            <span style={{ position: "absolute", top: 1, left: instantTrade ? 13 : 1, width: 10, height: 10, borderRadius: "50%", background: instantTrade ? "var(--red)" : "var(--faint)", transition: "left .12s" }} />
          </span>
        </div>
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
                onClick={() => clickPreset(p)}
                disabled={busy}
                title={instantTrade && type === "MARKET" ? `Instantly ${side === "BUY" ? "buy" : "sell"} ${p} ${symbol}` : undefined}
                style={{
                  flex: 1, padding: "5px 0", fontSize: 11, borderRadius: 6, cursor: "pointer",
                  border: `1px solid ${instantTrade && type === "MARKET" ? "var(--red)" : "var(--border)"}`,
                  background: qty === p ? "var(--panel2)" : "transparent",
                  color: qty === p ? "var(--text)" : "var(--muted)",
                }}
              >
                {p}
              </button>
            )
          )}
        </div>
        {instantTrade && type === "MARKET" && (
          <div style={{ fontSize: 10.5, color: "var(--red)", marginTop: 5 }}>
            Instant Trade is on — clicking a preset above submits a real {side.toLowerCase()} order immediately.
          </div>
        )}
      </div>
      {type === "LIMIT" && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: "var(--muted)" }}>Limit price</label>
          <input type="number" step="0.01" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value === "" ? "" : Number(e.target.value))} style={{ width: "100%" }} />
        </div>
      )}
      <button onClick={() => submit()} disabled={busy} style={{ width: "100%", padding: 11, borderRadius: 6, border: "none", fontWeight: 700, background: side === "BUY" ? "var(--green)" : "var(--red)", color: side === "BUY" ? "#04150F" : "#2A0410" }}>
        {busy ? "Submitting…" : `${side === "BUY" ? "Buy" : "Sell"} ${qty} ${symbol}`}
      </button>
      {result && <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--muted)" }}>{result}</div>}
    </div>
  );
}
