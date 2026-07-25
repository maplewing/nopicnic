// Live shipping rates, shared by /api/shipping-rates (to show the customer)
// and /api/checkout (to re-verify what the customer picked before charging).
// Domestic (US): hardcoded Media Mail + Shippo (USPS Priority, cheapest overnight)
// International: EasyPost (UPS)
// Requires SHIPPO_API_KEY, EASYPOST_API_KEY, NPP_ORIGIN_ZIP env vars.

import { products, STANDARD_MAILER_OZ, LARGE_MAILER_OZ } from "../data/products";

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

export const FREE_SHIPPING_CODE = "MOREBETTER";
export const FREE_SHIPPING_MINIMUM = 50;

export const FREE_RATE = {
  token: "promo-free",
  serviceToken: "free_shipping",
  service: "Free shipping",
  amount: "0.00",
  currency: "USD",
  estimatedDays: null,
  durationTerms: "2–8 business days (Media Mail)",
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

const DCIT_IDS = new Set([
  "dont-call-it-that",
  "dont-call-it-that-1st-edition",
  "dont-call-it-that-2nd-edition",
]);

// Media Mail is restricted to books and similar educational media. Items that
// don't qualify (card decks, posters, prints) must not be offered that rate.
const MEDIA_MAIL_INELIGIBLE = new Set([
  "go-name-yourself",
  "name-right-now-bundle",
  "dcit-taxonomy-poster",
  "run-studio-run-art-prints",
]);

export function getPackagingOz(items) {
  const ids = new Set(items.map((i) => i.id));
  const hasDCIT = [...DCIT_IDS].some((id) => ids.has(id));
  const hasGNY = ids.has("go-name-yourself");
  const hasBundle = ids.has("name-right-now-bundle");
  const hasExtraStrength = ids.has("extra-strength");
  if ((hasDCIT && hasGNY) || hasBundle || hasExtraStrength) return LARGE_MAILER_OZ;
  return STANDARD_MAILER_OZ;
}

// Total shipped weight for a set of validated cart lines, packaging included.
export function getTotalWeightOz(lines) {
  const physical = lines.filter((l) => !l.product.isDigital && !l.product.isService);
  if (physical.length === 0) return 0;
  const contents = physical.reduce(
    (sum, l) => sum + (l.product.productWeightOz || 14) * l.qty,
    0
  );
  return contents + getPackagingOz(physical.map((l) => ({ id: l.product.id })));
}

export function mediaMailAllowed(lines) {
  const physical = lines.filter((l) => !l.product.isDigital && !l.product.isService);
  if (physical.length === 0) return false;
  // USPS caps Media Mail at 70 lb, but our own packing limit is the real
  // constraint: past four books the flat rate stops covering actual postage.
  const totalQty = physical.reduce((sum, l) => sum + l.qty, 0);
  if (totalQty > 4) return false;
  return physical.every((l) => !MEDIA_MAIL_INELIGIBLE.has(l.product.id));
}

// ── Public entry point ──

export async function getRates({ country, zip, lines }) {
  const weightOz = getTotalWeightOz(lines);
  if (weightOz <= 0) return [];

  const rates =
    country === "US"
      ? await getDomesticRates(zip, weightOz)
      : await getInternationalRates(country, zip, weightOz);

  const filtered = mediaMailAllowed(lines)
    ? rates
    : rates.filter((r) => r.serviceToken !== "usps_media_mail");

  // Cheapest first. A more expensive option that arrives no sooner is noise.
  return filtered.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
}

// ── Domestic: Shippo (Priority + cheapest overnight) + hardcoded Media Mail ──

async function getDomesticRates(zip, weightOz) {
  const shippoRes = await fetch("https://api.goshippo.com/shipments/", {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_from: ORIGIN,
      address_to: {
        name: "Customer",
        zip: zip || "",
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

  if (!shippoRes.ok) {
    const text = await shippoRes.text();
    console.error("Shippo error:", text);
    throw new Error("Shipping provider error");
  }

  const data = await shippoRes.json();
  const allRates = data.rates || [];

  const priorityRate = allRates.find(
    (r) => r.provider === "USPS" && r.servicelevel?.token === "usps_priority" && r.amount
  );

  const priority = priorityRate && {
    token: priorityRate.object_id,
    serviceToken: "usps_priority",
    service: "Priority Mail",
    amount: priorityRate.amount,
    currency: priorityRate.currency,
    // Shippo often returns estimated_days: 1 for Priority, which USPS does not
    // guarantee and which made this look identical to a true overnight. Quote
    // the range we can actually hit from Berkeley instead of the carrier's best case.
    estimatedDays: null,
    durationTerms: "2–3 business days",
  };

  // Cheapest genuine next-day rate from any carrier.
  const overnightRate = allRates
    .filter((r) => r.estimated_days === 1 && r.amount)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];

  let overnight = overnightRate && {
    token: overnightRate.object_id,
    serviceToken: overnightRate.servicelevel?.token,
    service: "Overnight",
    amount: overnightRate.amount,
    currency: overnightRate.currency,
    estimatedDays: 1,
    durationTerms: "Next business day",
  };

  // Carriers sometimes return Priority itself as the cheapest 1-day rate, which
  // would list the same service twice under two names.
  if (overnight && priority && overnight.token === priority.token) overnight = null;

  // If Priority costs at least as much as a true overnight, it is strictly
  // worse and only makes the list look broken.
  if (overnight && priority && parseFloat(priority.amount) >= parseFloat(overnight.amount)) {
    return [MEDIA_MAIL_RATE, overnight];
  }

  return [MEDIA_MAIL_RATE, priority, overnight].filter(Boolean);
}

// ── International: EasyPost (UPS) ──

async function getInternationalRates(country, zip, weightOz) {
  const auth = Buffer.from(`${process.env.EASYPOST_API_KEY}:`).toString("base64");

  const epRes = await fetch("https://api.easypost.com/v2/shipments", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shipment: {
        from_address: ORIGIN,
        to_address: { name: "Customer", zip, country },
        parcel: { length: 12, width: 9, height: 2, weight: weightOz },
      },
    }),
  });

  if (!epRes.ok) {
    const text = await epRes.text();
    console.error("EasyPost error:", text);
    throw new Error("Shipping provider error");
  }

  const data = await epRes.json();

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

  if (allRates.length === 0) {
    const carriers = [...new Set((data.rates || []).map((r) => r.carrier))];
    console.log("EasyPost: no UPS/UPSDAP rates. Available carriers:", carriers);
    console.log("EasyPost messages:", data.messages);
    return [];
  }

  const cheapest = allRates[0];

  const oneDayRates = allRates.filter((r) => (r.delivery_days || r.est_delivery_days) === 1);
  const fastest = oneDayRates.length > 0 ? oneDayRates[0] : null;

  const others = allRates.filter((r) => r.id !== cheapest.id && r.id !== fastest?.id);
  const middle = others.length > 0 ? others[Math.floor(others.length / 2)] : null;

  const seen = new Set();
  return [cheapest, middle, fastest]
    .filter(Boolean)
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map(toRate);
}

