import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

// Maps our plan tiers to the actual recurring Price object you create in
// the Stripe Dashboard (Products → add a recurring price per plan). These
// env vars are the one thing I genuinely can't know or set myself — copy
// each price's id (starts with "price_") from your own Stripe account.
export const PLAN_PRICE_IDS: Record<"PRO" | "ADVANCED" | "ELITE" | "REDBERYL", string | undefined> = {
  PRO: process.env.STRIPE_PRICE_PRO,
  ADVANCED: process.env.STRIPE_PRICE_ADVANCED,
  ELITE: process.env.STRIPE_PRICE_ELITE,
  REDBERYL: process.env.STRIPE_PRICE_REDBERYL,
};

export function planFromPriceId(priceId: string | null | undefined): "PRO" | "ADVANCED" | "ELITE" | "REDBERYL" | null {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id && id === priceId) return plan as "PRO" | "ADVANCED" | "ELITE" | "REDBERYL";
  }
  return null; // no match — this price belongs to some other product (e.g. a TradeBeryl plan), not one of ours
}

// BerylTerminal and TradeBeryl share one Stripe account so a bundle
// subscription spanning both products is possible — which means BOTH apps'
// webhook endpoints receive every event on that account, not just the ones
// for their own prices. Given a subscription (which may have several line
// items if it's a bundle), this finds the one line item — if any — that's
// actually one of BerylTerminal's own plans, and ignores everything else in
// it. Returning null means "this event doesn't concern us at all" — the
// caller must leave the user's plan untouched, never reset it to FREE just
// because a price it doesn't recognize showed up.
export function berylPlanFromSubscription(subscription: { items: { data: { price: { id: string } }[] } }): "PRO" | "ADVANCED" | "ELITE" | "REDBERYL" | null {
  for (const item of subscription.items.data) {
    const plan = planFromPriceId(item.price.id);
    if (plan) return plan;
  }
  return null;
}
