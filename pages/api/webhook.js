// Stripe webhook handler
// On checkout.session.completed:
//   1. Sends order confirmation email via Resend
//   2. Creates/updates Loops contact and fires a "purchase" event
//      → triggers your Day 3 / Day 14 / Day 30 drip loop in Loops
//
// Setup:
//   1. Add STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, LOOPS_API_KEY to .env.local
//   2. In Stripe dashboard → Developers → Webhooks, add endpoint:
//        https://nopicnicpress.com/api/webhook
//      Select event: checkout.session.completed
//   3. Copy the signing secret (whsec_...) → STRIPE_WEBHOOK_SECRET
//   4. Verify nopicnicpress.com domain in Resend before going live.
//   5. In Loops, create a Loop triggered by the "purchase" event.
//      For local testing use: stripe listen --forward-to localhost:3000/api/webhook

import Stripe from "stripe";
import { Resend } from "resend";
import { orderConfirmationEmail } from "../../lib/orderEmail";
import { createDownloadToken } from "../../lib/downloadToken";
import { products } from "../../data/products";
import { assignOrderNumber } from "../../lib/orderNumbers";
import { decrementStock } from "../../lib/stock";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Raw body is required for Stripe signature verification.
export const config = {
  api: { bodyParser: false },
};

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const buf = await getRawBody(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    try {
      const session = await stripe.checkout.sessions.retrieve(
        event.data.object.id,
        { expand: ["line_items", "line_items.data.price.product"] }
      );

      // Assign a sequential order number (starting at #2684)
      let orderNumber = null;
      try {
        orderNumber = await assignOrderNumber(session.id);
      } catch (numErr) {
        console.error("Order number assignment failed:", numErr.message);
      }

      const toEmail = session.customer_details?.email;
      if (!toEmail) {
        console.warn("No customer email on session:", session.id);
        return res.status(200).json({ received: true });
      }

      // Build download links for any digital products in the order
      const siteUrl = process.env.NEXT_PUBLIC_URL || "https://nopicnicpress.com";
      const downloadLinks = [];

      for (const item of session.line_items?.data || []) {
        const stripePriceId = item.price?.id;
        const product = products.find((p) => p.stripePriceId === stripePriceId);
        if (product?.isDigital && product?.formats?.length) {
          const token = createDownloadToken(product.slug, toEmail);
          downloadLinks.push({
            name: product.name,
            formats: product.formats.map((format) => ({
              format,
              url: `${siteUrl}/api/download?token=${token}&format=${format}`,
            })),
          });
        }
      }

      // Decrement stock for physical products in this order
      for (const item of session.line_items?.data || []) {
        const stripePriceId = item.price?.id;
        const product = products.find((p) => p.stripePriceId === stripePriceId);
        if (product && !product.isDigital && !product.isService) {
          await decrementStock(product.id, item.quantity ?? 1).catch((err) =>
            console.error("Stock decrement error:", err)
          );
        }
      }

      const { error } = await resend.emails.send({
        from: "No Picnic Press <orders@nopicnicpress.com>",
        to: toEmail,
        subject: "Your No Picnic Press order is confirmed",
        html: orderConfirmationEmail(session, downloadLinks, orderNumber),
      });

      if (error) {
        console.error("Resend error for session", session.id, error);
      }

      // Admin notification
      const itemLines = (session.line_items?.data || [])
        .map((i) => `${i.description}${i.quantity > 1 ? ` × ${i.quantity}` : ""} — $${(i.amount_total / 100).toFixed(2)}`)
        .join("<br>");
      const addr = session.shipping_details?.address;
      const addrLine = addr
        ? `${addr.line1}${addr.line2 ? ", " + addr.line2 : ""}, ${addr.city}, ${addr.state} ${addr.postal_code}, ${addr.country}`
        : "Digital / no shipping address";
      const shippingLabel = session.shipping_cost?.amount_total != null
        ? `$${(session.shipping_cost.amount_total / 100).toFixed(2)}`
        : "—";
      await resend.emails.send({
        from: "No Picnic Press <orders@nopicnicpress.com>",
        to: "hi@nopicnicpress.com",
        subject: `New order${orderNumber ? ` #${orderNumber}` : ""} — ${session.customer_details?.name || toEmail}`,
        html: `<pre style="font-family:monospace;font-size:14px;line-height:1.6;">
New order${orderNumber ? ` #${orderNumber}` : ""}

Customer: ${session.customer_details?.name || ""} &lt;${toEmail}&gt;
Total:    $${(session.amount_total / 100).toFixed(2)} (shipping ${shippingLabel})

${itemLines}

Ship to:
${addrLine}
</pre>`,
      });

      // Add to Loops — only subscribe and trigger drip if customer opted in (GDPR)
      const firstName = session.customer_details?.name?.split(" ")[0] || "";
      const optedIn = false; // marketing consent checkbox removed from checkout
      try {
        await fetch("https://app.loops.so/api/v1/contacts/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
          },
          body: JSON.stringify({
            email: toEmail,
            firstName,
            subscribed: optedIn,
            userGroup: "customer",
          }),
        });

        // Only fire purchase drip event if they opted in to marketing
        if (optedIn) {
          await fetch("https://app.loops.so/api/v1/events/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
            },
            body: JSON.stringify({
              email: toEmail,
              eventName: "purchase",
            }),
          });
        }
      } catch (loopsErr) {
        console.error("Loops error for session", session.id, loopsErr);
      }
    } catch (err) {
      console.error("Error processing checkout.session.completed:", err);
    }
  }

  // Always return 200 so Stripe doesn't retry.
  res.status(200).json({ received: true });
}
