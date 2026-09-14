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

export function planFromPriceId(priceId: string | null | undefined): "PRO" | "ADVANCED" | "ELITE" | "REDBERYL" | "FREE" {
  for (const [plan, id] of Object.entries(PLAN_PRICE_IDS)) {
    if (id && id === priceId) return plan as "PRO" | "ADVANCED" | "ELITE" | "REDBERYL";
  }
  return "FREE";
}
