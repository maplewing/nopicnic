// Which orders have already had a review request.
//
// Previously a JSON array in Vercel Blob, read back through a `fetch` export
// that @vercel/blob doesn't have — so the set always loaded empty and every
// order in the 9–11 day window would be emailed again on each daily run.
// A Redis set removes the read-modify-write entirely: membership is atomic and
// a crash mid-run can't lose the record of who was already contacted.

import { Redis } from "@upstash/redis";

const KEY = "review:sent";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function hasReviewBeenSent(sessionId) {
  return (await redis.sismember(KEY, sessionId)) === 1;
}

// Called immediately after each successful send, never batched at the end.
export async function markReviewSent(sessionId) {
  await redis.sadd(KEY, sessionId);
}
