import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stripe, planFromPriceId } from "@/lib/stripe";

// This is the ONLY place a user's `plan` field is ever written. The checkout
// and billing-portal routes just redirect to Stripe — they never touch the
// plan themselves. That matters: a client-side "set my plan to X" button is
// a free-upgrade loophole the moment real money is involved, so the plan
// only ever changes once Stripe itself confirms it happened.
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
        const priceId = subscription.items.data[0]?.price?.id;
        await db.user.update({
          where: { stripeCustomerId: session.customer as string },
          data: {
            stripeSubscriptionId: subscription.id,
            plan: planFromPriceId(priceId),
            subscriptionStatus: subscription.status,
          },
        });
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as any;
        const priceId = subscription.items.data[0]?.price?.id;
        await db.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            plan: subscription.status === "active" || subscription.status === "trialing" ? planFromPriceId(priceId) : "FREE",
            subscriptionStatus: subscription.status,
          },
        });
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as any;
        await db.user.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: { plan: "FREE", subscriptionStatus: "canceled", stripeSubscriptionId: null },
        });
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
