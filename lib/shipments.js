// Shipment tracking is stored in Stripe session metadata — strongly consistent,
// no read-modify-write, no blob ops. Legacy records (written to blob before this
// change) are still readable via getShipments() for backwards compatibility.

import Stripe from "stripe";
import { put } from "@vercel/blob";

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

// Write shipment to Stripe session metadata via raw API call.
// (stripe.checkout.sessions.update not available in SDK v14.)
// Stripe is strongly consistent — no eventual-consistency race conditions.
export async function addShipment({ sessionId, trackingNumber, carrier, trackingUrl }) {
  const shippedAt = new Date().toISOString();
  const body = new URLSearchParams({
    "metadata[tracking_number]": trackingNumber || "",
    "metadata[carrier]": carrier || "",
    "metadata[tracking_url]": trackingUrl || "",
    "metadata[shipped_at]": shippedAt,
  });
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Stripe metadata update failed: ${err?.error?.message || res.status}`);
  }
  return { sessionId, trackingNumber: trackingNumber || null, carrier: carrier || null, trackingUrl: trackingUrl || null, shippedAt, arrivedAt: null };
}
