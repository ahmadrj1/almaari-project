interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const CLEANUP_INTERVAL_MS = 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number = 60 * 1000,
): { allowed: boolean; remaining: number; resetAt: number } {
  cleanupExpired();
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || record.resetAt <= now) {
    rateLimitStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  };
}
