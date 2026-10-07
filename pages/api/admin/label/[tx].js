// Re-opens a label we already bought.
//
// Shippo's label URLs are signed and expire, so nothing stores one. buy-label
// records the transaction ID on the order instead, and this asks Shippo for a
// fresh URL and forwards the browser to it. Being a same-origin link rather
// than a window.open on a cross-origin PDF, it also survives the popup blocker
// that lost the first label.

import { checkAdminAuth } from "../../../../lib/adminAuth";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const { tx } = req.query;
  if (!/^[0-9a-f]{32}$/i.test(tx || "")) return res.status(400).json({ error: "Bad transaction id" });

  const shippoRes = await fetch(`https://api.goshippo.com/transactions/${tx}`, {
    headers: { Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}` },
  });

  if (!shippoRes.ok) {
    const text = await shippoRes.text();
    console.error("Shippo transaction lookup failed:", shippoRes.status, text);
    return res.status(502).json({ error: `Shippo: ${shippoRes.status}` });
  }

  const transaction = await shippoRes.json();
  if (!transaction.label_url) {
    return res.status(404).json({ error: `No label on this transaction (status ${transaction.status})` });
  }

  res.setHeader("Cache-Control", "no-store");
  return res.redirect(302, transaction.label_url);
}
