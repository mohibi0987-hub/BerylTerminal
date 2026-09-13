import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

const BROKERS = [
  { id: "ALPACA", name: "Alpaca" },
  { id: "KRAKEN", name: "Kraken" },
  { id: "COINBASE", name: "Coinbase" },
  { id: "TRADOVATE", name: "Tradovate" },
  { id: "WEBULL", name: "Webull" },
  { id: "IBKR", name: "Interactive Brokers" },
];

const FEATURES = [
  { icon: "⇄", title: "One terminal, six brokers", body: "Alpaca, Kraken, Coinbase, Tradovate, Webull, and Interactive Brokers — connect any of them and route real orders from the same screen, paper or live." },
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
              <span className="mono" style={{ marginLeft: 10, fontSize: 11.5, color: "var(--muted)" }}>AAPL · 1m · Alpaca Paper</span>
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
