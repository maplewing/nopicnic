// GET /api/drip/unshipped
// Vercel Cron — runs daily at 16:00 UTC / 9am Pacific (see vercel.json).
//
// The only email in this directory that goes to us instead of a customer:
// a digest of paid orders carrying something physical that still have no label
// three days on. It exists because an order that quietly fails to ship produces
// no signal anywhere — the customer waits, the admin looks normal, and the first
// thing that speaks up is the review request ten days later, asking how they
// liked a book that never left.
//
// Sends nothing when nothing is late, so an empty inbox means an empty queue.
// An order drops off the list by shipping or by being refunded; until then it
// reappears every morning, which is deliberate — a single day-3 alert can be
// missed exactly the way the order was.
//
// Manually trigger (dev/prod):
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://nopicnicpress.com/api/drip/unshipped

import { Resend } from "resend";
import { getUnshippedOrders, ALERT_AFTER_DAYS } from "../../../lib/shipments";
import { getOrderNumbers } from "../../../lib/orderNumbers";

const resend = new Resend(process.env.RESEND_API_KEY);

const escape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function formatOrder(order, orderNumber) {
  const heading = `${orderNumber ? `#${orderNumber}` : order.sessionId} — ${
    order.ageDays
  } day${order.ageDays === 1 ? "" : "s"} old`;

  const items = order.items
    .map((i) => `  ${i.name}${i.quantity > 1 ? ` × ${i.quantity}` : ""}`)
    .join("\n");

  const addr = order.address;
  const shipTo = addr
    ? `  ${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}, ${addr.city}, ${
        addr.state || ""
      } ${addr.postal_code}, ${addr.country}`
    : "  (no shipping address on the order)";

  return escape(
    `${heading}
${order.name || order.email} <${order.email}> · $${order.total.toFixed(2)}
${items}
${shipTo}`
  );
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  if (req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let orders;
  try {
    orders = await getUnshippedOrders();
  } catch (err) {
    console.error("Could not load unshipped orders:", err.message);
    return res.status(500).json({ error: "Failed to load orders" });
  }

  if (orders.length === 0) {
    return res.status(200).json({ unshipped: 0, sent: false });
  }

  // Order numbers are what the admin panel and the customer's confirmation email
  // both show, so the digest speaks the same language. A missing number is not
  // worth failing over — the session ID still identifies the order.
  let mapping = {};
  try {
    ({ mapping } = await getOrderNumbers());
  } catch (err) {
    console.error("Could not load order numbers:", err.message);
  }

  const oldest = Math.max(...orders.map((o) => o.ageDays));
  const body = orders
    .map((order) => formatOrder(order, mapping[order.sessionId] ?? null))
    .join("\n\n");

  const { error } = await resend.emails.send({
    from: "No Picnic Press <orders@nopicnicpress.com>",
    to: "hi@nopicnicpress.com",
    subject: `📦 ${orders.length} order${orders.length === 1 ? "" : "s"} still unshipped — oldest ${oldest} days`,
    html: `<pre style="font-family:monospace;font-size:14px;line-height:1.6;">
No label yet, ${ALERT_AFTER_DAYS}+ days after the order came in:

${body}

Mark them shipped at https://nopicnicpress.com/admin — this list repeats daily
until each one ships or is refunded.
</pre>`,
  });

  if (error) {
    console.error("Unshipped digest failed to send:", error);
    return res.status(500).json({ unshipped: orders.length, sent: false, error: "Send failed" });
  }

  return res.status(200).json({
    unshipped: orders.length,
    oldestDays: oldest,
    sent: true,
  });
}
