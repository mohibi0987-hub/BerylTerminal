// Minimal but real session auth: scrypt password hashing (Node's crypto, no extra dependency)
// and an HMAC-signed session cookie. This covers step 1 of the spec's recommended build order.
// 2FA (TOTP) is modeled in the User table (twoFactorSecret/twoFactorEnabled) but not enforced
// in the login flow yet — flagged as a follow-up, not silently skipped.
import crypto from "crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

const SESSION_COOKIE = "beryl_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set — generate one with `openssl rand -base64 32`.");
  return secret;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(actual, expected);
}

function sign(value: string): string {
  const mac = crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

function verify(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expectedMac = crypto.createHmac("sha256", getSessionSecret()).update(value).digest("hex");
  if (mac.length !== expectedMac.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expectedMac))) {
    return null;
  }
  return value;
}

// Call from a Route Handler (Server Action / Response) to log a user in.
export function buildSessionCookie(userId: string) {
  const payload = JSON.stringify({ userId, iat: Date.now() });
  const token = sign(Buffer.from(payload).toString("base64url"));
  return { name: SESSION_COOKIE, value: token, options: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: SESSION_MAX_AGE_SECONDS } };
}

export async function getCurrentUserId(_req?: NextRequest): Promise<string | null> {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const value = verify(token);
  if (!value) return null;
  try {
    const payload = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;
