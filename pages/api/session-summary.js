import Stripe from "stripe";
import { products } from "../../data/products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  const { session_id } = req.query;

  if (!session_id || !String(session_id).startsWith("cs_")) {
    return res.status(400).json({ error: "Invalid session_id" });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items"],
    });

    const contentIds = (session.line_items?.data || [])
      .map((item) => {
        const match = products.find((p) => p.stripePriceId === item.price?.id);
        return match?.id || item.price?.id;
      })
      .filter(Boolean);

    return res.json({
      total: (session.amount_total || 0) / 100,
      currency: (session.currency || "usd").toUpperCase(),
      contentIds,
    });
  } catch (err) {
    console.error("session-summary error:", err.message);
    return res.status(500).json({ error: "Could not retrieve session" });
  }
}
