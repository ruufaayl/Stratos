/**
 * Upstash Redis rate limiter with graceful degradation.
 * Falls back to allow-all when UPSTASH_REDIS_REST_URL is not set.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Singleton Redis client — only created when env vars are present
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // unix ms
}

/**
 * Check rate limit for a given key.
 * @param key     Unique identifier (e.g. `scan:org_xxx` or `export:user_yyy`)
 * @param limit   Max requests allowed in the window
 * @param window  Window in seconds (e.g. 3600 for 1 hour)
 * @returns RateLimitResult — if Redis not configured, always returns allowed: true
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  window: number,
): Promise<RateLimitResult> {
  const r = getRedis();
  if (!r) {
    return { allowed: true, limit, remaining: limit, reset: Date.now() + window * 1000 };
  }
  const ratelimit = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(limit, `${window} s`),
    prefix: "stratos:rl",
  });
  const { success, limit: l, remaining, reset } = await ratelimit.limit(key);
  return { allowed: success, limit: l, remaining, reset };
}

/** Helper: build a 429 Response with Retry-After header */
export function rateLimitExceededResponse(reset: number): Response {
  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return Response.json(
    { error: "rate_limit_exceeded", message: "Too many requests. Please slow down.", retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Reset": String(reset),
      },
    },
  );
}
