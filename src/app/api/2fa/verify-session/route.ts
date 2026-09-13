import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verify } from "otplib";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

// Same reasoning as auth.ts's EPHEMERAL_COOKIE — a true session cookie
// (no maxAge) independent of Clerk's own session, since this tracks
// something Clerk doesn't know about: whether THIS browser session has
// separately passed this app's own 2FA check yet, not just signed in.
const VERIFIED_COOKIE = "beryl_2fa_verified";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  const verifiedThisSession = cookies().get(VERIFIED_COOKIE)?.value === userId;

  return NextResponse.json({
    twoFactorEnabled: user?.twoFactorEnabled ?? false,
    needsVerification: (user?.twoFactorEnabled ?? false) && !verifiedThisSession,
  });
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { code } = await req.json();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    return NextResponse.json({ error: "2FA isn't enabled on this account." }, { status: 400 });
  }

  const result = await verify({ secret: user.twoFactorSecret, token: code });
  if (!result.valid) return NextResponse.json({ error: "That code doesn't match — check your authenticator app." }, { status: 400 });

  cookies().set(VERIFIED_COOKIE, userId, { httpOnly: true, sameSite: "lax", secure: true });
  return NextResponse.json({ ok: true });
}
