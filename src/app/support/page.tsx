import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = { title: "Help & Support — BerylTerminal" };

const FAQS = [
  { q: "How do I connect a broker?", a: "From the terminal, click \"Connect broker\" in the top-right, pick your broker, and enter its credentials. Paper mode is free and doesn't require a funded account." },
  { q: "Why isn't my chart loading?", a: "This usually means the market-data provider's daily quota is exhausted, or the symbol isn't recognized. Try a different symbol, or check back after the quota resets." },
  { q: "Can I use more than one broker at once?", a: "Yes — connect as many as you want, and switch between them per order using the broker/mode selector in the order ticket." },
  { q: "How do I cancel my subscription?", a: "Settings → Plan & Billing → Manage billing opens Stripe's own billing portal, where you can change or cancel your plan directly." },
  { q: "Is Instant Trade safe to use?", a: "It's off by default for a reason — when enabled, clicking a quantity preset submits a real order immediately with no confirmation step. Only turn it on if you're comfortable with that." },
  { q: "Do price alerts notify me when I'm not on the site?", a: "Not currently — alerts are checked while you have the terminal open, not as a background or push notification." },
];

export default function SupportPage() {
  return (
    <div className="site">
      <SiteNav />
      <section className="legal">
        <div className="container">
          <h1>Help &amp; Support</h1>
          <div className="updated">Search this page, or reach out directly below.</div>

          <h2>Frequently asked</h2>
          {FAQS.map((f) => (
            <div key={f.q} style={{ marginBottom: 22 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 4 }}>{f.q}</div>
              <p style={{ margin: 0 }}>{f.a}</p>
            </div>
          ))}

          <h2>Still stuck?</h2>
          <p>
            Email <a href="mailto:support@berylterminal.com" style={{ color: "var(--green)" }}>support@berylterminal.com</a> — include
            your account email and, if it's about an order or broker connection, which broker and mode (paper/live) so it's faster to trace.
          </p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
