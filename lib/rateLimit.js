// Fixed-window rate limiter backed by the same Upstash Redis instance as
// rateCache.js. Fails open if Redis is unreachable — a down cache must never
// block a legitimate request, only stop unbounded abuse.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export function clientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return fwd.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

// Returns true if the request is allowed, false if it should be rejected.
export async function checkRateLimit({ key, limit, windowSeconds }) {
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    return count <= limit;
  } catch (err) {
    console.error("Rate limit check failed:", err.message);
    return true;
  }
}
