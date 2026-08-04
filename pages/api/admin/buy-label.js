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

// Maps Stripe display_name → Shippo servicelevel token (USPS only; UPS matched by name).
const SERVICE_TOKEN = {
  "USPS First Class International":           "usps_first_class_package_international_service",
  "USPS Priority Mail International":         "usps_priority_mail_international",
  "USPS Priority Mail Express International": "usps_priority_mail_express_international",
};

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).end();

  const { stripeSessionId } = req.body;
  if (!stripeSessionId) return res.status(400).json({ error: "Missing stripeSessionId" });

  const session = await stripe.checkout.sessions.retrieve(stripeSessionId, {
    expand: ["line_items", "line_items.data.price", "shipping_cost.shipping_rate"],
  });

  const address = session.shipping_details?.address;
  const recipientName = session.shipping_details?.name;
  if (!address || !recipientName) return res.status(400).json({ error: "Order has no shipping address" });
  if (address.country === "US") return res.status(400).json({ error: "Buy label is for international orders only" });

  const lines = (session.line_items?.data || []).flatMap((item) => {
    const product = products.find((p) => p.stripePriceId === item.price?.id);
    if (!product || product.isDigital || product.isService) return [];
    return [{ product, qty: item.quantity }];
  });
  if (lines.length === 0) return res.status(400).json({ error: "No physical items found in order" });

  const weightOz = getTotalWeightOz(lines);

  const displayName = typeof session.shipping_cost?.shipping_rate === "object"
    ? session.shipping_cost.shipping_rate.display_name
    : null;
  const targetService = displayName ? SERVICE_TOKEN[displayName] : null;

  const customsItems = lines.map((l) => ({
    description: l.product.name,
    quantity: l.qty,
    net_weight: parseFloat(((l.product.productWeightOz || 14) * l.qty / 16).toFixed(4)),
    mass_unit: "lb",
    value_amount: parseFloat((l.product.price * l.qty).toFixed(2)).toString(),
    value_currency: "USD",
    origin_country: "US",
    tariff_number: "490110",
  }));

  const shippoRes = await fetch("https://api.goshippo.com/shipments/", {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_from: ORIGIN,
      address_to: {
        name: recipientName,
        street1: address.line1,
        ...(address.line2 ? { street2: address.line2 } : {}),
        city: address.city,
        ...(address.state ? { state: address.state } : {}),
        zip: address.postal_code || "",
        country: address.country,
      },
      parcels: [{
        length: "12", width: "9", height: "2",
        distance_unit: "in",
        weight: parseFloat(weightOz).toFixed(2),
        mass_unit: "oz",
      }],
      customs_declaration: {
        contents_type: "MERCHANDISE",
        non_delivery_option: "RETURN",
        certify: true,
        certify_signer: "Eli Altman",
        incoterm: "DDU",
        items: customsItems,
      },
      async: false,
    }),
  });

  if (!shippoRes.ok) {
    const text = await shippoRes.text();
    console.error("Shippo shipment error:", text);
    let detail = text;
    try { detail = JSON.parse(text)?.detail || text; } catch {}
    return res.status(502).json({ error: `Shippo (create shipment): ${detail}` });
  }

  const shipment = await shippoRes.json();
  const allRates = (shipment.rates || [])
    .filter((r) => (r.provider === "USPS" || r.provider === "UPS") && r.amount)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

  if (allRates.length === 0) {
    return res.status(502).json({ error: "No rates available for this shipment" });
  }

  // Match by token first (USPS), then by display name (UPS), then cheapest.
  const rate =
    (targetService && allRates.find((r) => r.servicelevel?.token === targetService)) ||
    (displayName && allRates.find((r) => r.servicelevel?.name === displayName)) ||
    allRates[0];

  const txRes = await fetch("https://api.goshippo.com/transactions/", {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rate: rate.object_id, label_file_type: "PDF", async: false }),
  });

  if (!txRes.ok) {
    const text = await txRes.text();
    console.error("Shippo transaction error:", text);
    let detail = text;
    try { detail = JSON.parse(text)?.detail || text; } catch {}
    return res.status(502).json({ error: `Shippo (buy label): ${detail}` });
  }

  const tx = await txRes.json();
  if (tx.status !== "SUCCESS") {
    const msgs = (tx.messages || []).map((m) => m.text).join("; ");
    console.error("Shippo transaction not SUCCESS:", JSON.stringify(tx.messages));
    return res.status(502).json({ error: `Shippo label failed: ${msgs || tx.status}` });
  }

  return res.status(200).json({
    labelUrl: tx.label_url,
    trackingNumber: tx.tracking_number,
    carrier: rate.provider || "USPS",
    service: displayName || rate.servicelevel?.name,
    rate: rate.amount,
    currency: (rate.currency || "USD").toUpperCase(),
  });
}
