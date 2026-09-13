import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

// One default watchlist per user for now (the schema supports multiple
// named lists, but the UI only needs one to start) — get-or-create keeps
// this simple rather than requiring a separate "create your first list"
// step before it's useful.
async function getOrCreateDefaultWatchlist(userId: string) {
  let watchlist = await db.watchlist.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
  if (!watchlist) {
    watchlist = await db.watchlist.create({ data: { userId, name: "Watchlist" } });
  }
  return watchlist;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const watchlist = await getOrCreateDefaultWatchlist(userId);
  const items = await db.watchlistItem.findMany({
    where: { watchlistId: watchlist.id },
    include: { instrument: true },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ watchlistId: watchlist.id, items });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json();
  const symbol = (body.symbol as string)?.toUpperCase()?.trim();
  if (!symbol) return NextResponse.json({ error: "Missing symbol." }, { status: 400 });

  const watchlist = await getOrCreateDefaultWatchlist(userId);
  const instrument = await db.instrument.upsert({
    where: { symbol },
    create: { symbol, assetClass: body.assetClass ?? "equity" },
    update: {},
  });

  const existing = await db.watchlistItem.findFirst({ where: { watchlistId: watchlist.id, instrumentId: instrument.id } });
  if (existing) return NextResponse.json({ item: existing });

  const count = await db.watchlistItem.count({ where: { watchlistId: watchlist.id } });
  const item = await db.watchlistItem.create({
    data: { watchlistId: watchlist.id, instrumentId: instrument.id, sortOrder: count },
    include: { instrument: true },
  });
  return NextResponse.json({ item });
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  // Scope the delete through the user's own watchlist so one user can
  // never delete another's item by guessing an id — findFirst with a
  // nested watchlist.userId filter, not a bare deleteMany by id alone.
  const item = await db.watchlistItem.findFirst({ where: { id, watchlist: { userId } } });
  if (!item) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await db.watchlistItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
