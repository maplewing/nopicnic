// GET  /api/admin/shipments — returns all shipment records
// POST /api/admin/shipments — marks an order as shipped:
//   1. Looks up the Stripe session to get customer/items
//   2. Sends the shipping confirmation + welcome email via Resend
//   3. Saves the shipment to Vercel Blob for arrival cron tracking
//
// Body for POST:
//   { sessionId, trackingNumber?, carrier?, trackingUrl? }

import Stripe from "stripe";
import { Resend } from "resend";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { addShipment, getShipments } from "../../../lib/shipments";
import { shippingConfirmationEmail } from "../../../lib/dripEmails";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const shipments = await getShipments();
    return res.status(200).json({ shipments });
  }

  if (req.method === "POST") {
    const { sessionId, trackingNumber, carrier, trackingUrl } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    let session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["line_items"],
      });
    } catch (err) {
      console.error("Stripe retrieve error:", err.message);
      return res.status(404).json({ error: "Session not found" });
    }

    const email = session.customer_details?.email;
    if (!email) return res.status(400).json({ error: "No email on session" });

    const firstName = session.customer_details?.name?.split(" ")[0] || "there";
    const items = (session.line_items?.data || []).map((i) => i.description);

    const { error } = await resend.emails.send({
      from: "No Picnic Press <orders@nopicnicpress.com>",
      to: email,
      subject: "Your No Picnic Press order is on its way",
      html: shippingConfirmationEmail(
        firstName,
        items,
        trackingNumber || null,
        trackingUrl || null,
        carrier || null
      ),
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ error: "Failed to send email" });
    }

    const record = await addShipment({
      sessionId,
      trackingNumber: trackingNumber || null,
      carrier: carrier || null,
      trackingUrl: trackingUrl || null,
      email,
      firstName,
      items,
    });

    return res.status(200).json({ ok: true, shipment: record });
  }

  return res.status(405).end();
}
