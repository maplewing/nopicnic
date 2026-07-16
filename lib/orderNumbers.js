import { Redis } from "@upstash/redis";

const STARTING_ORDER_NUMBER = 2684;
const ORDER_NUMBERS_PATH = "admin/order-numbers.json";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function blobUrl(pathname) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const storeId = token.match(/vercel_blob_rw_([^_]+)/)?.[1]?.toLowerCase() || "";
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

async function readBlobData() {
  try {
    const res = await fetch(blobUrl(ORDER_NUMBERS_PATH), {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return { mapping: {}, nextOrderNumber: STARTING_ORDER_NUMBER };
    return res.json();
  } catch {
    return { mapping: {}, nextOrderNumber: STARTING_ORDER_NUMBER };
  }
}

// Runs once: seeds Redis from the legacy blob and sets a flag so it never runs again
async function ensureInitialized() {
  const initialized = await redis.get("order:initialized");
  if (initialized) return;

  const blobData = await readBlobData();

  // Set counter to (nextOrderNumber - 1) so the first incr() returns nextOrderNumber
  await redis.set("order:next", blobData.nextOrderNumber - 1);

  const entries = Object.entries(blobData.mapping || {});
  if (entries.length > 0) {
    const hash = {};
    for (const [k, v] of entries) hash[k] = String(v);
    await redis.hset("order:map", hash);
  }

  await redis.set("order:initialized", "1");
}

export async function getOrderNumbers() {
  await ensureInitialized();
  const [counterStr, rawMapping] = await Promise.all([
    redis.get("order:next"),
    redis.hgetall("order:map"),
  ]);
  const nextOrderNumber = (parseInt(counterStr) || STARTING_ORDER_NUMBER - 1) + 1;
  const mapping = {};
  for (const [k, v] of Object.entries(rawMapping || {})) mapping[k] = parseInt(v);
  return { nextOrderNumber, mapping };
}

export async function assignOrderNumber(sessionId) {
  await ensureInitialized();

  // Idempotent: return existing assignment if already set
  const existing = await redis.hget("order:map", sessionId);
  if (existing !== null) return parseInt(existing);

  // Atomic increment — no race condition possible
  const orderNumber = await redis.incr("order:next");

  await redis.hset("order:map", { [sessionId]: String(orderNumber) });
  return orderNumber;
}
