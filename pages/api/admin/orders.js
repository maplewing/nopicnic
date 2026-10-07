import Stripe from "stripe";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { getOrderNumbers } from "../../../lib/orderNumbers";
import { serveCached } from "../../../lib/adminCache";
import { isFullyRefunded, refundedAmount } from "../../../lib/refunds";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const days = parseInt(req.query.days || "90");

  return serveCached(req, res, {
    name: "orders",
    params: { days },
    build: () => buildOrders(days),
  });
}

async function buildOrders(days) {
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
      expand: ["data.line_items", "data.payment_intent.latest_charge", "data.shipping_cost.shipping_rate"],
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
    .filter((s) => s.payment_status === "paid" && !isFullyRefunded(s))
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
        method: typeof session.shipping_cost?.shipping_rate === "object"
          ? session.shipping_cost.shipping_rate.display_name || null
          : null,
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
      refunded: refundedAmount(session),
      label: session.payment_intent?.metadata?.label_tx ? {
        txId: session.payment_intent.metadata.label_tx,
        trackingNumber: session.payment_intent.metadata.label_tracking || null,
        carrier: session.payment_intent.metadata.label_carrier || null,
        service: session.payment_intent.metadata.label_service || null,
        boughtAt: session.payment_intent.metadata.label_bought_at || null,
      } : null,
      tracking: session.payment_intent?.metadata?.shipped_at ? {
        shippedAt: session.payment_intent.metadata.shipped_at,
        trackingNumber: session.payment_intent.metadata.tracking_number || null,
        carrier: session.payment_intent.metadata.carrier || null,
        trackingUrl: session.payment_intent.metadata.tracking_url || null,
      } : null,
    }));

  // Sort newest first
  orders.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { orders };
}
