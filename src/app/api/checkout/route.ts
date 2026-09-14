import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, PLAN_PRICE_IDS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as keyof typeof PLAN_PRICE_IDS;
  const priceId = PLAN_PRICE_IDS[plan];
  if (!priceId) {
    return NextResponse.json(
      { error: `Stripe isn't configured for the ${plan ?? "requested"} plan yet — add STRIPE_PRICE_${plan} in Vercel's environment variables.` },
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
    // previous, since-canceled subscription) instead of creating a duplicate.
    let customerId = user.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
      customerId = customer.id;
      await db.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/settings?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancelled`,
      metadata: { userId: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: String(err.message ?? err) }, { status: 502 });
  }
}
