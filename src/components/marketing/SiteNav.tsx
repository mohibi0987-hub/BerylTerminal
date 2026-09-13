const TRADEBERYL_URL = process.env.NEXT_PUBLIC_TRADEBERYL_URL ?? "https://tradeberyl.com";

export function SiteNav() {
  return (
    <header className="site-nav">
      <div className="container">
        <a href="/" className="logo">
          <span className="dot" />
          BerylTerminal
        </a>
        <nav>
          <a href="/#brokers">Brokers</a>
          <a href="/#features">Features</a>
          <a href="/#pricing">Pricing</a>
          <a href={`${TRADEBERYL_URL}`} target="_blank" rel="noreferrer">TradeBeryl</a>
        </nav>
        <div className="spacer">
          <a href={`${TRADEBERYL_URL}/account`} className="btn btn-ghost">Account</a>
          <a href="/login" className="btn btn-ghost">Sign in</a>
          <a href="/login" className="btn btn-primary">Launch Terminal</a>
        </div>
      </div>
    </header>
  );
}
