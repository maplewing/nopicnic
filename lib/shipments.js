// Vercel Blob store for active shipments.
// All records stored as a single JSON array in admin/shipments.json.
// Reads use direct URL construction (no head()/list() ops) to stay within free tier.
// Writes retry once on failure to handle transient errors.
//
// Shape of each record:
//   {
//     sessionId:      string
//     trackingNumber: string|null
//     carrier:        string|null  — "USPS", "UPS", "FedEx", "DHL"
//     trackingUrl:    string|null
//     email:          string
//     firstName:      string
//     items:          array
//     shippedAt:      ISO string
//     arrivedAt:      ISO string|null
//   }

import { put } from "@vercel/blob";

const BLOB_KEY = "admin/shipments.json";

function blobUrl(pathname) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const storeId = token.match(/vercel_blob_rw_([^_]+)/)?.[1]?.toLowerCase() || "";
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

async function fetchBlob(pathname) {
  const res = await fetch(blobUrl(pathname), {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function getShipments() {
  try {
    const data = await fetchBlob(BLOB_KEY);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function saveShipments(shipments) {
  await put(BLOB_KEY, JSON.stringify(shipments), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// Adds a new shipment or overwrites an existing one by sessionId.
// Retries the blob write once on failure.
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
  try {
    await saveShipments(shipments);
  } catch {
    await new Promise((r) => setTimeout(r, 500));
    await saveShipments(shipments);
  }
  return record;
}
