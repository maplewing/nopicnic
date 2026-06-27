import { checkAdminAuth } from "../../../lib/adminAuth";
import { getOrderNumbers } from "../../../lib/orderNumbers";
import { put } from "@vercel/blob";

const ORDER_NUMBERS_PATH = "admin/order-numbers.json";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const { sessionId, orderNumber } = req.body || {};
  if (!sessionId || !orderNumber) {
    return res.status(400).json({ error: "sessionId and orderNumber required" });
  }

  const data = await getOrderNumbers();
  data.mapping[sessionId] = Number(orderNumber);
  // Don't bump nextOrderNumber — we're assigning a specific number manually.
  await put(ORDER_NUMBERS_PATH, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return res.status(200).json({ ok: true, sessionId, orderNumber: Number(orderNumber) });
}
