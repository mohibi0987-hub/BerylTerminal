"use client";
import { useEffect, useState, type MouseEvent } from "react";
import { useClerk } from "@clerk/nextjs";
import { Chart } from "@/components/Chart";
import { OrderTicket } from "@/components/OrderTicket";
import { BrokerConnectModal, type Broker } from "@/components/BrokerConnectModal";
import { Watchlist } from "@/components/Watchlist";
import { TwoFactorSetupModal } from "@/components/TwoFactorSetupModal";
import { TwoFactorVerifyGate } from "@/components/TwoFactorVerifyGate";

const STATUS_COLOR: Record<string, string> = {
  FILLED: "var(--green)",
  PARTIALLY_FILLED: "var(--amber, #f5a623)",
  REJECTED: "var(--red)",
  CANCELLED: "var(--muted)",
  SUBMITTED: "var(--blue, #5b8def)",
  BROKER_ACCEPTED: "var(--blue, #5b8def)",
  CREATED: "var(--muted)",
  RISK_VALIDATION: "var(--muted)",
};

const TRADEBERYL_URL = process.env.NEXT_PUBLIC_TRADEBERYL_URL ?? "https://tradeberyl.com";

export default function Terminal() {
  const { signOut } = useClerk();
  const [symbol, setSymbol] = useState("AAPL");
  const [openSymbols, setOpenSymbols] = useState<string[]>(["AAPL"]);
  const [showConnect, setShowConnect] = useState(false);
  const [broker, setBroker] = useState<Broker>("ALPACA");
  const [mode, setMode] = useState<"PAPER" | "LIVE">("PAPER");
  const [account, setAccount] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<"positions" | "orders">("positions");
  const [orders, setOrders] = useState<any[] | null>(null);
  const [twoFactorStatus, setTwoFactorStatus] = useState<{ twoFactorEnabled: boolean; needsVerification: boolean } | null>(null);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  useEffect(() => {
    fetch("/api/2fa/verify-session").then((res) => res.json()).then(setTwoFactorStatus).catch(() => setTwoFactorStatus({ twoFactorEnabled: false, needsVerification: false }));
  }, []);

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

  // The GET /api/orders route already existed and already worked — this
  // was purely a missing display, same story as positions above.
  async function refreshOrders() {
    const res = await fetch("/api/orders");
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data);
  }

  useEffect(() => { refreshAccount(); }, []);
  useEffect(() => { if (bottomTab === "orders" && orders === null) refreshOrders(); }, [bottomTab]);

  // Opens a symbol as a tab (TradingView-style) if it isn't already one,
  // then makes it active. Tabs are session-only, not persisted.
  function openSymbol(sym: string) {
    setOpenSymbols((tabs) => (tabs.includes(sym) ? tabs : [...tabs, sym]));
    setSymbol(sym);
  }

  function closeTab(sym: string, e: MouseEvent) {
    e.stopPropagation();
    setOpenSymbols((tabs) => {
      const next = tabs.filter((t) => t !== sym);
      if (next.length === 0) return [sym]; // never fully empty
      if (symbol === sym) setSymbol(next[next.length - 1]);
      return next;
    });
  }

  function handleConnected(newBroker: Broker, newMode: "PAPER" | "LIVE") {
    setBroker(newBroker);
    setMode(newMode);
    refreshAccount(newBroker, newMode);
  }

  function handleOrderPlaced() {
    // An order was just submitted from the ticket — refresh both views
    // so the new order/updated position shows up without a manual reload.
    refreshAccount();
    if (bottomTab === "orders") refreshOrders();
    setOrders(null);
  }

  function handleTwoFactorVerified() {
    setTwoFactorStatus((s) => (s ? { ...s, needsVerification: false } : s));
  }

  // Blocks the whole terminal, not just a banner — if this account has
  // 2FA enabled and this specific session hasn't passed it yet, nothing
  // else renders until it does.
  if (twoFactorStatus?.needsVerification) {
    return <TwoFactorVerifyGate onVerified={handleTwoFactorVerified} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ height: 54, display: "flex", alignItems: "center", gap: 16, padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
        <a href="/" className="disp" style={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green)", boxShadow: "0 0 12px rgba(45,212,167,.65)" }} />
          BerylTerminal
        </a>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && openSymbol(symbol)}
          style={{ width: 100 }}
        />
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          {account ? (
            <span className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
              {broker} {mode === "PAPER" ? "Paper" : "Live"} · Equity ${account.equity.toLocaleString()} · Buying power ${account.buyingPower.toLocaleString()}
            </span>
          ) : (
            <span style={{ fontSize: 12, color: "var(--faint)" }}>{accountError ? "No broker connected" : "Loading…"}</span>
          )}
          <button onClick={() => setShowTwoFactorSetup(true)} style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12 }}>
            {twoFactorStatus?.twoFactorEnabled ? "2FA enabled" : "Set up 2FA"}
          </button>
          <button onClick={() => setShowConnect(true)} style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--green-border)", background: "var(--green-dim)", color: "var(--green)", fontWeight: 700, fontSize: 12 }}>
            Connect broker
          </button>
          <a
            href={`${TRADEBERYL_URL}/account`}
            title="Manage your shared BerylTerminal / TradeBeryl account"
            style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12, textDecoration: "none" }}
          >
            Account
          </a>
          <button onClick={() => signOut({ redirectUrl: "/login" })} style={{ padding: "7px 13px", borderRadius: 20, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ height: 36, display: "flex", alignItems: "stretch", background: "var(--bg)", borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {openSymbols.map((sym) => (
          <div
            key={sym}
            onClick={() => setSymbol(sym)}
            className="mono"
            style={{
              display: "flex", alignItems: "center", gap: 8, padding: "0 14px", cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              color: sym === symbol ? "var(--text)" : "var(--muted)",
              background: sym === symbol ? "var(--bg-soft)" : "transparent",
              borderRight: "1px solid var(--border)",
              borderBottom: sym === symbol ? "2px solid var(--green)" : "2px solid transparent",
              whiteSpace: "nowrap",
            }}
          >
            {sym}
            {openSymbols.length > 1 && (
              <span onClick={(e) => closeTab(sym, e)} style={{ color: "var(--faint)", fontSize: 13 }}>×</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Chart symbol={symbol} />
          </div>
          <div style={{ borderTop: "1px solid var(--border)", padding: 14, maxHeight: 220, overflowY: "auto" }}>
            <div style={{ display: "flex", gap: 14, marginBottom: 10 }}>
              <button
                onClick={() => setBottomTab("positions")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", color: bottomTab === "positions" ? "var(--text)" : "var(--muted)", fontWeight: bottomTab === "positions" ? 700 : 400 }}
              >
                Positions {positions.length > 0 && `(${positions.length})`}
              </button>
              <button
                onClick={() => setBottomTab("orders")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em", color: bottomTab === "orders" ? "var(--text)" : "var(--muted)", fontWeight: bottomTab === "orders" ? 700 : 400 }}
              >
                Orders {orders && orders.length > 0 && `(${orders.length})`}
              </button>
            </div>

            {bottomTab === "positions" && (
              positions.length === 0 ? (
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
              )
            )}

            {bottomTab === "orders" && (
              orders === null ? (
                <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Loading…</div>
              ) : orders.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--faint)" }}>No orders placed yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {orders.map((o: any) => (
                    <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 10px", background: "var(--bg-soft)", borderRadius: 6, fontSize: 12.5 }}>
                      <span style={{ fontWeight: 700, minWidth: 60 }}>{o.instrument?.symbol}</span>
                      <span style={{ color: o.side === "BUY" ? "var(--green)" : "var(--red)", minWidth: 40 }}>{o.side}</span>
                      <span style={{ color: "var(--muted)" }}>{o.quantity} @ {o.type === "MARKET" ? "MKT" : `$${o.limitPrice}`}</span>
                      <span style={{ color: STATUS_COLOR[o.status] ?? "var(--muted)", fontSize: 11 }}>{o.status.replace(/_/g, " ")}</span>
                      {o.rejectReason && <span style={{ color: "var(--red)", fontSize: 11 }} title={o.rejectReason}>⚠</span>}
                      <span className="mono" style={{ marginLeft: "auto", color: "var(--faint)", fontSize: 11 }}>
                        {new Date(o.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
        <div style={{ width: 300, borderLeft: "1px solid var(--border)", padding: 14, background: "var(--bg-soft)", display: "flex", flexDirection: "column", gap: 18, overflowY: "auto" }}>
          <Watchlist onSelectSymbol={openSymbol} />
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <OrderTicket symbol={symbol} broker={broker} mode={mode} onOrderPlaced={handleOrderPlaced} />
          </div>
        </div>
      </div>

      {showConnect && <BrokerConnectModal onClose={() => setShowConnect(false)} onConnected={handleConnected} />}
      {showTwoFactorSetup && (
        <TwoFactorSetupModal
          onClose={() => setShowTwoFactorSetup(false)}
          onEnabled={() => {
            setShowTwoFactorSetup(false);
            setTwoFactorStatus((s) => (s ? { ...s, twoFactorEnabled: true } : s));
          }}
        />
      )}
    </div>
  );
}
