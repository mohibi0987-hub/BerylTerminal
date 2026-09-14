import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, PLAN_PRICE_IDS, BUNDLE_PRICE_ID, type PlanTier } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const isBundle = body.plan === "BUNDLE";
  const interval: "monthly" | "annual" = body.interval === "annual" ? "annual" : "monthly";

  let priceId: string | undefined;
  let missingVarName: string;
  if (isBundle) {
    priceId = BUNDLE_PRICE_ID;
    missingVarName = "STRIPE_PRICE_BUNDLE";
  } else {
    const plan = body.plan as PlanTier;
    priceId = PLAN_PRICE_IDS[plan]?.[interval];
    missingVarName = `STRIPE_PRICE_${plan}${interval === "annual" ? "_ANNUAL" : ""}`;
  }

  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe isn't configured for this plan yet — add ${missingVarName} in Vercel's environment variables.` },
      { status: 501 },
    );
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe isn't configured yet — add STRIPE_SECRET_KEY in Vercel's environment variables." }, { status: 501 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://berylterminal.vercel.app";

  try {
    // Reuse an existing Stripe customer if this user already has one (e.g. from a
    // previous, since-canceled subscription) instead of creating a duplicate. This
    // matters even more for the bundle, since it's meant to be the SAME customer
    // record TradeBeryl already bills — sharing one Stripe account is what makes a
    // bundle spanning both products possible in the first place.
    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
      customerId = customer.id;
      await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    } else if (isBundle) {
      // If this customer already has an active subscription (their existing
      // TradeBeryl plan), the bundle should attach to it as a new line item
      // rather than start a second, separate subscription — that's the whole
      // point of a "bundle": one subscription, both products. Only do this
      // if the bundle price isn't already on that subscription.
      const existing = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 });
      const subscription = existing.data[0];
      if (subscription) {
        const alreadyBundled = subscription.items.data.some((item) => item.price.id === priceId);
        if (alreadyBundled) {
          return NextResponse.json({ attached: true, message: "The bundle is already on your subscription." });
        }
        // Attaching directly bypasses Stripe's own hosted checkout confirmation
        // screen and bills immediately (prorated) — unlike a normal Checkout
        // redirect, there's no natural "are you sure" step here, so require
        // one explicitly before actually making the change.
        if (!body.confirmAttach) {
          const price = await stripe.prices.retrieve(priceId!);
          const amount = price.unit_amount ? (price.unit_amount / 100).toFixed(2) : "the bundle price";
          return NextResponse.json({
            requiresConfirmation: true,
            message: `This adds the TradeBeryl + BerylTerminal bundle ($${amount}/mo) to your existing subscription and bills a prorated amount today. Continue?`,
          });
        }
        await stripe.subscriptionItems.create({ subscription: subscription.id, price: priceId! });
        return NextResponse.json({ attached: true, message: "Bundle added to your existing subscription." });
      }
      // No existing subscription — fall through to a normal new Checkout Session below.
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: { userId: user.id, plan: body.plan, interval },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 502 });
  }
}
