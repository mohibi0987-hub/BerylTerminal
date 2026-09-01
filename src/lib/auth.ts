import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { db } from "./db";
import { encryptSecret, decryptSecret } from "./crypto";

export async function getCurrentUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) return existing.id;

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
