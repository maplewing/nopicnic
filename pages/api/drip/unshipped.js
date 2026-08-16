// GET /api/drip/unshipped
//
// Not a cron. Vercel's Hobby plan allows two cron jobs and vercel.json already
// spends both, so the digest rides along at the end of api/drip/arrival's daily
// run instead — see lib/unshippedDigest.js, which holds the actual work and
// explains what it's for. This route exists so the digest can be run on demand,
// and so it can go back to being its own scheduled job on Pro by adding:
//
//   { "path": "/api/drip/unshipped", "schedule": "0 16 * * *" }
//
// to vercel.json and dropping the call from arrival.js.
//
// Run it now (dev/prod):
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://nopicnicpress.com/api/drip/unshipped
//
// To see the queue without sending anything: node scripts/list-unshipped.mjs

import { sendUnshippedDigest } from "../../../lib/unshippedDigest";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  if (req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    return res.status(200).json(await sendUnshippedDigest());
  } catch (err) {
    console.error("Could not load unshipped orders:", err.message);
    return res.status(500).json({ error: "Failed to load orders" });
  }
}
