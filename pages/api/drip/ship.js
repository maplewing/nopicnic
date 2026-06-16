// POST /api/drip/ship
// Admin-only. Sends the shipping confirmation + welcome email for a specific
// Stripe checkout session. Call this when you ship an order.
//
// This fulfills the promise made in the order confirmation:
//   "We'll send a tracking number when your order ships."
//
// Body:
//   {
//     "sessionId":      "cs_live_...",     // Stripe checkout session ID (required)
//     "trackingNumber": "9400111899...",   // optional but recommended
//     "trackingUrl":    "https://...",     // optional
//     "carrier":        "USPS"            // optional — shown as label prefix
//   }
//
// Usage:
//   curl -X POST https://nopicnicpress.com/api/drip/ship \
//     -H "Cookie: npp-admin-session=<token>" \
//     -H "Content-Type: application/json" \
//     -d '{"sessionId":"cs_live_abc123","trackingNumber":"9400111...","carrier":"USPS"}'

import Stripe from "stripe";
import { Resend } from "resend";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { shippingConfirmationEmail } from "../../../lib/dripEmails";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId, trackingNumber, trackingUrl, carrier } = req.body || {};

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch (err) {
    console.error("Stripe session retrieve error:", err.message);
    return res.status(404).json({ error: "Session not found" });
  }

  const toEmail = session.customer_details?.email;
  if (!toEmail) {
    return res.status(400).json({ error: "No email on this session" });
  }

  const firstName = session.customer_details?.name?.split(" ")[0] || "there";
  const items = (session.line_items?.data || []).map((i) => i.description);

  const { error } = await resend.emails.send({
    from: "No Picnic Press <orders@nopicnicpress.com>",
    to: toEmail,
    subject: "Your order is on its way",
    html: shippingConfirmationEmail(
      firstName,
      items,
      trackingNumber || null,
      trackingUrl || null,
      carrier || null
    ),
  });

  if (error) {
    console.error("Resend send error:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }

  return res.status(200).json({ ok: true, to: toEmail, firstName, items });
}
