import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

// Never selects encryptedCredentials/encryptedOAuthTokens — this list is for the
// settings UI to show what's connected, not to ever expose secrets to the client.
const SAFE_SELECT = {
  id: true,
  broker: true,
  mode: true,
  status: true,
  externalAccountId: true,
  lastConnectedAt: true,
  lastError: true,
  createdAt: true,
} as const;

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const connections = await db.brokerConnection.findMany({
    where: { userId },
    select: SAFE_SELECT,
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(connections);
}

export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Ownership check before delete — never trust the id alone, since it's client-supplied.
  const existing = await db.brokerConnection.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Connection not found." }, { status: 404 });
  }
  await db.brokerConnection.delete({ where: { id } });
  return NextResponse.json({ status: "DISCONNECTED" });
}
