import { SiteNav } from "@/components/marketing/SiteNav";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const metadata = { title: "What's New — BerylTerminal" };

// Kept factual — this only lists things that are actually built and live,
// not a roadmap or aspirational feature list.
const ENTRIES = [
  {
    date: "This release",
    items: [
      "Price alerts — set above/below conditions per symbol, checked while the terminal is open",
      "Account deletion in Settings, with billing cancelled first",
      "Bracket orders (take-profit/stop-loss) on Alpaca",
      "Indicator plan-gating — RSI, MACD, and SMA now require a paid plan",
      "In-app navigation menu, reachable from every signed-in page",
      "Full mobile-responsive pass across the terminal, markets, and settings pages",
    ],
  },
  {
    date: "Earlier this cycle",
    items: [
      "Markets hub — Overview, Stocks, Crypto, Futures, and Watchlist tabs, the new landing page after sign-in",
      "Real Stripe billing — 4 plans (Pro, Advanced, Elite/Scale, RedBeryl), monthly and annual, plus a bundle with TradeBeryl",
      "Chart upgrades: timeframe selector, visible-range zoom, volume/RSI/MACD lower pane, SMA 20/50, Candle/Line toggle, a horizontal price-line drawing tool",
      "Two more brokers: Binance.US and Gemini, both fully wired",
      "Symbol search with autocomplete",
      "\"Instant Trade\" one-click order mode — off by default",
    ],
  },
  {
    date: "Foundational",
    items: [
      "Multi-broker order routing: Alpaca, Kraken, Coinbase, Tradovate, Webull, Interactive Brokers, Tastytrade",
      "Real-time watchlist, position tracking, and order history",
      "Server-side risk validation on every order before it reaches a broker",
      "Public homepage, pricing, privacy, and terms pages",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div className="site">
      <SiteNav />
      <section className="legal">
        <div className="container">
          <h1>What's New</h1>
          <div className="updated">A running, accurate record of what's actually shipped — not a roadmap.</div>
          {ENTRIES.map((entry) => (
            <div key={entry.date} style={{ marginBottom: 34 }}>
              <h2>{entry.date}</h2>
              <ul>
                {entry.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
