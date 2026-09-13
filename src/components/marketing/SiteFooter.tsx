const TRADEBERYL_URL = process.env.NEXT_PUBLIC_TRADEBERYL_URL ?? "https://tradeberyl.com";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="col" style={{ maxWidth: 260 }}>
          <div className="disp" style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: "var(--green)" }} />
            BerylTerminal
          </div>
          <p style={{ fontSize: 12.5, color: "var(--faint)", lineHeight: 1.6 }}>
            One terminal for every broker. Paper and live execution, real-time charts, and a full risk &amp; audit log.
          </p>
        </div>
        <div className="col">
          <h4>Product</h4>
          <a href="/#features">Features</a>
          <a href="/#brokers">Supported brokers</a>
          <a href="/#pricing">Pricing</a>
          <a href="/login">Launch terminal</a>
        </div>
        <div className="col">
          <h4>Account</h4>
          <a href="/login">Sign in</a>
          <a href="/terminal">Open terminal</a>
          <a href={TRADEBERYL_URL}>TradeBeryl journal</a>
        </div>
        <div className="col">
          <h4>Legal</h4>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Service</a>
        </div>
      </div>
      <div className="container bottom">
        <span>© {new Date().getFullYear()} BerylTerminal. Not investment advice. Trading involves risk of loss.</span>
        <span>Built for traders who use more than one broker.</span>
      </div>
    </footer>
  );
}
