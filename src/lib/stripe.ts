import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-06-20",
});

export type PlanTier = "PRO" | "ADVANCED" | "ELITE" | "REDBERYL";

// Maps our plan tiers to the actual recurring Price objects you create in
// the Stripe Dashboard (Products → add a recurring price per plan, once for
// monthly and once for annual billing — same product, two prices). These
// env vars are the one thing I genuinely can't know or set myself — copy
// each price's id (starts with "price_") from your own Stripe account.
export const PLAN_PRICE_IDS: Record<PlanTier, { monthly?: string; annual?: string }> = {
  PRO: { monthly: process.env.STRIPE_PRICE_PRO, annual: process.env.STRIPE_PRICE_PRO_ANNUAL },
  ADVANCED: { monthly: process.env.STRIPE_PRICE_ADVANCED, annual: process.env.STRIPE_PRICE_ADVANCED_ANNUAL },
  ELITE: { monthly: process.env.STRIPE_PRICE_ELITE, annual: process.env.STRIPE_PRICE_ELITE_ANNUAL },
  REDBERYL: { monthly: process.env.STRIPE_PRICE_REDBERYL, annual: process.env.STRIPE_PRICE_REDBERYL_ANNUAL },
};

// The TradeBeryl+BerylTerminal bundle — one Stripe product shared by both
// apps (same Stripe account, per your setup). Whichever plan level the
// bundle is meant to grant on the BerylTerminal side is decided here, not
// by anything in Stripe itself — Stripe just knows "this customer bought
// price X," it has no concept of what that means to either app.
export const BUNDLE_PRICE_ID = process.env.STRIPE_PRICE_BUNDLE;
export const BUNDLE_GRANTS_PLAN: PlanTier = "PRO";

export function planFromPriceId(priceId: string | null | undefined): PlanTier | null {
  if (priceId && BUNDLE_PRICE_ID && priceId === BUNDLE_PRICE_ID) return BUNDLE_GRANTS_PLAN;
  for (const [plan, ids] of Object.entries(PLAN_PRICE_IDS)) {
    if (priceId && (ids.monthly === priceId || ids.annual === priceId)) return plan as PlanTier;
  }
  return null; // no match — this price belongs to some other product (e.g. a TradeBeryl-only plan), not one of ours
}

// BerylTerminal and TradeBeryl share one Stripe account so a bundle
// subscription spanning both products is possible — which means BOTH apps'
// webhook endpoints receive every event on that account, not just the ones
// for their own prices. Given a subscription (which may have several line
// items if it's a bundle), this finds the one line item — if any — that's
// actually one of BerylTerminal's own plans (or the shared bundle price),
// and ignores everything else in it. Returning null means "this event
// doesn't concern us at all" — the caller must leave the user's plan
// untouched, never reset it to FREE just because a price it doesn't
// recognize showed up.
export function berylPlanFromSubscription(subscription: { items: { data: { price: { id: string } }[] } }): PlanTier | null {
  for (const item of subscription.items.data) {
    const plan = planFromPriceId(item.price.id);
    if (plan) return plan;
  }
  return null;
}
