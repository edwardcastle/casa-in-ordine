/**
 * Per-key sliding-window rate limiting, held in process memory.
 *
 * Serverless instances do not share this map, so the real ceiling is
 * `limit × instances`. That is enough to stop a script hammering one endpoint,
 * which is what it is here for; it is not a distributed quota.
 */

interface RateLimiterOptions {
  /** Requests allowed inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimiter {
  /** Records a hit and reports whether the caller has gone over the limit. */
  check(key: string): boolean;
}

// Keys are pruned once the map grows past this, so a long-running instance
// being probed from many addresses cannot grow it without bound.
const PRUNE_THRESHOLD = 5_000;

export function createRateLimiter({ limit, windowMs }: RateLimiterOptions): RateLimiter {
  const hits = new Map<string, number[]>();

  function prune(now: number) {
    for (const [key, timestamps] of hits) {
      const recent = timestamps.filter((t) => now - t < windowMs);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);
    }
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      if (hits.size > PRUNE_THRESHOLD) prune(now);

      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      recent.push(now);
      hits.set(key, recent);
      return recent.length > limit;
    },
  };
}

/**
 * Best-effort client address. Behind a proxy the leftmost x-forwarded-for entry
 * is the client; it is spoofable, so treat this as a throttling hint rather
 * than an identity.
 */
export function clientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
