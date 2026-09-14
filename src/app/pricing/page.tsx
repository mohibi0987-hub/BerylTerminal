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
  const active = TIERS.find((t) => t.id === activeId)!;

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
                style={{
                  width: "100%", padding: 14, borderRadius: 8, border: "none", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  background: active.theme.accent, color: active.id === "redberyl" ? "#fff" : "#04150F",
                }}
              >
                Upgrade to {active.name}
              </button>
              <div style={{ fontSize: 11, color: "var(--faint)", textAlign: "center", marginTop: 12 }}>
                Checkout isn't wired up yet — this needs a real Stripe account connected before it can take a real card.
              </div>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
