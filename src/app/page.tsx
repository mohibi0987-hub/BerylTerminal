import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

const BROKERS = [
  { id: "ALPACA", name: "Alpaca" },
  { id: "KRAKEN", name: "Kraken" },
  { id: "COINBASE", name: "Coinbase" },
  { id: "TRADOVATE", name: "Tradovate" },
  { id: "WEBULL", name: "Webull" },
  { id: "IBKR", name: "Interactive Brokers" },
  { id: "BINANCE_US", name: "Binance.US" },
  { id: "GEMINI", name: "Gemini" },
  { id: "TASTYTRADE", name: "Tastytrade" },
];

const FEATURES = [
  { icon: "⇄", title: "One terminal, nine brokers", body: "Alpaca, Kraken, Coinbase, Tradovate, Webull, Binance.US, Gemini, Tastytrade, and Interactive Brokers — connect any of them and route real orders from the same screen, paper or live." },
  { icon: "◱", title: "Real-time charting", body: "Candlestick charts with live-polling bars, multi-symbol tabs, and a clean dark layout built for reading price fast, not for clutter." },
  { icon: "☰", title: "Watchlists that follow you", body: "Add symbols once, see live quotes and % change update automatically, and jump straight into the chart with a click." },
  { icon: "⛨", title: "A real risk engine", body: "Every order passes through server-side risk validation before it reaches your broker, with rejections logged — not just a UI warning you can click past." },
  { icon: "◉", title: "Encrypted broker credentials", body: "Broker API keys are encrypted at rest and scoped to your account only — nothing is stored in plain text, and you can disconnect or forget them at any time." },
  { icon: "≡", title: "One account, two apps", body: "The same sign-in works here and in TradeBeryl, your trading journal — manage billing and profile in one place, trade in the other." },
];

export default function HomePage() {
  return (
    <div className="site">
      <SiteNav />

      <section className="hero">
        <div className="container">
          <h1>One terminal.<br />Every broker, every market.</h1>
          <p className="lede">
            BerylTerminal connects to the brokers you already use — stocks, crypto, and futures — so you can chart,
            watchlist, and execute from a single screen instead of six different tabs.
          </p>
          <div className="cta-row">
            <a href="/login" className="btn btn-primary">Launch Terminal</a>
            <a href="#brokers" className="btn btn-ghost">See supported brokers</a>
          </div>

          <div className="mock" aria-hidden="true">
            <div className="mock-bar">
              <span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" />
              <span className="mono" style={{ marginLeft: 10, fontSize: 11.5, color: "var(--muted)" }}>AAPL · 1m</span>
            </div>
            <div className="mock-body">
              <div className="mock-chart">
                <div className="mock-candles">
                  {[62, 74, 58, 80, 66, 90, 84, 70, 96, 78, 88, 60, 72, 94, 82, 68, 100, 76, 86, 64].map((h, i) => (
                    <i key={i} className={i % 3 === 0 ? "dn" : ""} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
              <div className="mock-side">
                <div style={{ fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 2 }}>Watchlist</div>
                <div className="mock-row hi"><span><b>AAPL</b></span><span style={{ color: "var(--green)" }}>+1.42%</span></div>
                <div className="mock-row"><span><b>MSFT</b></span><span style={{ color: "var(--green)" }}>+0.63%</span></div>
                <div className="mock-row"><span><b>NVDA</b></span><span style={{ color: "var(--red)" }}>-0.88%</span></div>
                <div className="mock-row"><span><b>BTC/USD</b></span><span style={{ color: "var(--green)" }}>+2.11%</span></div>
                <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--faint)", textTransform: "uppercase", letterSpacing: ".04em" }}>Order ticket</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <div style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 6, background: "var(--green-dim)", color: "var(--green)", fontSize: 11, fontWeight: 700 }}>Buy</div>
                  <div style={{ flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 6, border: "1px solid var(--border)", color: "var(--muted)", fontSize: 11, fontWeight: 700 }}>Sell</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Illustrative "market summary" cards, same layout pattern as
          TradingView's own dashboard — deliberately static/CSS-drawn like
          the hero mock above rather than wired to live data. This page is
          public and unauthenticated, and live quotes here would mean every
          anonymous visitor (and every crawler) burning real Twelve Data
          credits — the same quota that's already been exhausted once this
          session from far lighter, authenticated use. */}
      <div className="section" style={{ paddingBottom: 0 }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {[
              { label: "AAPL", price: "$254.32", change: "+0.85%", up: true, path: "M0,30 L15,22 30,26 45,14 60,18 75,8 90,12" },
              { label: "BTC/USD", price: "$77,644", change: "+1.09%", up: true, path: "M0,28 L15,24 30,26 45,16 60,20 75,10 90,6" },
              { label: "DXY", price: "99.58", change: "-0.36%", up: false, path: "M0,10 L15,14 30,12 45,20 60,18 75,26 90,24" },
              { label: "NQ", price: "22,410", change: "+0.42%", up: true, path: "M0,24 L15,20 30,22 45,12 60,16 75,10 90,8" },
            ].map((card) => (
              <div key={card.label} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>{card.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
                  <span className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{card.price}</span>
                  <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: card.up ? "var(--green)" : "var(--red)" }}>{card.change}</span>
                </div>
                <svg viewBox="0 0 90 34" style={{ width: "100%", height: 34 }} preserveAspectRatio="none">
                  <path d={card.path} fill="none" stroke={card.up ? "var(--green)" : "var(--red)"} strokeWidth="2" />
                </svg>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 11.5, color: "var(--faint)" }}>
            Illustrative — sign in for live quotes across your own watchlist and every connected broker.
          </div>
        </div>
      </div>

      <div className="trust-strip" id="brokers">
        <div className="container">
          {BROKERS.map((b) => <span key={b.id}>{b.name}</span>)}
        </div>
      </div>

      <section className="section" id="features">
        <div className="container">
          <h2>Built like a real trading desk</h2>
          <p className="sub">Not a demo. Every feature below talks to a real broker connection or a real risk check on the backend.</p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="pricing" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2>Start on paper. Go live when you're ready.</h2>
          <p className="sub">Paper trading is free on every supported broker. Connect a live account whenever you want to trade for real.</p>
          <div style={{ textAlign: "center" }}>
            <a href="/pricing" className="btn btn-ghost">See full plans &amp; pricing →</a>
          </div>
        </div>
      </section>

      <div className="cta-band">
        <div className="container">
          <h2>Your terminal is one sign-in away.</h2>
          <p>Free to start, no card required for paper trading.</p>
          <a href="/login" className="btn btn-primary">Launch Terminal</a>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
