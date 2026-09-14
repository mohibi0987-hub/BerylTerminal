import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, subscriptionStatus: true, stripeCustomerId: true },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  return NextResponse.json({
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    hasBillingAccount: !!user.stripeCustomerId,
  });
}
