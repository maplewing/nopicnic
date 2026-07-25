// Shipment tracking is stored in Stripe PaymentIntent metadata — strongly
// consistent, no read-modify-write, no blob ops. Legacy records (written to blob
// before this change) are still readable via getLegacyShipments() so the admin
// can see old orders.

import Stripe from "stripe";

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
export async function getActiveShipments({ withinDays = 60 } = {}) {
  const created = { gte: Math.floor(Date.now() / 1000) - withinDays * 86400 };

  const sessions = await stripe.checkout.sessions.list({
    created,
    limit: 100,
    expand: ["data.payment_intent", "data.line_items"],
  });

  const active = [];
  for (const session of sessions.data) {
    if (session.status !== "complete") continue;

    const intent = session.payment_intent;
    const meta = typeof intent === "object" ? intent?.metadata || {} : {};
    if (!meta.shipped_at) continue;
    if (meta.arrived_at) continue;
    if (!meta.tracking_number || !meta.carrier) continue;

    const email = session.customer_details?.email;
    if (!email) continue;

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

  return active;
}

// Stamped as soon as the arrival email is accepted, so a later failure in the
// same run can't cause the customer to be emailed again tomorrow.
export async function markArrived(paymentIntentId) {
  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: { arrived_at: new Date().toISOString() },
  });
}
