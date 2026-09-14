import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// Order matters here: Stripe first (so a cancelled account doesn't keep
// getting billed even if something below fails), then the DB row (which
// cascades through every related table via the schema's own onDelete:
// Cascade — broker connections, watchlists, orders, alerts, drawings,
// indicator configs, audit events), then the Clerk identity last (so a
// failure earlier doesn't leave someone able to sign in to a half-deleted
// account with no data).
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (user.stripeSubscriptionId && process.env.STRIPE_SECRET_KEY) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err: any) {
      // If Stripe genuinely can't be reached, stop here rather than delete
      // an account that might still be actively billing — better to surface
      // the error and let the person retry than silently orphan a live
      // subscription with no account left to manage it from.
      return NextResponse.json({ error: `Couldn't cancel billing first, so nothing was deleted: ${err.message ?? err}` }, { status: 502 });
    }
  }

  await db.user.delete({ where: { id: userId } });

  if (user.clerkId) {
    try {
      const client = await clerkClient();
      await client.users.deleteUser(user.clerkId);
    } catch (err: any) {
      // The DB side is already gone at this point — surface this as a
      // warning rather than an error the person can "fix" by retrying,
      // since retrying would just fail on a User row that no longer exists.
      return NextResponse.json({ deleted: true, warning: `Account data was deleted, but the sign-in identity itself couldn't be removed automatically: ${err.message ?? err}` });
    }
  }

  return NextResponse.json({ deleted: true });
}
