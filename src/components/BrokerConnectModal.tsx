"use client";
import { useState } from "react";

type Broker = "ALPACA" | "WEBULL" | "IBKR" | "KRAKEN" | "COINBASE" | "TRADOVATE";

const BROKERS: { id: Broker; name: string; color: string; glyph: string; status: string; statusColor: string; blurb: string; fields: { key: string; label: string; type?: string; textarea?: boolean }[] }[] = [
  { id: "ALPACA", name: "Alpaca", color: "#2DD4A7", glyph: "A", status: "Paper ready", statusColor: "var(--green)", blurb: "Paper trading connects instantly and free. Live trading requires identity verification (1-3 business days).", fields: [{ key: "apiKeyId", label: "API Key ID" }, { key: "apiSecretKey", label: "API Secret Key", type: "password" }] },
  { id: "KRAKEN", name: "Kraken", color: "#5B4DFF", glyph: "K", status: "Key ready", statusColor: "var(--green)", blurb: "Generate an API key pair from Account → Security → API in your Kraken dashboard.", fields: [{ key: "apiKey", label: "API Key" }, { key: "apiSecret", label: "Private Key", type: "password" }] },
  { id: "COINBASE", name: "Coinbase Advanced", color: "#0052FF", glyph: "C", status: "Key ready", statusColor: "var(--green)", blurb: "Create a CDP API key at portal.cdp.coinbase.com. Ed25519 keys are recommended; ECDSA also works.", fields: [{ key: "apiKeyName", label: "API Key Name (organizations/.../apiKeys/...)" }, { key: "apiSecret", label: "Private Key", type: "password", textarea: true }] },
  { id: "TRADOVATE", name: "Tradovate", color: "#F5A623", glyph: "T", status: "Key ready", statusColor: "var(--green)", blurb: "Uses your Tradovate username/password plus an API app id (cid) and secret (sec) from Settings → API Access.", fields: [{ key: "username", label: "Username" }, { key: "password", label: "Password", type: "password" }, { key: "cid", label: "Client ID (cid)" }, { key: "sec", label: "Client Secret (sec)", type: "password" }] },
  { id: "WEBULL", name: "Webull", color: "#2563EB", glyph: "W", status: "Needs approval", statusColor: "var(--amber)", blurb: "Requires an approved OpenAPI application (developer.webull.com) — typically a 1-2 business day review.", fields: [{ key: "appKey", label: "App Key" }, { key: "appSecret", label: "App Secret", type: "password" }] },
  { id: "IBKR", name: "Interactive Brokers", color: "#B91C1C", glyph: "IB", status: "Needs gateway", statusColor: "var(--amber)", blurb: "Requires a running Client Portal Gateway logged into your funded/paper IBKR account.", fields: [{ key: "gatewayUrl", label: "Gateway URL" }, { key: "accountId", label: "Account ID" }] },
];

export function BrokerConnectModal({ onClose, onConnected }: { onClose: () => void; onConnected: () => void }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Broker | null>(null);
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [remember, setRemember] = useState(true);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = BROKERS.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));
  const activeBroker = BROKERS.find((b) => b.id === selected);

  async function connect() {
    if (!selected || !activeBroker) return;
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = { broker: selected, mode, remember };
    activeBroker.fields.forEach((f) => { body[f.key] = fields[f.key]; });

    const res = await fetch("/api/broker/connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON error body — fall through with json=null */ }
    setBusy(false);
    if (!res.ok) { setError(json?.error ?? `Connection failed (${res.status})`); return; }
    onConnected();
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(4,6,10,.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
      <div style={{ width: 780, maxWidth: "94vw", maxHeight: "86vh", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>

        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            {selected && (
              <span onClick={() => { setSelected(null); setError(null); }} style={{ fontSize: 11, color: "var(--muted)", cursor: "pointer" }}>&larr; All brokers</span>
            )}
            <div className="disp" style={{ fontWeight: 700, fontSize: 19, marginTop: selected ? 4 : 0 }}>
              {selected ? `Connect ${activeBroker?.name}` : "Trade with your broker"}
            </div>
            {!selected && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>Real accounts, real order routing — pick one to get started.</div>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!selected && (
              <input placeholder="Search brokers…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ width: 180, background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12.5 }} />
            )}
            <span onClick={onClose} style={{ cursor: "pointer", color: "var(--muted)", fontSize: 18, lineHeight: 1 }}>✕</span>
          </div>
        </div>

        <div style={{ padding: 22, overflowY: "auto" }}>
          {!selected && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 12 }}>
                {filtered.map((b) => (
                  <div key={b.id} onClick={() => setSelected(b.id)}
                    style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "18px 12px", textAlign: "center", cursor: "pointer", transition: "border-color .12s, transform .12s", background: "var(--bg-soft)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--green-border)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: b.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18 }}>{b.glyph}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                    <div style={{ fontSize: 10.5, fontWeight: 600, color: b.statusColor, marginTop: 4 }}>{b.status}</div>
                  </div>
                ))}
              </div>
              {filtered.length === 0 && <div style={{ textAlign: "center", color: "var(--faint)", fontSize: 12.5, padding: "30px 0" }}>No brokers match &quot;{query}&quot;.</div>}
              <div style={{ textAlign: "center", marginTop: 22, fontSize: 11.5, color: "var(--faint)" }}>More brokers and exchanges are on the way — this list grows as each one is wired up for real.</div>
            </>
          )}

          {selected && activeBroker && (
            <div style={{ maxWidth: 440, margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: activeBroker.color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{activeBroker.glyph}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>{activeBroker.blurb}</div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={() => setMode("PAPER")} style={{ flex: 1, padding: 9, borderRadius: 6, border: "1px solid var(--border)", background: mode === "PAPER" ? "var(--green-dim)" : "transparent", color: mode === "PAPER" ? "var(--green)" : "var(--text)", fontWeight: 600, cursor: "pointer" }}>Paper</button>
                <button onClick={() => setMode("LIVE")} style={{ flex: 1, padding: 9, borderRadius: 6, border: "1px solid var(--border)", background: mode === "LIVE" ? "var(--red-dim)" : "transparent", color: mode === "LIVE" ? "var(--red)" : "var(--text)", fontWeight: 600, cursor: "pointer" }}>Live (real money)</button>
              </div>

              {activeBroker.fields.map((f) => (
                f.textarea ? (
                  <textarea key={f.key} placeholder={f.label} rows={4} style={{ width: "100%", marginBottom: 8, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
                ) : (
                  <input key={f.key} placeholder={f.label} type={f.type ?? "text"} style={{ width: "100%", marginBottom: 8 }} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
                )
              ))}

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, color: "var(--muted)", margin: "10px 0 6px", cursor: "pointer" }}>
                <input type="checkbox" checked={!remember} onChange={(e) => setRemember(!e.target.checked)} style={{ width: "auto" }} />
                Don&apos;t remember me — forget these credentials when my session ends
              </label>

              {error && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 8 }}>{error}</div>}
              <button onClick={connect} disabled={busy} style={{ width: "100%", padding: 11, borderRadius: 6, border: "none", background: "var(--green)", color: "#04150F", fontWeight: 700, cursor: "pointer", marginTop: 4 }}>
                {busy ? "Connecting…" : `Connect ${activeBroker.name}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
