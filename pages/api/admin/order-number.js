import { checkAdminAuth } from "../../../lib/adminAuth";
import { getOrderNumbers } from "../../../lib/orderNumbers";
import { put } from "@vercel/blob";

const ORDER_NUMBERS_PATH = "admin/order-numbers.json";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const { sessionId, orderNumber, nextOrderNumber } = req.body || {};
  if (sessionId === undefined && nextOrderNumber === undefined) {
    return res.status(400).json({ error: "sessionId or nextOrderNumber required" });
  }

  const data = await getOrderNumbers();
  if (sessionId !== undefined && orderNumber !== undefined) {
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

  return res.status(200).json({ ok: true, nextOrderNumber: data.nextOrderNumber, mapping: sessionId ? { [sessionId]: data.mapping[sessionId] } : undefined });
}
