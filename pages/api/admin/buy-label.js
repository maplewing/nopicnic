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

// Maps Stripe display_name → carrier service token
const SERVICE_TOKEN = {
  // UPS (via EasyPost)
  "UPS Worldwide Economy":            "UPSWorldwideEconomyDDU",
  "UPS Worldwide Expedited":          "Expedited",
  "UPS Worldwide Saver":              "UPSSaver",
  "UPS Worldwide Express":            "Express",
  "UPS Worldwide Express Plus":       "ExpressPlus",
  "UPS Standard":                     "UPSStandard",
  // USPS (via Shippo)
  "USPS First Class International":          "usps_first_class_package_international_service",
  "USPS Priority Mail International":        "usps_priority_mail_international",
  "USPS Priority Mail Express International":"usps_priority_mail_express_international",
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
  const isUSPS = displayName?.startsWith("USPS");

  return isUSPS
    ? buyShippoLabel({ res, address, recipientName, weightOz, lines, displayName, targetService })
    : buyEasyPostLabel({ res, address, recipientName, weightOz, lines, displayName, targetService });
}

// ── USPS via Shippo ──

async function buyShippoLabel({ res, address, recipientName, weightOz, lines, displayName, targetService }) {
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
      address_from: {
        name: ORIGIN.name,
        street1: ORIGIN.street1,
        city: ORIGIN.city,
        state: ORIGIN.state,
        zip: ORIGIN.zip,
        country: ORIGIN.country,
      },
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
    .filter((r) => r.provider === "USPS" && r.amount)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

  if (allRates.length === 0) {
    return res.status(502).json({ error: "No USPS rates available for this shipment" });
  }

  const rate = (targetService && allRates.find((r) => r.servicelevel?.token === targetService)) || allRates[0];

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
    carrier: "USPS",
    service: displayName || rate.servicelevel?.name,
    rate: rate.amount,
    currency: (rate.currency || "USD").toUpperCase(),
  });
}

// ── UPS via EasyPost ──

async function buyEasyPostLabel({ res, address, recipientName, weightOz, lines, displayName, targetService }) {
  const auth = Buffer.from(`${process.env.EASYPOST_API_KEY}:`).toString("base64");

  const customsItems = lines.map((l) => ({
    description: l.product.name,
    quantity: l.qty,
    weight: parseFloat(((l.product.productWeightOz || 14) * l.qty).toFixed(2)),
    value: parseFloat((l.product.price * l.qty).toFixed(2)),
    currency: "USD",
    origin_country: "US",
    hs_tariff_number: "490110",
  }));

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
        options: {
          invoice_date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
        },
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

  const rate = (targetService && allRates.find((r) => r.service === targetService)) || allRates[0];

  const epBuyRes = await fetch(`https://api.easypost.com/v2/shipments/${shipment.id}/buy`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ rate: { id: rate.id } }),
  });

  if (!epBuyRes.ok) {
    const text = await epBuyRes.text();
    console.error("EasyPost buy error:", text);
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.error?.errors) console.error("EasyPost errors:", JSON.stringify(parsed.error.errors));
      detail = parsed?.error?.message || text;
    } catch {}
    return res.status(502).json({ error: `EasyPost (buy label): ${detail}`, detail: text });
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
