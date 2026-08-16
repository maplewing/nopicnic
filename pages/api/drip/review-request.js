// GET /api/drip/review-request
// Vercel Cron Job — runs daily at 10:00 UTC (see vercel.json).
// Asks for a review ten days after the order actually reached the customer.
//
// "Reached the customer" is not the same as "was paid for", and the difference
// is what this used to get wrong: it selected on session age alone, so an order
// still sitting unshipped got a mail saying it landed on the doorstep ten days
// ago. Now each order gets a delivery date it has to actually earn —
//
//   physical  arrived_at if the arrival cron confirmed it, otherwise the ship
//             date plus typical transit. No ship date at all means no email,
//             ever, until it ships — the order is not late for a review, it is
//             late for a label, which api/drip/unshipped is what handles.
//   digital   the moment of purchase; download links go out with the receipt.
//   service   the same, and the copy says "wrapped up" rather than "arrived".
//
// The dates live in lib/reviewTiming.js, which is pure and can be run against
// real orders without sending anything — see scripts/review-due.mjs.
//
// Sent-tracking: a Redis set (lib/reviewSent.js), written per send, so the same
// order can't be emailed twice across the days its window spans.
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

import { Resend } from "resend";
import { reviewRequestEmail } from "../../../lib/dripEmails";
import { hasReviewBeenSent, markReviewSent } from "../../../lib/reviewSent";
import { listCompletedSessions } from "../../../lib/shipments";
import { orderKind } from "../../../lib/orderKind.js";
import { reviewStatus } from "../../../lib/reviewTiming.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  // Vercel automatically passes CRON_SECRET in the Authorization header
  const authHeader = req.headers["authorization"];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let sessions;
  try {
    sessions = await listCompletedSessions({
      withinDays: 60,
      expand: ["data.line_items", "data.payment_intent.latest_charge"],
    });
  } catch (err) {
    console.error("Stripe sessions.list error:", err.message);
    return res.status(500).json({ error: "Failed to fetch sessions from Stripe" });
  }

  const newlySent = [];
  let alreadySent = 0;
  let notYetDelivered = 0;
  let outsideWindow = 0;
  let errors = 0;

  const now = Date.now();

  for (const session of sessions) {
    if (session.payment_status !== "paid") continue;

    const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
    // Nobody wants to be asked how they liked the thing they sent back.
    if (intent?.latest_charge?.amount_refunded > 0) continue;

    const toEmail = session.customer_details?.email;
    if (!toEmail) continue;

    const kind = orderKind(session);
    const { status } = reviewStatus(session, kind, now);

    if (status === "not-delivered") {
      notYetDelivered++;
      continue;
    }
    if (status !== "due") {
      outsideWindow++;
      continue;
    }

    if (await hasReviewBeenSent(session.id)) {
      alreadySent++;
      continue;
    }

    const firstName = session.customer_details?.name?.split(" ")[0] || "there";
    const items = (session.line_items?.data || []).map((i) => i.description);

    const { error } = await resend.emails.send({
      from: "No Picnic Press <orders@nopicnicpress.com>",
      to: toEmail,
      subject: "So, what do you think?",
      html: reviewRequestEmail(firstName, items, toEmail, kind),
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
    checked: sessions.length,
    sent: newlySent.length,
    // Split out rather than lumped into one `skipped`: "waiting on a label" is
    // an operational problem, the other two are the job working normally.
    notYetDelivered,
    outsideWindow,
    alreadySent,
    errors,
  });
}
