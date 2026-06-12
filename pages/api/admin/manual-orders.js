import { checkAdminAuth } from "../../../lib/adminAuth";
import {
  getManualOrders,
  createManualOrder,
  deleteManualOrder,
} from "../../../lib/manualOrders";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const orders = await getManualOrders();
    return res.status(200).json({ orders });
  }

  if (req.method === "POST") {
    const { date, recipient, items, tracking, carrier, via, shippingCost, notes } = req.body;
    if (!date || !recipient?.name || !items?.length) {
      return res.status(400).json({ error: "date, recipient.name, and items are required" });
    }
    const order = await createManualOrder({ date, recipient, items, tracking, carrier, via, shippingCost, notes });
    return res.status(201).json({ order });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "id is required" });
    await deleteManualOrder(id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
