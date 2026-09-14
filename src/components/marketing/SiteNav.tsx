import { SiteAccountMenu } from "./SiteAccountMenu";

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
          <a href="/pricing">Pricing</a>
        </nav>
        <div className="spacer">
          <SiteAccountMenu />
        </div>
      </div>
    </header>
  );
}
