// GET /api/drip/arrival
// Vercel Cron — runs daily at 2pm UTC (see vercel.json)
// For each shipped order that hasn't been marked arrived, polls Shippo's
// tracking API. When status === "DELIVERED", sends the arrival email and
// stamps arrived_at on the PaymentIntent so it is never sent twice.
//
// Shippo serves tracking only to accounts with a payment method on file, even
// though rate lookups are free. Without one every lookup 401s with "Your account
// needs to have a valid payment method on file to use this service", nothing is
// ever seen as delivered, and no mail goes out. The response reports those
// failures under `trackingUnavailable` rather than swallowing them, so this is
// distinguishable from a genuinely quiet day.
// Fix at https://goshippo.com/user/billing/
//
// Manually trigger (dev/prod):
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        https://nopicnicpress.com/api/drip/arrival

import Stripe from "stripe";
import { Resend } from "resend";
import { getActiveShipments, markArrived } from "../../../lib/shipments";
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

// Returns { status } on a successful lookup, or { unavailable: reason } when the
// carrier or Shippo couldn't tell us. The two are very different: the first means
// "not delivered yet", the second means this job cannot do its work at all.
async function getTrackingStatus(carrier, trackingNumber) {
  const code = CARRIER_CODES[carrier] || carrier?.toLowerCase();
  if (!code || !trackingNumber) return { unavailable: "missing carrier or tracking number" };

  try {
    const res = await fetch(
      `https://api.goshippo.com/tracks/${code}/${encodeURIComponent(trackingNumber)}`,
      { headers: { Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}` } }
    );
    if (!res.ok) return { unavailable: `Shippo HTTP ${res.status}` };
    const data = await res.json();
    return { status: data.tracking_status?.status || null };
  } catch (err) {
    return { unavailable: err.message };
  }
}

async function createArrivalPromo() {
  if (!process.env.STRIPE_ARRIVAL_COUPON_ID) return { promoCode: null, promoExpiry: null };
  try {
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
    const promo = await stripe.promotionCodes.create({
      coupon: process.env.STRIPE_ARRIVAL_COUPON_ID,
      expires_at: expiresAt,
    });
    return {
      promoCode: promo.code,
      promoExpiry: new Date(expiresAt * 1000).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };
  } catch (err) {
    console.error("Promo code creation failed:", err.message);
    return { promoCode: null, promoExpiry: null };
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  if (req.headers["authorization"] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).end();
  }

  let active;
  try {
    active = await getActiveShipments();
  } catch (err) {
    console.error("Could not load active shipments:", err.message);
    return res.status(500).json({ error: "Failed to load shipments" });
  }

  const results = {
    checked: active.length,
    delivered: 0,
    errors: 0,
    trackingUnavailable: 0,
  };
  const unavailableReasons = new Set();

  for (const shipment of active) {
    const tracking = await getTrackingStatus(shipment.carrier, shipment.trackingNumber);

    if (tracking.unavailable) {
      results.trackingUnavailable++;
      unavailableReasons.add(tracking.unavailable);
      continue;
    }
    if (tracking.status !== "DELIVERED") continue;

    const { promoCode, promoExpiry } = await createArrivalPromo();

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
      continue;
    }

    // Stamp immediately. Batching this to the end of the loop is what would let
    // a mid-run failure re-send to everyone already emailed.
    try {
      await markArrived(shipment.paymentIntentId);
      results.delivered++;
    } catch (err) {
      console.error(`Could not mark ${shipment.sessionId} arrived:`, err.message);
      results.errors++;
    }
  }

  if (results.trackingUnavailable > 0) {
    results.trackingUnavailableReasons = [...unavailableReasons];
    console.error(
      `Arrival drip: ${results.trackingUnavailable} tracking lookups failed —`,
      [...unavailableReasons].join("; ")
    );
  }

  return res.status(200).json(results);
}
