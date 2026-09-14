"use client";
import { useEffect, useState } from "react";

type Alert = { id: string; symbol: string; condition: string; targetValue: number; isActive: boolean; triggeredAt: string | null };

// Checking happens client-side, on a poll, while this panel is mounted —
// there's no server-side cron or push notification behind this. An alert
// only actually fires while someone has the terminal open. That's a real
// limitation, not a "notify me even when I'm away" system, and the UI
// below says so rather than implying otherwise.
const CHECK_INTERVAL_MS = 15000;

export function AlertsPanel({ symbol }: { symbol: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [condition, setCondition] = useState<"price_above" | "price_below">("price_above");
  const [targetValue, setTargetValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (Array.isArray(data)) setAlerts(data);
    } catch { /* soft-fail — the panel just shows stale data until the next successful refresh */ }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const active = alerts.filter((a) => a.isActive);
    if (active.length === 0) return;
    const symbols = Array.from(new Set(active.map((a) => a.symbol)));

    async function check() {
      try {
        const res = await fetch(`/api/market-data/quote?symbol=${encodeURIComponent(symbols.join(","))}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : [data];
        const prices = Object.fromEntries(list.filter((q) => q?.symbol).map((q) => [q.symbol, q.price]));
        for (const a of active) {
          const price = prices[a.symbol];
          if (price == null) continue;
          const hit = a.condition === "price_above" ? price >= a.targetValue : price <= a.targetValue;
          if (hit) {
            await fetch("/api/alerts", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) });
            refresh();
          }
        }
      } catch { /* a missed check just gets retried on the next interval */ }
    }
    check();
    const poll = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(poll);
  }, [alerts]);

  async function addAlert() {
    if (!targetValue) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, condition, targetValue: Number(targetValue) }),
      });
      let data: any = null;
      try { data = await res.json(); } catch { /* non-JSON error body */ }
      if (!res.ok) { setError(data?.error ?? `Couldn't add alert (${res.status}).`); return; }
      setTargetValue("");
      refresh();
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeAlert(id: string) {
    await fetch(`/api/alerts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--faint)", marginBottom: 8 }}>
        Alerts — {symbol}
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
        <select value={condition} onChange={(e) => setCondition(e.target.value as "price_above" | "price_below")} style={{ fontSize: 11, padding: "5px 4px" }}>
          <option value="price_above">Above</option>
          <option value="price_below">Below</option>
        </select>
        <input type="number" step="0.01" placeholder="Price" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} style={{ flex: 1, fontSize: 11 }} />
        <button onClick={addAlert} disabled={busy || !targetValue} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
          Add
        </button>
      </div>
      {error && <div style={{ fontSize: 10.5, color: "var(--red)", marginBottom: 6 }}>{error}</div>}
      {alerts.length === 0 && <div style={{ fontSize: 11, color: "var(--faint)" }}>No alerts yet.</div>}
      {alerts.map((a) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", background: "var(--bg-soft)", borderRadius: 6, marginBottom: 4, fontSize: 11.5, opacity: a.isActive ? 1 : 0.55 }}>
          <span>
            <b>{a.symbol}</b> {a.condition === "price_above" ? "≥" : "≤"} ${a.targetValue}
            {!a.isActive && <span style={{ color: "var(--green)", marginLeft: 6 }}>Triggered</span>}
          </span>
          <span onClick={() => removeAlert(a.id)} style={{ color: "var(--faint)", cursor: "pointer", fontSize: 13 }}>×</span>
        </div>
      ))}
      <div style={{ fontSize: 10, color: "var(--faint)", marginTop: 6, lineHeight: 1.4 }}>
        Checked while this terminal is open — not a background/push notification.
      </div>
    </div>
  );
}
