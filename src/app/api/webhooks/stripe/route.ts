import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe, berylPlanFromSubscription } from "@/lib/stripe";

// This is the ONLY place a user's `plan` field is ever written. The checkout
// and billing-portal routes just redirect to Stripe — they never touch the
// plan themselves. That matters: a client-side "set my plan to X" button is
// a free-upgrade loophole the moment real money is involved, so the plan
// only ever changes once Stripe itself confirms it happened.
//
// BerylTerminal and TradeBeryl share one Stripe account/customer so a
// bundle subscription spanning both products is possible — which means
// this endpoint receives events for TradeBeryl-only purchases too, not
// just BerylTerminal's. Every handler below checks whether the event
// actually concerns one of BerylTerminal's own prices before touching
// anything; if it doesn't, the event is acknowledged and ignored rather
// than treated as "no BerylTerminal plan" and wrongly reset to FREE.
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 501 });
  }

  const rawBody = await req.text(); // must be the raw, unparsed body for signature verification
  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Signature verification failed: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const plan = berylPlanFromSubscription(subscription as any);
        if (!plan) break; // this checkout was for a TradeBeryl-only price — not ours to touch
        await db.user.update({
          where: { stripeCustomerId: session.customer as string },
          data: { stripeSubscriptionId: subscription.id, plan, subscriptionStatus: subscription.status },
        });
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const plan = berylPlanFromSubscription(subscription);
        if (plan) {
          // A BerylTerminal price is present on this subscription — this is
          // definitely ours to act on, whether it's a fresh upgrade or a
          // renewal/status change on an existing one.
          await db.user.update({
            where: { stripeCustomerId: subscription.customer as string },
            data: {
              stripeSubscriptionId: subscription.id,
              plan: subscription.status === "active" || subscription.status === "trialing" ? plan : "FREE",
              subscriptionStatus: subscription.status,
            },
          });
        } else {
          // No BerylTerminal price on this subscription right now. That's
          // only meaningful to us if this is the exact subscription we were
          // already tracking — meaning a BerylTerminal price used to be on
          // it (a bundle) and was just removed, leaving only TradeBeryl's
          // side. Any other subscription id is unrelated to us entirely.
          const user = await db.user.findUnique({ where: { stripeCustomerId: subscription.customer as string } });
          if (user?.stripeSubscriptionId === subscription.id) {
            await db.user.update({
              where: { stripeCustomerId: subscription.customer as string },
              data: { plan: "FREE", subscriptionStatus: subscription.status, stripeSubscriptionId: null },
            });
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        const plan = berylPlanFromSubscription(subscription);
        const user = await db.user.findUnique({ where: { stripeCustomerId: subscription.customer as string } });
        // Act if this subscription had a BerylTerminal price on it, OR if it's
        // the exact subscription we were tracking (covers the case where the
        // deleted event's item list comes back empty).
        if (plan || user?.stripeSubscriptionId === subscription.id) {
          await db.user.update({
            where: { stripeCustomerId: subscription.customer as string },
            data: { plan: "FREE", subscriptionStatus: "canceled", stripeSubscriptionId: null },
          });
        }
        break;
      }
      // Other event types are intentionally ignored — only these three
      // determine plan state, per Stripe's own recommended subscription
      // lifecycle pattern.
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    // A user row might not exist yet for this customer (e.g. race condition,
    // or a customer created outside this app) — log and 200 anyway so Stripe
    // doesn't retry forever on something that will never resolve.
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ received: true, warning: String(err.message ?? err) });
  }
}
