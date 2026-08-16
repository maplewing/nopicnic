// Shipment tracking is stored in Stripe PaymentIntent metadata — strongly
// consistent, no read-modify-write, no blob ops. Legacy records (written to blob
// before this change) are still readable via getLegacyShipments() so the admin
// can see old orders.

import Stripe from "stripe";
import { orderKind } from "./orderKind.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const BLOB_KEY = "admin/shipments.json";

function blobUrl(pathname) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const storeId = token.match(/vercel_blob_rw_([^_]+)/)?.[1]?.toLowerCase() || "";
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

// Read legacy blob shipments for backwards-compatible display of old records.
export async function getShipments() {
  try {
    const res = await fetch(blobUrl(BLOB_KEY), {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Write tracking to PaymentIntent metadata — stripe.paymentIntents.update
// is available in SDK v14 and Stripe guarantees strong consistency.
// paymentIntentId is passed by the caller who already has the session object.
export async function addShipment({ sessionId, paymentIntentId, trackingNumber, carrier, trackingUrl }) {
  const shippedAt = new Date().toISOString();
  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: {
      tracking_number: trackingNumber || "",
      carrier: carrier || "",
      tracking_url: trackingUrl || "",
      shipped_at: shippedAt,
    },
  });
  return { sessionId, trackingNumber: trackingNumber || null, carrier: carrier || null, trackingUrl: trackingUrl || null, shippedAt, arrivedAt: null };
}

// Shipped, tracked, and not yet marked as arrived. This is the queue the arrival
// drip works from. It reads PaymentIntent metadata, which is where addShipment
// writes — the blob above only ever holds pre-migration records.
// Shippo bills per tracking lookup, so the window matters:
//
// MIN_HOURS  Nothing is delivered the same day it ships, not even Overnight, so
//            polling on the ship day is always a wasted call. 24h is the widest
//            skip that can't delay a genuine next-day delivery.
// MAX_DAYS   A parcel that still isn't reporting delivered well past its window
//            is lost, mistyped, or missing from the carrier's feed. Without a cap
//            it gets polled daily until it ages out of the Stripe window.
//            Domestic Media Mail tops out at 8 business days, so 14 calendar days
//            is generous. International is not: UPS Worldwide Economy quotes 8–12
//            business days, which runs past 17 calendar days, so a flat 14 would
//            quietly stop polling before those ever delivered.
const MIN_HOURS_SINCE_SHIPPED = 24;
const MAX_DAYS_DOMESTIC = 14;
const MAX_DAYS_INTERNATIONAL = 25;

export async function getActiveShipments({ withinDays = 60 } = {}) {
  const created = { gte: Math.floor(Date.now() / 1000) - withinDays * 86400 };

  // status:"complete" is filtered by Stripe, not by us. Abandoned carts share
  // this list and outnumber real orders — without the filter a single page of
  // 100 can be mostly `open`, and completed orders past that point are simply
  // never seen. The loop below skips them anyway; the filter is what keeps them
  // from crowding the page.
  const sessions = await stripe.checkout.sessions.list({
    created,
    status: "complete",
    limit: 100,
    expand: ["data.payment_intent", "data.line_items"],
  });

  const active = [];
  const skipped = { tooNew: 0, tooOld: 0 };

  for (const session of sessions.data) {
    if (session.status !== "complete") continue;

    const intent = session.payment_intent;
    const meta = typeof intent === "object" ? intent?.metadata || {} : {};
    if (!meta.shipped_at) continue;
    if (meta.arrived_at) continue;
    if (!meta.tracking_number || !meta.carrier) continue;

    const email = session.customer_details?.email;
    if (!email) continue;

    const hoursSince = (Date.now() - new Date(meta.shipped_at)) / 3600000;
    if (!Number.isFinite(hoursSince)) continue;
    if (hoursSince < MIN_HOURS_SINCE_SHIPPED) {
      skipped.tooNew++;
      continue;
    }
    // Unknown destination gets the longer window — better a few extra lookups
    // than an international customer who never hears the parcel landed.
    const country = session.shipping_details?.address?.country || "";
    const maxDays = country === "US" ? MAX_DAYS_DOMESTIC : MAX_DAYS_INTERNATIONAL;
    if (hoursSince > maxDays * 24) {
      skipped.tooOld++;
      continue;
    }

    active.push({
      sessionId: session.id,
      paymentIntentId: typeof intent === "object" ? intent.id : intent,
      email,
      firstName: session.customer_details?.name?.split(" ")[0] || "there",
      items: (session.line_items?.data || []).map((i) => i.description),
      trackingNumber: meta.tracking_number,
      carrier: meta.carrier,
      trackingUrl: meta.tracking_url || null,
      shippedAt: meta.shipped_at,
    });
  }

  return { shipments: active, skipped };
}

// Every completed session in the window, paginated. Both fulfilment jobs below
// and in api/drip/review-request work from this: they ask "has this order
// reached the customer yet", which needs the whole set, not one page of it.
export async function listCompletedSessions({ withinDays = 60, expand = [] } = {}) {
  const created = { gte: Math.floor(Date.now() / 1000) - withinDays * 86400 };
  const sessions = [];
  let startingAfter;

  for (;;) {
    const batch = await stripe.checkout.sessions.list({
      created,
      status: "complete",
      limit: 100,
      expand,
      ...(startingAfter && { starting_after: startingAfter }),
    });
    sessions.push(...batch.data);
    if (!batch.has_more || batch.data.length === 0) break;
    startingAfter = batch.data[batch.data.length - 1].id;
  }

  return sessions;
}

// Paid orders that need a parcel and still have no tracking — the mirror image
// of getActiveShipments, which only starts caring once a label exists.
//
// ALERT_AFTER_DAYS  Same-day and next-day fulfilment is normal, and a weekend
//                   swallows two days without anything being wrong. Three days
//                   is where an order stops being "not yet" and starts being
//                   forgotten.
//
// There is no upper bound and no record of what's been reported. An order
// leaves this list by shipping or by being refunded, and until one of those
// happens it is still a real problem, so it keeps appearing. That is the whole
// dedupe story: nothing to store, nothing to reset.
export const ALERT_AFTER_DAYS = 3;

// Until commit 65e3b84 addShipment wrote tracking to the Vercel blob rather
// than to PaymentIntent metadata, so for those orders "no shipped_at" says
// nothing about whether they shipped — 24 of them did, and their tracking
// numbers are still in the blob getShipments() reads. Judged by metadata alone
// every one of them reports as late, every morning, which is how an alert turns
// into something you stop opening.
//
// The date is one day past the blob's final write (2026-07-06T19:37Z). Nothing
// has been written there since, and every unshipped order predating it was
// checked against the blob and found present — so this hides no real order, and
// costs no fetch that could fail in the cron.
const METADATA_ERA_START = Date.parse("2026-07-07T00:00:00Z");

export async function getUnshippedOrders({ withinDays = 60, afterDays = ALERT_AFTER_DAYS } = {}) {
  const sessions = await listCompletedSessions({
    withinDays,
    expand: ["data.line_items", "data.payment_intent.latest_charge"],
  });

  const unshipped = [];

  for (const session of sessions) {
    if (session.payment_status !== "paid") continue;
    if (session.created * 1000 < METADATA_ERA_START) continue;

    const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
    if (intent?.latest_charge?.amount_refunded > 0) continue;

    // Already has a label — addShipment stamped it when the order was marked
    // shipped in the admin.
    if (intent?.metadata?.shipped_at) continue;

    if (orderKind(session) !== "physical") continue;

    const ageDays = (Date.now() - session.created * 1000) / 86400000;
    if (ageDays < afterDays) continue;

    const address = session.shipping_details?.address || null;

    unshipped.push({
      sessionId: session.id,
      created: new Date(session.created * 1000).toISOString(),
      ageDays: Math.floor(ageDays),
      email: session.customer_details?.email || "",
      name: session.shipping_details?.name || session.customer_details?.name || "",
      items: (session.line_items?.data || []).map((i) => ({
        name: i.description || "",
        quantity: i.quantity ?? 1,
      })),
      total: (session.amount_total || 0) / 100,
      country: address?.country || "",
      address,
    });
  }

  // Oldest first — the one nearest to being a complaint goes at the top.
  unshipped.sort((a, b) => new Date(a.created) - new Date(b.created));

  return unshipped;
}

// Stamped as soon as the arrival email is accepted, so a later failure in the
// same run can't cause the customer to be emailed again tomorrow.
export async function markArrived(paymentIntentId) {
  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: { arrived_at: new Date().toISOString() },
  });
}
