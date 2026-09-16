// Every unshipped domestic order as a spreadsheet Pirate Ship can import.
//
// Pirate Ship has no API, but its batch upload takes any CSV with a header row
// and remembers the column mapping after the first import. So this replaces
// copying addresses one at a time with one download and one upload.
//
// International orders are left out on purpose: those get a Shippo label from
// the "Buy label" button, customs form and all.
//
// Email is left out on purpose too. If Pirate Ship has a recipient email it can
// send its own tracking notice, and the customer already gets ours from "Send
// ship email".

import { checkAdminAuth } from "../../../lib/adminAuth";
import { getUnshippedOrders } from "../../../lib/shipments";
import { getOrderNumbers } from "../../../lib/orderNumbers";
import { getTotalWeightOz } from "../../../lib/shippingRates";
import { products } from "../../../data/products";

const COLUMNS = [
  "Order Number",
  "Name",
  "Address Line 1",
  "Address Line 2",
  "City",
  "State",
  "Zip",
  "Country",
  "Weight (oz)",
  "Items",
];

// Packed weight, packaging included — the same figure the checkout quoted
// against. Blank when any item isn't in data/products.js, so Pirate Ship falls
// back to the batch's default weight instead of printing a label that's light.
function packedWeightOz(items) {
  const lines = [];
  for (const item of items) {
    const product = item.priceId && products.find((p) => p.stripePriceId === item.priceId);
    if (!product) return "";
    lines.push({ product, qty: item.quantity });
  }
  const oz = getTotalWeightOz(lines);
  return oz > 0 ? (Math.ceil(oz * 10) / 10).toString() : "";
}

function csvCell(value) {
  const s = String(value ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const [orders, { mapping }] = await Promise.all([
    getUnshippedOrders({ afterDays: 0 }),
    getOrderNumbers(),
  ]);

  const rows = orders
    .filter((o) => o.address && o.country === "US")
    .map((o) => {
      const a = o.address;
      return [
        mapping[o.sessionId] ?? "",
        o.name,
        a.line1,
        a.line2,
        a.city,
        a.state,
        a.postal_code,
        "US",
        packedWeightOz(o.items),
        o.items.map((i) => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join("; "),
      ];
    });

  const csv = [COLUMNS, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  const date = new Date().toISOString().slice(0, 10);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="pirateship-${date}.csv"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(csv);
}
