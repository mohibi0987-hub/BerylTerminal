"use client";
import { useEffect, useState } from "react";
import { useClerk } from "@clerk/nextjs";
import { Chart } from "@/components/Chart";
import { OrderTicket } from "@/components/OrderTicket";
import { BrokerConnectModal, type Broker } from "@/components/BrokerConnectModal";

export default function Home() {
  const { signOut } = useClerk();
  const [symbol, setSymbol] = useState("AAPL");
  const [showConnect, setShowConnect] = useState(false);
  const [broker, setBroker] = useState<Broker>("ALPACA");
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [account, setAccount] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [accountError, setAccountError] = useState<string | null>(null);

  async function refreshAccount(b: Broker = broker, m: "PAPER" | "LIVE" = mode) {
    const res = await fetch(`/api/account?broker=${b}&mode=${m}`);
    let json: any = null;
    try { json = await res.json(); } catch { /* non-JSON error body */ }
    if (!res.ok) { setAccountError(json?.error ?? `Request failed (${res.status})`); setAccount(null); setPositions([]); return; }
    setAccountError(null);
    setAccount(json.account);
    // getPositions() has always worked in every broker adapter — this was
    // simply never read or displayed before, not a backend gap.
    setPositions(json.positions ?? []);
  }

  useEffect(() => { refreshAccount(); }, []);

  function handleConnected(newBroker: Broker, newMode: "PAPER" | "LIVE") {
    setBroker(newBroker);
    setMode(newMode);
    refreshAccount(newBroker, newMode);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ height: 54, display: "flex", alignItems: "center", gap: 16, padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
        <div className="disp" style={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green)", boxShadow: "0 0 12px rgba(45,212,167,.65)" }} />
          BerylTerminal
        </div>
        <input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} style={{ width: 100 }} />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {account ? (
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {broker} {mode === "PAPER" ? "Paper" : "Live"} · Equity ${account.equity.toLocaleString()} · Buying power ${account.buyingPower.toLocaleString()}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--faint)" }}>{accountError ? "No broker connected" : "Loading…"}</span>
          )}
          <button onClick={() => setShowConnect(true)} style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontWeight: 700, fontSize: 12 }}>
            Connect broker
          </button>
          <button onClick={() => signOut({ redirectUrl: "/login" })} style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chart symbol={symbol} />
          </div>
          <div style={{ borderTop: "1px solid var(--border)", padding: 14, maxHeight: 220, overflowY: "auto" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 10 }}>
              Positions {positions.length > 0 && `(${positions.length})`}
            </div>
            {positions.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "var(--faint)" }}>No open positions on this connection.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {positions.map((p: any) => (
                  <div key={p.symbol} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 10px", background: "var(--bg-soft)", borderRadius: 6, fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700, minWidth: 60 }}>{p.symbol}</span>
                    <span style={{ color: "var(--muted)" }}>{p.quantity} shares</span>
                    <span style={{ color: "var(--muted)" }}>Avg ${Number(p.avgPrice ?? 0).toFixed(2)}</span>
                    {p.marketValue != null && (
                      <span className="mono" style={{ marginLeft: "auto", color: "var(--muted)" }}>
                        Mkt value ${Number(p.marketValue).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div style={{ width: 300, borderLeft: "1px solid var(--border)", padding: 14, background: "var(--bg-soft)" }}>
          <OrderTicket symbol={symbol} broker={broker} mode={mode} />
        </div>
      </div>

      {showConnect && <BrokerConnectModal onClose={() => setShowConnect(false)} onConnected={handleConnected} />}
    </div>
  );
}
