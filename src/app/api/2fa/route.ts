import { NextRequest, NextResponse } from "next/server";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

// This is an app-level TOTP layer on top of Clerk's own sign-in, not a
// replacement for it — Clerk owns identity/session entirely, this only
// adds a second, code-based check that this app itself enforces before
// treating a session as fully verified. The existing twoFactorSecret/
// twoFactorEnabled fields on User were already designed for exactly
// this, not for Clerk's own native MFA (which wouldn't need fields on
// this table at all, since Clerk tracks that on its own side).

// Step 1: generate a new secret + QR code to scan, before it's enabled.
// Nothing is persisted yet — enabling only happens once they've proven
// they can actually generate a valid code with it (POST below).
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const secret = generateSecret();
  const otpauth = generateURI({ issuer: "BerylTerminal", label: user.email, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauth);

  return NextResponse.json({ secret, qrDataUrl });
}

// Step 2: verify a code against a secret the client just generated, and
// only then persist it + flip twoFactorEnabled on. Verifying before
// enabling means someone can't lock themselves out with a secret they
// never actually confirmed their authenticator app agrees with.
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { secret, code } = await req.json();
  if (!secret || !code) return NextResponse.json({ error: "Missing secret or code." }, { status: 400 });

  const result = await verify({ secret, token: code });
  if (!result.valid) return NextResponse.json({ error: "That code doesn't match — check your authenticator app and try again." }, { status: 400 });

  await db.user.update({ where: { id: userId }, data: { twoFactorSecret: secret, twoFactorEnabled: true } });
  return NextResponse.json({ ok: true });
}

// Turning 2FA off requires a valid code too — not just a button click —
// so someone can't disable this for another session/device without
// actually having the authenticator app in hand.
export async function DELETE(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const { code } = await req.json();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) return NextResponse.json({ error: "2FA isn't enabled." }, { status: 400 });

  const result = await verify({ secret: user.twoFactorSecret, token: code });
  if (!result.valid) return NextResponse.json({ error: "That code doesn't match." }, { status: 400 });

  await db.user.update({ where: { id: userId }, data: { twoFactorSecret: null, twoFactorEnabled: false } });
  return NextResponse.json({ ok: true });
}