// ── Cart validation ──

const MAX_QTY_PER_LINE = 20;

// Rebuilds the cart from server-side product data. The browser sends ids and
// quantities; prices, price ids and stock come from here and nowhere else.
export function validateCart(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "Your cart is empty." };
  }

  const lines = [];
  for (const raw of rawItems) {
    const product = products.find((p) => p.id === raw?.id);
    if (!product) {
      return { error: "One of the items in your cart is no longer available." };
    }
    if (!product.inStock) {
      return { error: `${product.name} is sold out.` };
    }
    if (!product.stripePriceId) {
      return { error: `${product.name} can't be purchased right now.` };
    }

    const qty = Math.floor(Number(raw?.qty));
    if (!Number.isFinite(qty) || qty < 1) {
      return { error: "Invalid quantity." };
    }
    if (qty > MAX_QTY_PER_LINE) {
      return { error: `You can order at most ${MAX_QTY_PER_LINE} of ${product.name} at a time. Email hi@nopicnicpress.com for bulk orders.` };
    }
    // Digital downloads and studio sessions are one-per-order by nature.
    const cappedQty = product.isDigital || product.isService ? 1 : qty;

    const existing = lines.find((l) => l.product.id === product.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + cappedQty, MAX_QTY_PER_LINE);
    } else {
      lines.push({ product, qty: cappedQty });
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  const hasPhysical = lines.some((l) => !l.product.isDigital && !l.product.isService);

  return { lines, subtotal, hasPhysical };
}
