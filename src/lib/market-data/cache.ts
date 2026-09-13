// A minimal in-memory cache, scoped to one warm serverless instance.
//
// This does NOT make Twelve Data usage safe under real concurrent traffic —
// Vercel serverless instances are ephemeral and don't share memory across
// cold starts or across multiple concurrent instances, so this is a
// best-effort reduction, not a guarantee. Its real job here is to stop the
// specific problem observed: a single open browser tab polling every 15s
// with zero caching, which alone can exhaust an 800-credit/day quota in a
// few hours. Caching each symbol's bars/quote for a short TTL means most
// of those polls are served from memory instead of hitting Twelve Data.
//
// If usage grows beyond one lightly-used instance, replace this with a
// real shared cache (e.g. Vercel KV / Redis) — a genuine fix at that
// point, not a bigger version of this same workaround.

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { store.delete(key); return undefined; }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}
