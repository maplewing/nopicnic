// GET  /api/admin/shipments — returns all shipment records
// POST /api/admin/shipments — marks an order as shipped:
//   1. Looks up the Stripe session to get customer/items
//   2. Sends the shipping confirmation + welcome email via Resend
//   3. Saves the shipment to Vercel Blob for arrival cron tracking
//
// Body for POST:
//   { sessionId, trackingNumber?, carrier?, trackingUrl?, recordOnly? }
//   recordOnly=true  — write the shipment record without sending email

import Stripe from "stripe";
import { Resend } from "resend";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { addShipment, getShipments } from "../../../lib/shipments";
import { shippingConfirmationEmail } from "../../../lib/dripEmails";
import { products } from "../../../data/products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    const shipments = await getShipments();
    return res.status(200).json({ shipments });
  }

  if (req.method === "POST") {
    try {
    const { sessionId, trackingNumber, carrier, trackingUrl, recordOnly } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });
    console.log("Ship request:", { sessionId, trackingNumber, carrier, recordOnly });

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
    const items = (session.line_items?.data || []).map((lineItem) => {
      const name = lineItem.description;
      const match = products.find((p) => name.toLowerCase().includes(p.name.toLowerCase()));
      return {
        name,
        image: match?.images?.[0] ? `https://nopicnicpress.com${match.images[0]}` : null,
      };
    });

    if (recordOnly) {
      // Just save the record — don't send another email.
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

    let recentPosts = [];
    try {
      const wpRes = await fetch(
        "https://www.ahundredmonkeys.com/wp-json/wp/v2/posts?per_page=2&orderby=date&order=desc&_embed=wp:featuredmedia&author=5"
      );
      if (wpRes.ok) {
        const posts = await wpRes.json();
        recentPosts = posts.map((p) => ({
          title: p.title?.rendered?.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, "&").replace(/&quot;/g, '"') || "",
          link: p.link,
          image: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null,
        }));
      }
    } catch (_) {}

    const suggestedProducts = products
      .filter((p) => p.inStock && !p.isService && !items.some((i) => (typeof i === "string" ? i : i.name).toLowerCase().includes(p.name.toLowerCase())))
      .slice(0, 2)
      .map((p) => ({
        name: p.name,
        subtitle: p.subtitle || null,
        slug: p.slug,
        image: p.images?.[0] ? `https://nopicnicpress.com${p.images[0]}` : null,
      }));

    const { error } = await resend.emails.send({
      from: "No Picnic Press <orders@nopicnicpress.com>",
      to: email,
      subject: "Your No Picnic Press order is on its way",
      html: shippingConfirmationEmail(
        firstName,
        items,
        trackingNumber || null,
        trackingUrl || null,
        carrier || null,
        recentPosts,
        suggestedProducts
      ),
    });

    if (error) {
      console.error("Resend error:", error);
      return res.status(500).json({ error: "Failed to send email" });
    }

    // Email sent — record the shipment. If blob write fails, log it but
    // don't return an error (email already went out; retrying would resend).
    let record = null;
    try {
      record = await addShipment({
        sessionId,
        trackingNumber: trackingNumber || null,
        carrier: carrier || null,
        trackingUrl: trackingUrl || null,
        email,
        firstName,
        items,
      });
    } catch (blobErr) {
      console.error("Shipment record save failed (email was sent):", blobErr.message);
    }

    return res.status(200).json({ ok: true, shipment: record });
    } catch (err) {
      console.error("Shipment handler error:", err.message);
      return res.status(500).json({ error: err.message || "Internal error" });
    }
  }

  return res.status(405).end();
}
