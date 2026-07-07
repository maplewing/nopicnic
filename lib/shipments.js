// Shipment tracking is stored in Stripe session metadata — strongly consistent,
// no read-modify-write, no blob ops. Legacy records (written to blob before this
// change) are still readable via getShipments() for backwards compatibility.

import Stripe from "stripe";
import { put } from "@vercel/blob";

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

// Write shipment to Stripe session metadata.
// Stripe is strongly consistent — no eventual-consistency race conditions.
export async function addShipment({ sessionId, trackingNumber, carrier, trackingUrl }) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const shippedAt = new Date().toISOString();
  await stripe.checkout.sessions.update(sessionId, {
    metadata: {
      tracking_number: trackingNumber || "",
      carrier: carrier || "",
      tracking_url: trackingUrl || "",
      shipped_at: shippedAt,
    },
  });
  return { sessionId, trackingNumber: trackingNumber || null, carrier: carrier || null, trackingUrl: trackingUrl || null, shippedAt, arrivedAt: null };
}
