import { checkAdminAuth } from "../../../lib/adminAuth";
import { getOrderNumbers } from "../../../lib/orderNumbers";
import { put } from "@vercel/blob";

const ORDER_NUMBERS_PATH = "admin/order-numbers.json";

// POST body:
//   { assignments: { [sessionId]: orderNumber, ... }, nextOrderNumber?: number }
// OR legacy single-assignment:
//   { sessionId, orderNumber, nextOrderNumber? }
export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const data = await getOrderNumbers();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ nextOrderNumber: data.nextOrderNumber, mapping: data.mapping });
  }

  if (req.method !== "POST") return res.status(405).end();

  const { sessionId, orderNumber, nextOrderNumber, assignments } = req.body || {};

  const data = await getOrderNumbers();

  // Bulk assignments (single read-write cycle — no race conditions)
  if (assignments && typeof assignments === "object") {
    for (const [sid, num] of Object.entries(assignments)) {
      data.mapping[sid] = Number(num);
    }
  } else if (sessionId !== undefined && orderNumber !== undefined) {
    data.mapping[sessionId] = Number(orderNumber);
  }

  if (nextOrderNumber !== undefined) {
    data.nextOrderNumber = Number(nextOrderNumber);
  }

  await put(ORDER_NUMBERS_PATH, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return res.status(200).json({ ok: true, nextOrderNumber: data.nextOrderNumber });
}
