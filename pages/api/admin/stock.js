import { checkAdminAuth } from "../../../lib/adminAuth";
import { getStockLevels, setStockLevel } from "../../../lib/stock";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const stock = await getStockLevels();
    return res.status(200).json({ stock });
  }

  if (req.method === "POST") {
    const { productId, qty } = req.body || {};
    if (!productId || typeof qty !== "number") {
      return res.status(400).json({ error: "productId and qty (number) required" });
    }
    await setStockLevel(productId, qty);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
