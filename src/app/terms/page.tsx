import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = { title: "Terms of Service — BerylTerminal" };

export default function TermsPage() {
  return (
    <div className="site">
      <SiteNav />
      <section className="legal">
        <div className="container">
          <h1>Terms of Service</h1>
          <div className="updated">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>

          <p>
            By using BerylTerminal, you agree to the terms below. Read them alongside our{" "}
            <a href="/privacy" style={{ color: "var(--green)" }}>Privacy Policy</a>.
          </p>

          <h2>Not investment advice</h2>
          <p>
            BerylTerminal is charting, execution, and account-management software. Nothing shown in the terminal —
            prices, indicators, or any other display — is a recommendation to buy or sell any security, digital
            asset, or other instrument. You are solely responsible for your own trading decisions.
          </p>

          <h2>Trading risk</h2>
          <p>
            Trading securities, cryptocurrency, and futures carries substantial risk of loss and is not suitable
            for every investor. Past performance shown on any chart or in any summary is not indicative of future
            results. Live trading uses real funds in your connected broker account — orders placed through
            BerylTerminal are real and, once accepted by your broker, may not be reversible.
          </p>

          <h2>Your broker relationship</h2>
          <p>
            BerylTerminal is not a broker-dealer, exchange, or custodian. Your brokerage relationship, account
            agreements, and fees are entirely with the broker you connect (Alpaca, Kraken, Coinbase, Tradovate,
            Webull, or Interactive Brokers). We route orders and read account data on your behalf using
            credentials you provide; we do not hold your funds or securities.
          </p>

          <h2>Account security</h2>
          <p>
            You're responsible for keeping your sign-in and any broker credentials confidential. We strongly
            recommend enabling two-factor authentication. If you believe your account has been compromised,
            disconnect your broker connections and contact your broker directly in addition to us.
          </p>

          <h2>Service availability</h2>
          <p>
            Market data, charting, and order routing depend on third-party providers and your broker's own
            systems. We do not guarantee uninterrupted access, and outages at a data provider or broker are
            outside our control.
          </p>

          <h2>Shared account with TradeBeryl</h2>
          <p>
            BerylTerminal and TradeBeryl share a single sign-in. Actions you take in one (such as account
            deletion) may affect access to the other, since both rely on the same underlying identity.
          </p>

          <h2>Changes to these terms</h2>
          <p>We may update these terms from time to time. Continued use of BerylTerminal after a change means you accept the updated terms.</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
