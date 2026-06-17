// GET /api/drip/arrival
// Vercel Cron — runs daily at 2pm UTC (see vercel.json)
// For each active shipment (shippedAt set, arrivedAt null), polls Shippo's
// tracking API. When status === "DELIVERED", sends the arrival email and
// marks the shipment as arrived in Vercel Blob.
//
// Manually trigger (dev/prod):
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://nopicnicpress.com/api/drip/arrival

import Stripe from "stripe";
import { Resend } from "resend";
import { getShipments, saveShipments } from "../../../lib/shipments";
import { shipmentArrivalEmail } from "../../../lib/dripEmails";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);

// Map admin carrier names → Shippo tracking API carrier codes
const CARRIER_CODES = {
  USPS: "usps",
  UPS: "ups",
  FedEx: "fedex",
  DHL: "dhl",
};

async function getTrackingStatus(carrier, trackingNumber) {
  const code = CARRIER_CODES[carrier] || carrier?.toLowerCase();
  if (!code || !trackingNumber) return null;

  try {
    const res = await fetch(
      `https://api.goshippo.com/tracks/${code}/${encodeURIComponent(trackingNumber)}`,
      {
        headers: {
          Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
        },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.tracking_status?.status || null;
  } catch (err) {
    console.error(`Tracking lookup failed for ${trackingNumber}:`, err.message);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  if (req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  const allShipments = await getShipments();

  // Only check shipments that have tracking info and haven't been marked arrived
  const active = allShipments.filter(
    (s) => s.trackingNumber && s.carrier && !s.arrivedAt
  );

  const results = { checked: active.length, delivered: 0, errors: 0 };
  let changed = false;

  for (const shipment of active) {
    const status = await getTrackingStatus(shipment.carrier, shipment.trackingNumber);

    if (status !== "DELIVERED") continue;

    let promoCode = null;
    let promoExpiry = null;
    if (process.env.STRIPE_ARRIVAL_COUPON_ID) {
      try {
        const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
        const promo = await stripe.promotionCodes.create({
          coupon: process.env.STRIPE_ARRIVAL_COUPON_ID,
          expires_at: expiresAt,
        });
        promoCode = promo.code;
        promoExpiry = new Date(expiresAt * 1000).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      } catch (err) {
        console.error("Promo code creation failed:", err.message);
      }
    }

    const { error } = await resend.emails.send({
      from: "No Picnic Press <orders@nopicnicpress.com>",
      to: shipment.email,
      subject: "Your No Picnic Press order is arriving today",
      html: shipmentArrivalEmail(
        shipment.firstName,
        shipment.items,
        shipment.trackingUrl || null,
        promoCode,
        promoExpiry
      ),
    });

    if (error) {
      console.error(`Arrival email failed for session ${shipment.sessionId}:`, error);
      results.errors++;
    } else {
      const idx = allShipments.findIndex((s) => s.sessionId === shipment.sessionId);
      if (idx >= 0) {
        allShipments[idx].arrivedAt = new Date().toISOString();
        changed = true;
        results.delivered++;
      }
    }
  }

  if (changed) {
    await saveShipments(allShipments);
  }

  return res.status(200).json(results);
}
