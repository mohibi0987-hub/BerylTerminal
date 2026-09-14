import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const alerts = await db.alert.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(alerts);
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const symbol = (body.symbol as string)?.toUpperCase()?.trim();
  const condition = body.condition as string; // "price_above" | "price_below"
  const targetValue = Number(body.targetValue);
  if (!symbol || !["price_above", "price_below"].includes(condition) || !Number.isFinite(targetValue)) {
    return NextResponse.json({ error: "symbol, condition (price_above/price_below), and a numeric targetValue are required." }, { status: 400 });
  }

  const alert = await db.alert.create({ data: { userId, symbol, condition, targetValue } });
  return NextResponse.json(alert);
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await db.alert.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Alert not found." }, { status: 404 });

  await db.alert.delete({ where: { id } });
  return NextResponse.json({ status: "DELETED" });
}

// Marks an alert triggered — called by the client once it observes (via its
// own price polling) that an alert's condition was met. There's no
// server-side cron/push evaluation here, so triggering only happens while
// someone actually has the terminal open and polling — not a background
// notification system. That's a real, honest limitation worth being clear
// about, not something to quietly imply is more automatic than it is.
export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = body.id as string;
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const existing = await db.alert.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Alert not found." }, { status: 404 });

  const alert = await db.alert.update({ where: { id }, data: { isActive: false, triggeredAt: new Date() } });
  return NextResponse.json(alert);
}
