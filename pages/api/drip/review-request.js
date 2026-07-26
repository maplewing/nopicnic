// GET /api/drip/review-request
// Vercel Cron Job — runs daily at 10:00 UTC (see vercel.json).
// Finds Stripe sessions completed 9–11 days ago and sends a review
// request email to customers who haven't received one yet.
//
// Sent-tracking: a Redis set (lib/reviewSent.js), written per send, so the same
// order can't be emailed twice across the three daily runs its window spans.
//
// To run manually (dev or prod):
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://nopicnicpress.com/api/drip/review-request
//
// Required env vars:
//   CRON_SECRET          — set in Vercel dashboard. Without it every run 401s
//                          and no mail is sent, with no error anywhere obvious.
//   STRIPE_SECRET_KEY    — existing
//   RESEND_API_KEY       — existing
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — existing

import Stripe from "stripe";
import { Resend } from "resend";
import { reviewRequestEmail } from "../../../lib/dripEmails";
import { hasReviewBeenSent, markReviewSent } from "../../../lib/reviewSent";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Vercel automatically passes CRON_SECRET in the Authorization header
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Sessions completed 9–11 days ago (window prevents missing the exact day)
  const now = Math.floor(Date.now() / 1000);
  const DAY = 86400;
  const rangeStart = now - 11 * DAY;
  const rangeEnd = now - 9 * DAY;

  let sessions;
  try {
    sessions = await stripe.checkout.sessions.list({
      created: { gte: rangeStart, lte: rangeEnd },
      expand: ["data.line_items"],
      limit: 100,
    });
  } catch (err) {
    console.error("Stripe sessions.list error:", err.message);
    return res.status(500).json({ error: "Failed to fetch sessions from Stripe" });
  }

  const newlySent = [];
  let skipped = 0;
  let errors = 0;

  for (const session of sessions.data) {
    if (session.status !== "complete") continue;

    const toEmail = session.customer_details?.email;
    if (!toEmail) continue;

    if (await hasReviewBeenSent(session.id)) {
      skipped++;
      continue;
    }

    const firstName = session.customer_details?.name?.split(" ")[0] || "there";
    const items = (session.line_items?.data || []).map((i) => i.description);

    const { error } = await resend.emails.send({
      from: "No Picnic Press <orders@nopicnicpress.com>",
      to: toEmail,
      subject: "So, what do you think?",
      html: reviewRequestEmail(firstName, items, toEmail),
    });

    if (error) {
      console.error(`Review email failed for session ${session.id}:`, error);
      errors++;
      continue;
    }

    // Recorded per send. Batching this to the end of the run is what would let
    // one failure re-email everyone already contacted on tomorrow's run.
    try {
      await markReviewSent(session.id);
      newlySent.push(session.id);
    } catch (err) {
      console.error(`Could not record review send for ${session.id}:`, err.message);
      errors++;
    }
  }

  return res.status(200).json({
    checked: sessions.data.length,
    sent: newlySent.length,
    skipped,
    errors,
  });
}
