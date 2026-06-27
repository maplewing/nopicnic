import Stripe from "stripe";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { getOrderNumbers } from "../../../lib/orderNumbers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const days = parseInt(req.query.days || "90");
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  // Fetch completed checkout sessions
  const sessions = [];
  let hasMore = true;
  let startingAfter;

  while (hasMore) {
    const batch = await stripe.checkout.sessions.list({
      created: { gte: since },
      status: "complete",
      limit: 100,
      expand: ["data.line_items", "data.payment_intent.latest_charge"],
      ...(startingAfter && { starting_after: startingAfter }),
    });
    sessions.push(...batch.data);
    hasMore = batch.has_more;
    startingAfter = batch.data.length ? batch.data[batch.data.length - 1].id : undefined;
    if (!hasMore) break;
  }

  // Get order number mapping
  const { mapping } = await getOrderNumbers();

  const orders = sessions
    .filter((s) => s.payment_status === "paid" && !(s.payment_intent?.latest_charge?.amount_refunded > 0))
    .map((session) => ({
      orderNumber: mapping[session.id] ?? null,
      stripeSessionId: session.id,
      date: new Date(session.created * 1000).toISOString(),
      customer: {
        name: session.customer_details?.name || "",
        email: session.customer_details?.email || "",
      },
      shipping: {
        name: session.shipping_details?.name || "",
        address: session.shipping_details?.address || null,
        method: null, // shipping rate name not available without expand
      },
      items: (session.line_items?.data || []).map((item) => ({
        name: item.description || "",
        quantity: item.quantity,
        amount: (item.amount_total || 0) / 100,
      })),
      subtotal: (session.amount_subtotal || 0) / 100,
      tax: (session.total_details?.amount_tax || 0) / 100,
      shippingCost: (session.shipping_cost?.amount_total || 0) / 100,
      total: (session.amount_total || 0) / 100,
    }));

  // Sort newest first
  orders.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ orders });
}
