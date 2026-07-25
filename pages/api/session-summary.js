// Order details for the /success page, plus the values the Meta pixel needs.
// The session id is only known to whoever just completed the checkout, which is
// what gates this — the same model as Stripe's own hosted receipt.

import Stripe from "stripe";
import { products } from "../../data/products";
import { assignOrderNumber } from "../../lib/orderNumbers";

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

    const lineItems = session.line_items?.data || [];

    const contentIds = lineItems
      .map((item) => {
        const match = products.find((p) => p.stripePriceId === item.price?.id);
        return match?.id || item.price?.id;
      })
      .filter(Boolean);

    // The webhook assigns this too. assignOrderNumber is idempotent, so whichever
    // gets there first wins and both see the same number — the page doesn't have
    // to wait on the webhook to show the customer their order number.
    let orderNumber = null;
    if (session.status === "complete" && session.payment_status === "paid") {
      try {
        orderNumber = await assignOrderNumber(session.id);
      } catch (err) {
        console.error("Order number lookup failed on success page:", err.message);
      }
    }

    const addr = session.shipping_details?.address;

    return res.json({
      total: (session.amount_total || 0) / 100,
      currency: (session.currency || "usd").toUpperCase(),
      contentIds,
      orderNumber,
      email: session.customer_details?.email || null,
      items: lineItems.map((i) => ({
        name: i.description,
        quantity: i.quantity,
        amount: (i.amount_total || 0) / 100,
      })),
      subtotal: (session.amount_subtotal || 0) / 100,
      shippingCost:
        session.shipping_cost?.amount_total != null
          ? session.shipping_cost.amount_total / 100
          : null,
      tax:
        session.total_details?.amount_tax != null
          ? session.total_details.amount_tax / 100
          : null,
      discount: session.total_details?.amount_discount
        ? session.total_details.amount_discount / 100
        : null,
      shippingAddress: addr
        ? {
            name: session.shipping_details?.name || null,
            line1: addr.line1,
            line2: addr.line2 || null,
            city: addr.city,
            state: addr.state || null,
            postalCode: addr.postal_code,
            country: addr.country,
          }
        : null,
      hasDigital: lineItems.some((item) => {
        const match = products.find((p) => p.stripePriceId === item.price?.id);
        return Boolean(match?.isDigital);
      }),
    });
  } catch (err) {
    console.error("session-summary error:", err.message);
    return res.status(500).json({ error: "Could not retrieve session" });
  }
}
