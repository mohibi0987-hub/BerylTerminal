"use client";
import { useEffect, useState } from "react";

const BROKER_LABELS: Record<string, string> = {
  ALPACA: "Alpaca",
  KRAKEN: "Kraken",
  COINBASE: "Coinbase Advanced",
  TRADOVATE: "Tradovate",
  WEBULL: "Webull",
  IBKR: "Interactive Brokers",
  BINANCE_US: "Binance.US",
};

type Connection = {
  id: string;
  broker: string;
  mode: "PAPER" | "LIVE";
  status: string;
  externalAccountId: string | null;
  lastConnectedAt: string | null;
  lastError: string | null;
  createdAt: string;
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"general" | "brokers">("general");
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== "brokers") return;
    fetch("/api/broker/connections")
      .then(async (res) => {
        let data: any = null;
        try { data = await res.json(); } catch { /* non-JSON error body */ }
        if (!res.ok) throw new Error(data?.error ?? `Couldn't load connections (${res.status}).`);
        setConnections(data);
      })
      .catch((err) => setError(err.message));
  }, [tab]);

  async function disconnect(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/broker/connections?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      let data: any = null;
      try { data = await res.json(); } catch { /* non-JSON error body */ }
      if (!res.ok) throw new Error(data?.error ?? `Couldn't disconnect (${res.status}).`);
      setConnections((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    } catch (err: any) {
      setError(err.message ?? "Couldn't disconnect. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0A0E17", color: "var(--text)" }}>
      <div style={{ height: 54, display: "flex", alignItems: "center", gap: 16, padding: "0 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-soft)" }}>
        <a href="/terminal" className="disp" style={{ fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "var(--text)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--green)", boxShadow: "0 0 12px rgba(45,212,167,.65)" }} />
          BerylTerminal
        </a>
        <span style={{ color: "var(--faint)" }}>/</span>
        <span style={{ color: "var(--muted)" }}>Settings</span>
        <a href="/terminal" style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--muted)", textDecoration: "none" }}>← Back to terminal</a>
      </div>

      <div style={{ display: "flex", maxWidth: 900, margin: "0 auto", minHeight: "calc(100vh - 54px)" }}>
        <div style={{ width: 200, borderRight: "1px solid var(--border)", padding: "28px 12px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--faint)", padding: "0 10px", marginBottom: 8 }}>Settings</div>
          {[
            { key: "general" as const, label: "General" },
            { key: "brokers" as const, label: "Connected Brokers" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "9px 10px", borderRadius: 7, border: "none", fontSize: 13.5, cursor: "pointer", marginBottom: 2,
                background: tab === t.key ? "var(--panel2)" : "transparent",
                color: tab === t.key ? "var(--text)" : "var(--muted)",
              }}
            >
              {t.label}
            </button>
          ))}
          <div style={{ fontSize: 11, color: "var(--faint)", padding: "16px 10px 0", lineHeight: 1.5 }}>
            Profile, email, and password are managed from the account menu (avatar → Manage account) — this page is for app-level settings only.
          </div>
        </div>

        <div style={{ flex: 1, padding: "28px 32px", maxWidth: 620 }}>
          {tab === "general" && (
            <div>
              <h1 className="disp" style={{ fontSize: 20, marginBottom: 6 }}>General</h1>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 20 }}>
                This section is being carried over from earlier BerylTerminal builds — it isn't fully populated yet.
              </p>
              <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 20, fontSize: 13, color: "var(--faint)", lineHeight: 1.6 }}>
                Nothing configured here yet.
              </div>
            </div>
          )}

          {tab === "brokers" && (
            <div>
              <h1 className="disp" style={{ fontSize: 20, marginBottom: 6 }}>Connected Brokers</h1>
              <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 20 }}>
                Every broker connection on this account, across both paper and live. Disconnecting removes the
                stored, encrypted credentials — you'll need to reconnect from the terminal to trade with it again.
              </p>
              {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 14 }}>{error}</div>}
              {connections === null && !error && <div style={{ fontSize: 13, color: "var(--faint)" }}>Loading…</div>}
              {connections?.length === 0 && <div style={{ fontSize: 13, color: "var(--faint)" }}>No brokers connected yet.</div>}
              {connections?.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                      {BROKER_LABELS[c.broker] ?? c.broker} <span style={{ fontWeight: 400, color: "var(--muted)" }}>· {c.mode === "PAPER" ? "Paper" : "Live"}</span>
                    </div>
                    <div style={{ fontSize: 11.5, color: c.status === "CONNECTED" ? "var(--green)" : c.status === "ERROR" ? "var(--red)" : "var(--faint)" }}>
                      {c.status}{c.lastError ? ` — ${c.lastError}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => disconnect(c.id)}
                    disabled={busyId === c.id}
                    style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer" }}
                  >
                    {busyId === c.id ? "Disconnecting…" : "Disconnect"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
