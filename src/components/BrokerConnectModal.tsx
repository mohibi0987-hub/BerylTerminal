"use client";
import { useState } from "react";

type Broker = "ALPACA" | "WEBULL" | "IBKR";

const BROKERS: { id: Broker; name: string; blurb: string; ready: boolean }[] = [
  { id: "ALPACA", name: "Alpaca", blurb: "Paper trading connects instantly and free. Live trading requires identity verification (1-3 business days) since it's a real brokerage account.", ready: true },
  { id: "WEBULL", name: "Webull", blurb: "Requires an approved OpenAPI application (developer.webull.com) — typically a 1-2 business day review before you get real credentials.", ready: false },
  { id: "IBKR", name: "Interactive Brokers", blurb: "Requires a running Client Portal Gateway logged into your funded/paper IBKR account.", ready: false },
];

export function BrokerConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [selected, setSelected] = useState<Broker | null>(null);
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = { broker: selected, mode };
    if (selected === "ALPACA") { body.apiKeyId = fields.apiKeyId; body.apiSecretKey = fields.apiSecretKey; }
    if (selected === "WEBULL") { body.appKey = fields.appKey; body.appSecret = fields.appSecret; }
    if (selected === "IBKR") { body.gatewayUrl = fields.gatewayUrl; body.accountId = fields.accountId; }

    const res = await fetch("/api/broker/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) { setError(json.error ?? "Connection failed."); return; }
    onConnected();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,6,10,.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ width: 480, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 14 }}>Connect a broker</div>

        {!selected && BROKERS.map((b) => (
          <div key={b.id} onClick={() => setSelected(b.id)} style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 8, cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 13 }}>
              {b.name}
              {!b.ready && <span style={{ fontSize: 9, color: "var(--amber)", background: "rgba(245,166,35,.14)", padding: "2px 6px", borderRadius: 4 }}>NEEDS SETUP</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{b.blurb}</div>
          </div>
        ))}

        {selected && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button onClick={() => setMode("PAPER")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: mode === "PAPER" ? "var(--green-dim)" : "transparent", color: mode === "PAPER" ? "var(--green)" : "var(--text)" }}>Paper</button>
              <button onClick={() => setMode("LIVE")} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid var(--border)", background: mode === "LIVE" ? "var(--red-dim)" : "transparent", color: mode === "LIVE" ? "var(--red)" : "var(--text)" }}>Live (real money)</button>
            </div>

            {selected === "ALPACA" && (<>
              <input placeholder="API Key ID" style={{ width: "100%", marginBottom: 8 }} onChange={(e) => setFields({ ...fields, apiKeyId: e.target.value })} />
              <input placeholder="API Secret Key" type="password" style={{ width: "100%", marginBottom: 8 }} onChange={(e) => setFields({ ...fields, apiSecretKey: e.target.value })} />
            </>)}
            {selected === "WEBULL" && (<>
              <input placeholder="App Key" style={{ width: "100%", marginBottom: 8 }} onChange={(e) => setFields({ ...fields, appKey: e.target.value })} />
              <input placeholder="App Secret" type="password" style={{ width: "100%", marginBottom: 8 }} onChange={(e) => setFields({ ...fields, appSecret: e.target.value })} />
            </>)}
            {selected === "IBKR" && (<>
              <input placeholder="Gateway URL (e.g. https://localhost:5000/v1/api)" style={{ width: "100%", marginBottom: 8 }} onChange={(e) => setFields({ ...fields, gatewayUrl: e.target.value })} />
              <input placeholder="Account ID" style={{ width: "100%", marginBottom: 8 }} onChange={(e) => setFields({ ...fields, accountId: e.target.value })} />
            </>)}

            {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{error}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelected(null)} style={{ flex: 1, padding: 10, borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--text)" }}>Back</button>
              <button onClick={connect} disabled={busy} style={{ flex: 2, padding: 10, borderRadius: 6, border: "none", background: "var(--green)", color: "#04150F", fontWeight: 700 }}>{busy ? "Connecting…" : "Connect"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
