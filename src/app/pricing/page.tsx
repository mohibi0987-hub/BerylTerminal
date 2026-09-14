"use client";
import { useState } from "react";
import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

type Tier = {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  theme: { accent: string; bg: string };
  features: string[];
};

// Feature set per tier is additive — each includes everything in the one
// before it, same convention as TradingView's own comparison table.
// A TradingView-style numeric comparison table — same dimensions as their
// own plan comparison (Charts per tab, Indicators per chart, Historical
// bars), with "Parallel chart connections" adapted into something that
// actually means something for a multi-broker terminal: how many broker
// connections you can hold at once. Numbers for Pro/Elite/RedBeryl mirror
// TradingView's own Essential/Premium/Ultimate tiers directly from their
// pricing screens; Advanced's historical-bars figure matches their Plus
// tier's real number too — the rest are reasonable interpolations for a
// dimension TradingView didn't fully show at that tier.
const COMPARISON = [
  { label: "Charts per tab", free: "1", pro: "2", advanced: "4", elite: "8", redberyl: "16" },
  { label: "Indicators per chart", free: "2", pro: "5", advanced: "10", elite: "25", redberyl: "50" },
  { label: "Historical bars", free: "5K", pro: "10K", advanced: "10K", elite: "20K", redberyl: "40K" },
  { label: "Connected brokers at once", free: "1", pro: "2", advanced: "4", elite: "7", redberyl: "7" },
  { label: "Price alerts", free: "3", pro: "10", advanced: "50", elite: "250", redberyl: "1000" },
];

