// Vercel Blob store for active shipments
// Shape of each record:
//   {
//     sessionId:      string   — Stripe checkout session ID
//     trackingNumber: string|null
//     carrier:        string|null  — "USPS", "UPS", "FedEx", "DHL"
//     trackingUrl:    string|null
//     email:          string
//     firstName:      string
//     items:          string[]  — item description strings
//     shippedAt:      ISO string — when the ship email was sent
//     arrivedAt:      ISO string|null — when Shippo confirmed DELIVERED
//   }

import { put, head, fetch as blobFetch } from "@vercel/blob";

const BLOB_KEY = "admin/shipments.json";

export async function getShipments() {
  try {
    const info = await head(BLOB_KEY);
    if (!info) return [];
    const res = await blobFetch(info.url);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function saveShipments(shipments) {
  await put(BLOB_KEY, JSON.stringify(shipments), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// Adds a new shipment or overwrites an existing one by sessionId.
export async function addShipment(shipment) {
  const shipments = await getShipments();
  const idx = shipments.findIndex((s) => s.sessionId === shipment.sessionId);
  const record = {
    ...shipment,
    shippedAt: new Date().toISOString(),
    arrivedAt: null,
  };
  if (idx >= 0) {
    shipments[idx] = record;
  } else {
    shipments.push(record);
  }
  await saveShipments(shipments);
  return record;
}
