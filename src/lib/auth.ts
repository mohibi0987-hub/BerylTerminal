// Identity and session are owned by Clerk (see middleware.ts and the custom /login page built
// on Clerk's useSignIn/useSignUp hooks). This module bridges a Clerk identity to our own
// internal User row — our schema's foreign keys (orders, positions, broker connections) all
// point at OUR cuid, not Clerk's user id — and manages "don't remember me" broker credentials
// in a cookie that's deliberately independent of Clerk's own session cookie.
import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "./db";
import { encryptSecret, decryptSecret } from "./crypto";

export async function getCurrentUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return existing.id;

  // First time we've seen this Clerk identity. If an account with this email already
  // exists from before Clerk was added, link it instead of creating a duplicate — a plain
  // create() here would violate the email uniqueness rule and crash the request.
  const cu = await currentUser();
  const email = cu?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@clerk.local`;
  const name = [cu?.firstName, cu?.lastName].filter(Boolean).join(" ") || undefined;
  const user = await db.user.upsert({
    where: { email },
    create: { clerkId, email, name },
    update: { clerkId },
  });
  return user.id;
}

const EPHEMERAL_COOKIE = "beryl_ephemeral_brokers";

// No maxAge is set on purpose: this makes it a true browser "session cookie" that disappears
// when the browser fully closes — the closest honest equivalent to "forget when my session
// ends" without hooking into Clerk's own sign-out internals.
export async function getEphemeralCredentials(broker: string, mode: string): Promise<Record<string, string> | null> {
  const raw = cookies().get(EPHEMERAL_COOKIE)?.value;
  if (!raw) return null;
  try {
    const all = JSON.parse(decryptSecret(raw)) as Record<string, string>;
    const blob = all[`${broker}_${mode}`];
    return blob ? JSON.parse(blob) : null;
  } catch {
    return null;
  }
}

export function buildEphemeralCookie(existingRaw: string | undefined, broker: string, mode: string, credentials: Record<string, string>) {
  let all: Record<string, string> = {};
  if (existingRaw) {
    try { all = JSON.parse(decryptSecret(existingRaw)); } catch { /* start fresh if corrupt */ }
  }
  all[`${broker}_${mode}`] = JSON.stringify(credentials);
  const value = encryptSecret(JSON.stringify(all));
  return { name: EPHEMERAL_COOKIE, value, options: { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" } };
}

export function getRawEphemeralCookie(): string | undefined {
  return cookies().get(EPHEMERAL_COOKIE)?.value;
}
