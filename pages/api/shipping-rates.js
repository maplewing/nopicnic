// Returns the shipping options shown on /checkout.
// Rate logic lives in lib/shippingRates.js so /api/checkout can re-verify the
// customer's choice against the same source before charging them.

import { getRates, validateCart } from "../../lib/shippingRates";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { address, items } = req.body;
  if (!address?.country) return res.status(400).json({ error: "Missing address" });

  const cart = validateCart(items);
  if (cart.error) {
    return res.status(400).json({ error: cart.error, itemId: cart.errorItemId ?? null });
  }

  try {
    const rates = await getRates({
      country: address.country,
      zip: address.zip,
      lines: cart.lines,
    });
    return res.json({ rates });
  } catch (err) {
    console.error("Shipping rate error:", err.message);
    return res.status(502).json({ error: "Could not fetch shipping rates" });
  }
}
