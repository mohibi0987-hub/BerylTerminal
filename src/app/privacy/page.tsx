import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = { title: "Privacy Policy — BerylTerminal" };

export default function PrivacyPage() {
  return (
    <div className="site">
      <SiteNav />
      <section className="legal">
        <div className="container">
          <h1>Privacy Policy</h1>
          <div className="updated">Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>

          <p>
            This policy explains what BerylTerminal collects, why, and how it's handled. BerylTerminal shares a
            sign-in with TradeBeryl (your trading journal) through a single account provider, so some of this
            overlaps with TradeBeryl's own policy.
          </p>

          <h2>What we collect</h2>
          <ul>
            <li>Account information: email address, name, and authentication data, handled by our identity provider.</li>
            <li>Broker connection details: API keys/credentials you provide are encrypted at rest and used only to place orders and read account data on your behalf.</li>
            <li>Trading activity you generate in the terminal: orders, positions, and watchlists.</li>
            <li>Standard technical data: IP address, browser type, and basic usage logs for security and reliability.</li>
          </ul>

          <h2>What we don't do</h2>
          <ul>
            <li>We don't sell your data to third parties.</li>
            <li>We don't use your broker credentials for anything other than the order/account actions you initiate.</li>
            <li>We don't share your trading activity with anyone except the broker you connected to, and as required by law.</li>
          </ul>

          <h2>How your data is stored</h2>
          <p>
            Broker credentials are encrypted at rest. Authentication is handled by a dedicated identity provider —
            we don't store your password ourselves. Data is stored with our database provider and is only
            accessible to your own account.
          </p>

          <h2>Your choices</h2>
          <p>
            You can disconnect a broker, delete a watchlist, or remove saved broker credentials at any time from
            within the terminal. You can request full account deletion from your account settings, which removes
            your identity and cascades to your terminal data.
          </p>

          <h2>Market data</h2>
          <p>
            Charts and quotes are provided by third-party market data providers. We don't control their own data
            retention practices, only how their data is displayed inside BerylTerminal.
          </p>

          <h2>Contact</h2>
          <p>Questions about this policy can be sent through your account's support channel.</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
