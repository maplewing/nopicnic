// GET /api/drip/review-request
// Vercel Cron Job — runs daily at 10:00 UTC (see vercel.json).
// Finds Stripe sessions completed 9–11 days ago and sends a review
// request email to customers who haven't received one yet.
//
// Sent-tracking: persisted in Vercel Blob at admin/review-emails-sent.json
// so duplicate sends are prevented across cron runs.
//
// To run manually (dev or prod):
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://nopicnicpress.com/api/drip/review-request
//
// Required env vars:
//   CRON_SECRET          — set in Vercel dashboard (auto-generated for cron jobs)
//   STRIPE_SECRET_KEY    — existing
//   RESEND_API_KEY       — existing
//   BLOB_READ_WRITE_TOKEN — existing

import Stripe from "stripe";
import { Resend } from "resend";
import { put, head, fetch as blobFetch } from "@vercel/blob";
import { reviewRequestEmail } from "../../../lib/dripEmails";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const SENT_BLOB_KEY = "admin/review-emails-sent.json";

async function loadSentSet() {
  try {
    // head() checks if the blob exists without downloading it
    const info = await head(SENT_BLOB_KEY);
    if (!info) return new Set();
    const res = await blobFetch(info.url);
    const data = await res.json();
    return new Set(Array.isArray(data) ? data : []);
  } catch {
    return new Set();
  }
}

async function saveSentSet(sent) {
  await put(SENT_BLOB_KEY, JSON.stringify([...sent]), {
    access: "public",
    addRandomSuffix: false,
  });
}

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

  const sent = await loadSentSet();
  const newlySent = [];
  const skipped = [];

  for (const session of sessions.data) {
    if (session.status !== "complete") continue;
    if (sent.has(session.id)) {
      skipped.push(session.id);
      continue;
    }

    const toEmail = session.customer_details?.email;
    if (!toEmail) continue;

    const firstName = session.customer_details?.name?.split(" ")[0] || "there";
    const items = (session.line_items?.data || []).map((i) => i.description);

    const { error } = await resend.emails.send({
      from: "No Picnic Press <orders@nopicnicpress.com>",
      to: toEmail,
      subject: "A quick favor?",
      html: reviewRequestEmail(firstName, items),
    });

    if (error) {
      console.error(`Review email failed for session ${session.id}:`, error);
    } else {
      sent.add(session.id);
      newlySent.push({ sessionId: session.id, to: toEmail });
    }
  }

  if (newlySent.length > 0) {
    await saveSentSet(sent);
  }

  return res.status(200).json({
    checked: sessions.data.length,
    sent: newlySent.length,
    skipped: skipped.length,
    details: newlySent,
  });
}
