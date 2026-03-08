/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Backend: Rate Limiter
 * ─────────────────────────────────────────────────────────
 * Simple in-memory rate limiter with sliding window.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((entry, key) => {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  });
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given key (usually IP address).
 */
export function checkRateLimit(
  key: string,
  maxRequests = 100,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetIn = entry.resetTime - now;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}
