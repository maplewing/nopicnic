// Short-lived cache for the admin dashboard's three expensive read endpoints.
//
// Opening /admin fires seven API calls at once, and three of them do real work:
// /stats and /orders each page through the whole Stripe history with line items
// and charges expanded, and /analytics reads a month of blobs. Deserializing all
// of that is what actually burns Vercel's Active CPU budget — the waiting on
// Stripe is free, the JSON parsing is not — and every reload of the tab paid for
// it again from scratch.
//
// None of those numbers change minute to minute, so a few minutes of staleness
// costs nothing. The Refresh button sends ?refresh=1 to skip the cache when the
// figures need to be current, and any write that changes an order bumps the
// epoch below so a stale read can't outlive it.
//
// Every path fails open: if Redis is unreachable the endpoint just does the work
// it would have done anyway. A down cache must never take the dashboard with it.

import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Long enough that clicking between dashboard tabs is free, short enough that
// nobody stares at numbers they'd call wrong.
export const DEFAULT_TTL_SECONDS = 300;

// Cache keys carry a version number rather than being deleted one by one. The
// endpoints are parameterised (?days=…), so there's no fixed set of keys a write
// could enumerate — incrementing the epoch retires all of them at once.
const EPOCH_KEY = "admin:cache:epoch";

async function readEpoch() {
  try {
    return (await redis.get(EPOCH_KEY)) || 0;
  } catch (err) {
    // Without an epoch we can't build a key we trust, so signal "don't cache".
    console.error("Admin cache epoch read failed:", err.message);
    return null;
  }
}

// Called by the writes that change what /orders reports — recording a shipment
// or buying a label both stamp tracking metadata onto the payment intent.
export async function invalidateAdminCache() {
  try {
    await redis.incr(EPOCH_KEY);
  } catch (err) {
    // Worst case the dashboard shows the previous minute's data until the TTL
    // expires. Not worth failing the shipment that just succeeded.
    console.error("Admin cache invalidation failed:", err.message);
  }
}

function wantsFresh(req) {
  return req.query.refresh === "1" || req.query.refresh === "true";
}

/**
 * Serve `build()`'s result, reusing a recent copy when there is one.
 *
 * `name` and `params` together identify the payload — include every query
 * parameter that changes the answer, or two different requests will share a
 * cache entry.
 */
export async function serveCached(req, res, { name, params = {}, ttl = DEFAULT_TTL_SECONDS, build }) {
  // Admin data is per-account and must never sit in a shared CDN or the browser
  // cache. The reuse here is server-side only.
  res.setHeader("Cache-Control", "no-store");

  const epoch = await readEpoch();
  const suffix = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  const key = epoch === null ? null : `admin:${name}:${epoch}:${suffix}`;

  if (key && !wantsFresh(req)) {
    try {
      const hit = await redis.get(key);
      if (hit) {
        res.setHeader("X-Cache", "hit");
        return res.status(200).json(hit);
      }
    } catch (err) {
      console.error(`Admin cache read failed (${name}):`, err.message);
    }
  }

  const payload = await build();

  if (key) {
    try {
      await redis.set(key, payload, { ex: ttl });
    } catch (err) {
      console.error(`Admin cache write failed (${name}):`, err.message);
    }
  }

  res.setHeader("X-Cache", "miss");
  return res.status(200).json(payload);
}
