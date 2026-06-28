// Vercel Blob store for shipments.
// Each shipment is stored as its own file:
//   admin/shipments/{sessionId}.json
//
// This avoids the read-modify-write race condition of a shared JSON array.
// Each write is a single atomic PUT with strong read-after-write consistency.
//
// Legacy records in admin/shipments.json are still read and merged in.
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

import { put, list } from "@vercel/blob";

const SHIPMENT_PATH = (sessionId) => `admin/shipments/${sessionId}.json`;

export async function getShipments() {
  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;

    const fetchUrl = (url) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

    // List all blobs under "admin/shipments" — catches both individual files
    // (admin/shipments/{sessionId}.json) and the legacy array (admin/shipments.json).
    const { blobs } = await list({ prefix: "admin/shipments", token });

    const legacyBlob = blobs.find((b) => b.pathname === "admin/shipments.json");
    const individualBlobs = blobs.filter(
      (b) => b.pathname.startsWith("admin/shipments/") && b.pathname.endsWith(".json")
    );

    // Fetch all individual shipments in parallel
    const individual = (await Promise.all(individualBlobs.map((b) => fetchUrl(b.url)))).filter(Boolean);

    // Merge legacy records not yet represented as individual files
    const legacyData = legacyBlob ? await fetchUrl(legacyBlob.url) : null;
    const legacyArr = Array.isArray(legacyData) ? legacyData : [];
    const seen = new Set(individual.map((s) => s.sessionId));

    return [...individual, ...legacyArr.filter((s) => !seen.has(s.sessionId))];
  } catch {
    return [];
  }
}

// Single atomic PUT — no read required, no race condition.
export async function addShipment(shipment) {
  const record = {
    ...shipment,
    shippedAt: new Date().toISOString(),
    arrivedAt: null,
  };
  await put(SHIPMENT_PATH(shipment.sessionId), JSON.stringify(record), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return record;
}
