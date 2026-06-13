// Fetches live shipping rates.
// Domestic (US): hardcoded Media Mail $5.50 + Shippo (USPS Priority, cheapest overnight)
// International: EasyPost (UPS)
// Requires SHIPPO_API_KEY, EASYPOST_API_KEY, NPP_ORIGIN_ZIP env vars.

// Hardcoded Media Mail — shown until USPS APIs surface it dynamically
const MEDIA_MAIL_RATE = {
  token: "flat-media-mail",
  serviceToken: "usps_media_mail",
  service: "Media Mail",
  amount: "5.50",
  currency: "USD",
  estimatedDays: null,
  durationTerms: "2–8 business days",
};

const UPS_SERVICE_NAMES = {
  // EasyPost / UPSDAP service tokens
  UPSWorldwideEconomyDDU: "UPS Worldwide Economy",
  Expedited:              "UPS Worldwide Expedited",
  UPSSaver:               "UPS Worldwide Saver",
  Express:                "UPS Worldwide Express",
  ExpressPlus:            "UPS Worldwide Express Plus",
  // Legacy / alternate tokens
  UPSWWExpedited:         "UPS Worldwide Expedited",
  UPSWWSaver:             "UPS Worldwide Saver",
  UPSWWExpress:           "UPS Worldwide Express",
  UPSWWExpressPlus:       "UPS Worldwide Express Plus",
  UPSStandard:            "UPS Standard",
};

// Fallback transit estimates when EasyPost doesn't return delivery_days
const UPS_DURATION_FALLBACK = {
  UPSWorldwideEconomyDDU: "8–12 business days",
  Expedited:              "2–5 business days",
  UPSSaver:               "2–3 business days",
  Express:                "1–3 business days",
  ExpressPlus:            "1–2 business days",
  UPSWWExpedited:         "2–5 business days",
  UPSWWSaver:             "2–3 business days",
  UPSWWExpress:           "1–3 business days",
  UPSWWExpressPlus:       "1–2 business days",
};

const ORIGIN = {
  name: "No Picnic Press",
  street1: "1715 9th St.",
  city: "Berkeley",
  state: "CA",
  zip: process.env.NPP_ORIGIN_ZIP || "94710",
  country: "US",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { address, weightOz } = req.body;
  if (!address || !weightOz) return res.status(400).json({ error: "Missing address or weight" });

  const isIntl = address.country !== "US";

  if (isIntl) {
    return handleInternational(res, address, weightOz);
  } else {
    return handleDomestic(res, address, weightOz);
  }
}

// ── Domestic: Shippo (Priority + cheapest overnight) + hardcoded Media Mail ──

async function handleDomestic(res, address, weightOz) {
  let shippoRes;
  try {
    shippoRes = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: {
        Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address_from: ORIGIN,
        address_to: {
          name: "Customer",
          zip: address.zip || "",
          country: "US",
        },
        parcels: [{
          length: "12", width: "9", height: "2",
          distance_unit: "in",
          weight: parseFloat(weightOz).toFixed(2),
          mass_unit: "oz",
        }],
        async: false,
      }),
    });
  } catch (err) {
    console.error("Shippo fetch error:", err);
    return res.status(502).json({ error: "Could not reach shipping provider" });
  }

  if (!shippoRes.ok) {
    const text = await shippoRes.text();
    console.error("Shippo error:", text);
    return res.status(502).json({ error: "Shipping provider error" });
  }

  const data = await shippoRes.json();
  const allRates = data.rates || [];

  // Priority Mail
  const priority = allRates.find(
    (r) => r.provider === "USPS" && r.servicelevel?.token === "usps_priority" && r.amount
  );

  // Cheapest 1-day rate from any carrier
  const overnight = allRates
    .filter((r) => r.estimated_days === 1 && r.amount)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];

  const rates = [
    MEDIA_MAIL_RATE,
    priority && {
      token: priority.object_id,
      serviceToken: "usps_priority",
      service: "Priority Mail",
      amount: priority.amount,
      currency: priority.currency,
      estimatedDays: priority.estimated_days || null,
      durationTerms: priority.duration_terms || null,
    },
    overnight && {
      token: overnight.object_id,
      serviceToken: overnight.servicelevel?.token,
      service: "Overnight",
      amount: overnight.amount,
      currency: overnight.currency,
      estimatedDays: 1,
      durationTerms: "Next business day",
    },
  ].filter(Boolean);

  return res.json({ rates });
}

// ── International: EasyPost (UPS) ──

async function handleInternational(res, address, weightOz) {
  const auth = Buffer.from(`${process.env.EASYPOST_API_KEY}:`).toString("base64");

  let epRes;
  try {
    epRes = await fetch("https://api.easypost.com/v2/shipments", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shipment: {
          from_address: ORIGIN,
          to_address: {
            name: "Customer",
            zip: address.zip,
            country: address.country,
          },
          parcel: {
            length: 12,
            width: 9,
            height: 2,
            weight: weightOz,
          },
        },
      }),
    });
  } catch (err) {
    console.error("EasyPost fetch error:", err);
    return res.status(502).json({ error: "Could not reach shipping provider" });
  }

  if (!epRes.ok) {
    const text = await epRes.text();
    console.error("EasyPost error:", text);
    return res.status(502).json({ error: "Shipping provider error" });
  }

  const data = await epRes.json();

  // Log what EasyPost returns so we can see carriers/services in Vercel logs
  console.log("EasyPost rates raw:", JSON.stringify((data.rates || []).map(r => ({
    carrier: r.carrier, service: r.service, rate: r.rate, currency: r.currency,
    delivery_days: r.delivery_days, est_delivery_days: r.est_delivery_days,
  }))));

  // EasyPost routes UPS through "UPS" or "UPSDAP" depending on account type
  const isUPS = (r) => r.carrier === "UPS" || r.carrier === "UPSDAP";

  const toRate = (r) => ({
    token: r.id,
    serviceToken: r.service,
    service: UPS_SERVICE_NAMES[r.service] || r.service,
    amount: r.rate,
    currency: r.currency?.toUpperCase() || "USD",
    estimatedDays: r.delivery_days || r.est_delivery_days || null,
    durationTerms: (() => {
      const days = r.delivery_days || r.est_delivery_days;
      if (days) return days === 1 ? "Next business day" : `${days} business days`;
      return UPS_DURATION_FALLBACK[r.service] || null;
    })(),
  });

  const allRates = (data.rates || [])
    .filter((r) => isUPS(r) && r.rate)
    .sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));

  // If no UPS rates returned, log all carriers for debugging
  if (allRates.length === 0) {
    const carriers = [...new Set((data.rates || []).map(r => r.carrier))];
    console.log("EasyPost: no UPS/UPSDAP rates. Available carriers:", carriers);
    console.log("EasyPost messages:", data.messages);
    return res.json({ rates: [] });
  }

  // Pick cheapest, cheapest 1-day, and a middle option
  const cheapest = allRates[0];

  // Cheapest 1-day rate; omitted if none available
  const oneDayRates = allRates.filter(r => (r.delivery_days || r.est_delivery_days) === 1);
  const fastest = oneDayRates.length > 0
    ? oneDayRates[0] // already sorted by price
    : null;

  // Middle: exclude cheapest and fastest, pick the one closest to the midpoint price
  const others = allRates.filter(r => r.id !== cheapest.id && r.id !== fastest?.id);
  const middle = others.length > 0
    ? others[Math.floor(others.length / 2)]
    : null;

  const seen = new Set();
  const rates = [cheapest, middle, fastest]
    .filter(Boolean)
    .filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map(toRate);

  return res.json({ rates });
}
