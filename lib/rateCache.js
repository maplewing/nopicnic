// Short-lived cache for carrier quotes.
//
// /checkout asks for rates when someone types a postal code, and /api/checkout
// asks again to verify the option they picked before charging for it. That
// second lookup is what stops a forged shipping amount, but it was paying Shippo
// twice for the same answer. Caching the first result means the verification
// reads it back instead of re-fetching.
//
// The security property is unchanged: entries are only ever written from a live
// carrier response, keyed by the cart and destination they were quoted for. The
// browser can't put a price in here, it can only cause a genuine lookup for a
// cart it could have quoted anyway.

import crypto from "crypto";
import { Redis } from "@upstash/redis";

// Long enough to cover a slow checkout, short enough that nobody is charged a
// meaningfully stale price. Tokens in the payload are only used for matching —
// we never buy a label with them — so staleness costs accuracy, not correctness.
const TTL_SECONDS = 600;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export function rateCacheKey({ country, zip, lines }) {
  const cart = lines
    .map((l) => `${l.product.id}:${l.qty}`)
    .sort()
    .join(",");
  const raw = [
    String(country || "").toUpperCase(),
    String(zip || "").toUpperCase().replace(/\s+/g, ""),
    cart,
  ].join("|");
  return "rates:" + crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export async function getCachedRates(key) {
  try {
    const hit = await redis.get(key);
    return Array.isArray(hit) && hit.length ? hit : null;
  } catch (err) {
    // A cache that's down must never block a sale.
    console.error("Rate cache read failed:", err.message);
    return null;
  }
}

export async function setCachedRates(key, rates) {
  if (!Array.isArray(rates) || rates.length === 0) return;
  try {
    await redis.set(key, rates, { ex: TTL_SECONDS });
  } catch (err) {
    console.error("Rate cache write failed:", err.message);
  }
}
