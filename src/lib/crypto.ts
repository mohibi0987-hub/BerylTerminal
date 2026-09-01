// AES-256-GCM encryption for broker credentials at rest.
// Required env var: CREDENTIAL_ENCRYPTION_KEY — a 32-byte key, base64-encoded.
// Generate one with:  openssl rand -base64 32
import crypto from "crypto";

function getKey(): Buffer {
  const b64 = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!b64) throw new Error("CREDENTIAL_ENCRYPTION_KEY is not set — generate one with `openssl rand -base64 32`.");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) throw new Error("CREDENTIAL_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