const TIERS: Tier[] = [
  {
    id: "pro",
    name: "Pro",
    monthly: 12,
    annual: 119,
    theme: { accent: "#2DD4A7", bg: "radial-gradient(60% 50% at 50% 0%, rgba(45,212,167,.16), transparent 70%)" },
    features: [
      "SMA, EMA, Bollinger, VWAP, RSI, MACD live on chart",
      "Watchlists with live quotes across all connected brokers",
      "Priority order routing",
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    monthly: 29,
    annual: 289,
    theme: { accent: "#5B8DEF", bg: "radial-gradient(60% 50% at 50% 0%, rgba(91,141,239,.18), transparent 70%)" },
    features: [
      "Everything in Pro",
      "Full stock screener across the market",
      "Options chain — calls and puts across strikes and expirations",
      "Pre/post-market extended-hours data",
    ],
  },
  {
    id: "elite",
    name: "Elite / Scale",
    monthly: 49,
    annual: 489,
    theme: { accent: "#A78BFA", bg: "radial-gradient(60% 50% at 50% 0%, rgba(167,139,250,.18), transparent 70%)" },
    features: [
      "Everything in Advanced",
      "Financials, analyst ratings, and sector heatmap",
      "Algo builder with backtesting",
      "Multiple simultaneous chart layouts",
    ],
  },
  {
    id: "redberyl",
    name: "RedBeryl",
    monthly: 199,
    annual: 1990,
    theme: { accent: "#FF5C7A", bg: "radial-gradient(65% 55% at 50% 0%, rgba(255,92,122,.28), transparent 70%), radial-gradient(80% 80% at 50% 100%, rgba(120,10,30,.35), transparent 60%)" },
    features: [
      "Everything in Elite / Scale",
      "Unlimited parallel chart connections",
      "Direct line priority support",
      "Earliest access to new brokers and features",
    ],
  },
];

export default function PricingPage() {
  const [activeId, setActiveId] = useState("pro");
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = TIERS.find((t) => t.id === activeId)!;

  async function upgrade() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: active.id.toUpperCase() }),
      });
      let data: any = null;
      try { data = await res.json(); } catch { /* non-JSON error body */ }
      if (!res.ok || !data?.url) {
        if (res.status === 401) { window.location.href = "/login"; return; }
        setError(data?.error ?? `Couldn't start checkout (${res.status}).`);
        return;
      }
      window.location.href = data.url; // real Stripe Checkout
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="site">
      <SiteNav />
      <section
        style={{
          padding: "72px 0 90px",
          textAlign: "center",
          background: active.theme.bg,
          transition: "background 0.35s ease",
        }}
      >
        <div className="container">
          <h1 className="disp" style={{ fontSize: "clamp(28px, 4.5vw, 44px)", marginBottom: 10 }}>Trade with the full terminal</h1>
          <p style={{ color: "var(--muted)", maxWidth: 560, margin: "0 auto 36px", fontSize: 15, lineHeight: 1.6 }}>
            Live indicators, options chain, screener, and algo tools — synced with your TradeBeryl journal so every
            trade you place here is ready to analyze there.
          </p>

          {/* Tier tabs — clicking one re-themes the whole section background,
              same interaction TradingView uses on its own paywall. */}
          <div style={{ display: "inline-flex", gap: 4, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveId(t.id)}
                style={{
                  padding: "10px 18px", borderRadius: 8, border: "none", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  background: activeId === t.id ? t.theme.accent : "transparent",
                  color: activeId === t.id ? (t.id === "redberyl" ? "#fff" : "#04150F") : "var(--muted)",
                  transition: "background 0.2s ease",
                }}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ background: "var(--panel)", border: `1px solid ${active.theme.accent}55`, borderRadius: 16, padding: 32, textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
                <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>
                  BerylTerminal <span style={{ color: active.theme.accent }}>{active.name}</span>
                </div>
                <div style={{ display: "flex", gap: 4, background: "var(--panel2)", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
                  <button onClick={() => setBilling("monthly")} style={{ padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: billing === "monthly" ? "var(--border)" : "transparent", color: "var(--text)" }}>Monthly</button>
                  <button onClick={() => setBilling("annual")} style={{ padding: "5px 10px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", background: billing === "annual" ? "var(--border)" : "transparent", color: "var(--text)" }}>Annually</button>
                </div>
              </div>

              <div style={{ margin: "18px 0 24px" }}>
                <span className="mono" style={{ fontSize: 40, fontWeight: 700 }}>
                  ${billing === "monthly" ? active.monthly : Math.round(active.annual / 12)}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 14 }}>/mo</span>
                {billing === "annual" && (
                  <div style={{ fontSize: 12, color: active.theme.accent, marginTop: 4 }}>
                    ${active.annual}/year — save ${active.monthly * 12 - active.annual}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
                {active.features.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 10, fontSize: 13.5, color: "var(--muted)" }}>
                    <span style={{ color: active.theme.accent, fontWeight: 700 }}>✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={upgrade}
                disabled={busy}
                style={{
                  width: "100%", padding: 14, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  background: active.theme.accent, color: active.id === "redberyl" ? "#fff" : "#04150F",
                }}
              >
                {busy ? "Starting checkout…" : `Upgrade to ${active.name}`}
              </button>
              {error && <div style={{ fontSize: 12, color: "var(--red)", textAlign: "center", marginTop: 10 }}>{error}</div>}
              {billing === "annual" && (
                <div style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", marginTop: 12 }}>
                  Checkout currently bills monthly regardless of this toggle — annual pricing isn't wired to a separate Stripe price yet.
                </div>
              )}
            </div>
          </div>

          {/* Numeric comparison table, same dimensions as TradingView's own
              plan comparison. Note: these are the planned limits per plan —
              actual usage gating (blocking a 6th indicator on Free, etc.)
              isn't built into the app yet, only the billing/plan tracking is. */}
          <div style={{ maxWidth: 760, margin: "40px auto 0", textAlign: "left", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: "var(--faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em" }}>Feature</th>
                  <th style={{ padding: "10px 12px", color: "var(--faint)", fontSize: 11, textTransform: "uppercase" }}>Free</th>
                  {TIERS.map((t) => (
                    <th key={t.id} style={{ padding: "10px 12px", color: activeId === t.id ? t.theme.accent : "var(--muted)", fontWeight: 700 }}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                    <td style={{ padding: "10px 12px", color: "var(--muted)" }}>{row.label}</td>
                    <td className="mono" style={{ padding: "10px 12px", textAlign: "center", color: "var(--faint)" }}>{row.free}</td>
                    <td className="mono" style={{ padding: "10px 12px", textAlign: "center" }}>{row.pro}</td>
                    <td className="mono" style={{ padding: "10px 12px", textAlign: "center" }}>{row.advanced}</td>
                    <td className="mono" style={{ padding: "10px 12px", textAlign: "center" }}>{row.elite}</td>
                    <td className="mono" style={{ padding: "10px 12px", textAlign: "center" }}>{row.redberyl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 14, textAlign: "center" }}>
              Billing and plan tracking are fully real (Stripe) — usage caps shown here aren't enforced in the app yet.
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
