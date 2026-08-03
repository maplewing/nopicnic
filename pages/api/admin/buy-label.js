import Stripe from "stripe";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { products } from "../../../data/products";
import { getTotalWeightOz } from "../../../lib/shippingRates";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ORIGIN = {
  name: "No Picnic Press",
  street1: "1715 9th St.",
  city: "Berkeley",
  state: "CA",
  zip: process.env.NPP_ORIGIN_ZIP || "94710",
  country: "US",
};

// Maps the display_name we set in Stripe → EasyPost service token
const SERVICE_TOKEN = {
  "UPS Worldwide Economy":     "UPSWorldwideEconomyDDU",
  "UPS Worldwide Expedited":   "Expedited",
  "UPS Worldwide Saver":       "UPSSaver",
  "UPS Worldwide Express":     "Express",
  "UPS Worldwide Express Plus":"ExpressPlus",
  "UPS Standard":              "UPSStandard",
};

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const { stripeSessionId } = req.body;
  if (!stripeSessionId) return res.status(400).json({ error: "Missing stripeSessionId" });

  // Re-fetch session to get address and items
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
    expand: ["line_items", "line_items.data.price", "shipping_cost.shipping_rate"],
  });

  const address = session.shipping_details?.address;
  const recipientName = session.shipping_details?.name;
  if (!address || !recipientName) {
    return res.status(400).json({ error: "Order has no shipping address" });
  }
  if (address.country === "US") {
    return res.status(400).json({ error: "Buy label is for international orders only" });
  }

  // Build physical line items to calculate weight
  const lines = (session.line_items?.data || []).flatMap((item) => {
    const product = products.find((p) => p.stripePriceId === item.price?.id);
    if (!product || product.isDigital || product.isService) return [];
    return [{ product, qty: item.quantity }];
  });

  if (lines.length === 0) {
    return res.status(400).json({ error: "No physical items found in order" });
  }

  const weightOz = getTotalWeightOz(lines);

  // Which service did the customer select?
  const displayName = typeof session.shipping_cost?.shipping_rate === "object"
    ? session.shipping_cost.shipping_rate.display_name
    : null;
  const targetService = displayName ? SERVICE_TOKEN[displayName] : null;

  const auth = Buffer.from(`${process.env.EASYPOST_API_KEY}:`).toString("base64");

  // Build customs items from physical line items
  const customsItems = lines.map((l) => ({
    description: l.product.name,
    quantity: l.qty,
    weight: parseFloat(((l.product.productWeightOz || 14) * l.qty).toFixed(2)),
    value: parseFloat((l.product.price * l.qty).toFixed(2)),
    currency: "USD",
    origin_country: "US",
    hs_tariff_number: "490110",  // Printed books
  }));

  // Create EasyPost shipment with full recipient address and customs
  const epShipRes = await fetch("https://api.easypost.com/v2/shipments", {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      shipment: {
        from_address: ORIGIN,
        to_address: {
          name: recipientName,
          street1: address.line1,
          ...(address.line2 ? { street2: address.line2 } : {}),
          city: address.city,
          ...(address.state ? { state: address.state } : {}),
          ...(address.postal_code ? { zip: address.postal_code } : {}),
          country: address.country,
        },
        parcel: { length: 12, width: 9, height: 2, weight: weightOz },
        customs_info: {
          eel_pfc: "NOEEI 30.37(a)",
          customs_certify: true,
          customs_signer: "Eli Altman",
          contents_type: "merchandise",
          restriction_type: "none",
          non_delivery_option: "return",
          customs_items: customsItems,
        },
      },
    }),
  });

  if (!epShipRes.ok) {
    const text = await epShipRes.text();
    console.error("EasyPost shipment error:", text);
    let detail = text;
    try { detail = JSON.parse(text)?.error?.message || text; } catch {}
    return res.status(502).json({ error: `EasyPost (create shipment): ${detail}` });
  }

  const shipment = await epShipRes.json();
  const allRates = (shipment.rates || [])
    .filter((r) => (r.carrier === "UPS" || r.carrier === "UPSDAP") && r.rate)
    .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

  if (allRates.length === 0) {
    return res.status(502).json({ error: "No UPS rates available for this shipment" });
  }

  // Prefer the service the customer paid for; fall back to cheapest UPS rate
  const rate = (targetService && allRates.find((r) => r.service === targetService)) || allRates[0];

  // Purchase the label
  const epBuyRes = await fetch(`https://api.easypost.com/v2/shipments/${shipment.id}/buy`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rate: { id: rate.id } }),
  });

  if (!epBuyRes.ok) {
    const text = await epBuyRes.text();
    console.error("EasyPost buy error:", text);
    let detail = text;
    try { detail = JSON.parse(text)?.error?.message || text; } catch {}
    return res.status(502).json({ error: `EasyPost (buy label): ${detail}` });
  }

  const bought = await epBuyRes.json();

  return res.status(200).json({
    labelUrl: bought.postage_label?.label_url,
    trackingNumber: bought.tracking_code,
    carrier: "UPS",
    service: displayName || rate.service,
    rate: rate.rate,
    currency: (rate.currency || "USD").toUpperCase(),
  });
}
