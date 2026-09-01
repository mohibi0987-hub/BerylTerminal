"use client";
import { useEffect, useState } from "react";
import { Chart } from "@/components/Chart";
import { OrderTicket } from "@/components/OrderTicket";
import { BrokerConnectModal } from "@/components/BrokerConnectModal";

export default function Home() {
  const [symbol, setSymbol] = useState("AAPL");
  const [showConnect, setShowConnect] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  async function refreshAccount() {
    const res = await fetch("/api/account?broker=ALPACA&mode=PAPER"); if (res.status === 401) { window.location.href = "/login"; return; }
    const json = await res.json();
    if (!res.ok) { setAccountError(json.error); setAccount(null); return; }
    setAccountError(null);
    setAccount(json);
  }

  useEffect(() => { refreshAccount(); }, []);

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
              Alpaca Paper · Equity ${account.account.equity.toLocaleString()} · Buying power ${account.account.buyingPower.toLocaleString()}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--faint)" }}>{accountError ? "No broker connected" : "Loading…"}</span>
          )}
          <button onClick={() => setShowConnect(true)} style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontWeight: 700, fontSize: 12 }}>
            Connect broker
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Chart symbol={symbol} />
        </div>
        <div style={{ width: 300, borderLeft: "1px solid var(--border)", padding: 14, background: "var(--bg-soft)" }}>
          <OrderTicket symbol={symbol} broker="ALPACA" mode="PAPER" />
        </div>
      </div>

      {showConnect && <BrokerConnectModal onClose={() => setShowConnect(false)} onConnected={refreshAccount} />}
    </div>
  );
}
