// Live shipping rates, shared by /api/shipping-rates (to show the customer)
// and /api/checkout (to re-verify what the customer picked before charging).
// Domestic (US): hardcoded Media Mail + Shippo (USPS Priority, cheapest overnight)
// International: EasyPost (UPS)
// Requires SHIPPO_API_KEY, EASYPOST_API_KEY, NPP_ORIGIN_ZIP env vars.

import {
  products,
  STANDARD_MAILER_OZ,
  LARGE_MAILER_OZ,
  MEDIA_MAIL_RATE,
  mediaMailEligible,
  FREE_SHIPPING_MINIMUM_USD,
} from "../data/products";
import { rateCacheKey, getCachedRates, setCachedRates } from "./rateCache";

export { MEDIA_MAIL_RATE };

export const FREE_SHIPPING_CODE = "MOREBETTER";
export const FREE_SHIPPING_MINIMUM = FREE_SHIPPING_MINIMUM_USD;

export const FREE_RATE = {
  token: "promo-free",
  serviceToken: "free_shipping",
  service: "Free shipping",
  amount: "0.00",
  currency: "USD",
  estimatedDays: null,
  durationTerms: "2–8 business days (Media Mail)",
  speedDays: 8,
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

// UPS returns delivery_days: null on most international services, so these
// worst-case day counts are what the cheapest/faster comparison actually runs on.
// Keep in step with UPS_DURATION_FALLBACK below.
const UPS_FALLBACK_DAYS = {
  UPSWorldwideEconomyDDU: 12,
  Expedited:              5,
  UPSSaver:               3,
  Express:                3,
  ExpressPlus:            2,
  UPSWWExpedited:         5,
  UPSWWSaver:             3,
  UPSWWExpress:           3,
  UPSWWExpressPlus:       2,
  UPSStandard:            7,
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

// Same question as the browser asks, against validated lines rather than a cart.
export function mediaMailAllowed(lines) {
  return mediaMailEligible(
    lines.map((l) => ({
      id: l.product.id,
      qty: l.qty,
      isDigital: l.product.isDigital,
      isService: l.product.isService,
    }))
  );
}

// ── Public entry point ──

export async function getRates({ country, zip, lines }) {
  const weightOz = getTotalWeightOz(lines);
  if (weightOz <= 0) return [];

  // /checkout and /api/checkout ask the same question minutes apart; the second
  // one reads this back rather than paying for another carrier lookup.
  const key = rateCacheKey({ country, zip, lines });
  const cached = await getCachedRates(key);
  if (cached) return cached;

  const rates =
    country === "US"
      ? await getDomesticRates(zip, weightOz, mediaMailAllowed(lines))
      : await getInternationalRates(country, zip, weightOz);

  // Cheapest first. A more expensive option that arrives no sooner is noise.
  const sorted = rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

  await setCachedRates(key, sorted);
  return sorted;
}

// ── Domestic: hardcoded Media Mail + Shippo (cheapest ground, Priority, overnight) ──

async function getDomesticRates(zip, weightOz, allowMediaMail) {
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
    speedDays: 2,
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
    speedDays: 1,
  };

  // Carriers sometimes return Priority itself as the cheapest 1-day rate, which
  // would list the same service twice under two names.
  if (overnight && priority && overnight.token === priority.token) overnight = null;

  // Shippo phrases this as prose ("Delivery in 2 to 5 days."), which reads
  // oddly next to the ranges we write ourselves.
  const tidyDuration = (terms, days) => {
    if (terms) {
      const cleaned = terms
        .trim()
        .replace(/\.$/, "")
        .replace(/^delivery in\s+/i, "")
        .replace(/\s+to\s+/i, "–")
        .replace(/\bdays?\b/i, "business days");
      if (cleaned) return cleaned;
    }
    if (days) return days === 1 ? "Next business day" : `${days} business days`;
    return null;
  };

  // The cheapest thing the carriers will actually sell us. Without this, an order
  // that can't ship Media Mail (a card deck, a poster) has no budget option at
  // all and jumps straight to Priority.
  const cheapestRate = allRates
    .filter((r) => r.amount)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount))[0];

  const cheapest = cheapestRate && {
    token: cheapestRate.object_id,
    serviceToken: cheapestRate.servicelevel?.token,
    service: cheapestRate.servicelevel?.name || "Standard shipping",
    amount: cheapestRate.amount,
    currency: cheapestRate.currency,
    // durationTerms already carries the range, so don't also render "~N days".
    estimatedDays: null,
    durationTerms: tidyDuration(cheapestRate.duration_terms, cheapestRate.estimated_days),
    speedDays: cheapestRate.estimated_days || 5,
  };

  const options = [
    ...(allowMediaMail ? [MEDIA_MAIL_RATE] : []),
    cheapest,
    priority,
    overnight,
  ].filter(Boolean);

  // Same carrier service can qualify as more than one of the above.
  const seen = new Set();
  const deduped = options.filter((r) => {
    if (seen.has(r.token)) return false;
    seen.add(r.token);
    return true;
  });

  // Drop anything both slower and pricier than another option — that pairing is
  // what made the list look broken. Only strict-on-both, so genuinely different
  // trade-offs all survive and the customer still gets to choose.
  return deduped.filter(
    (r) =>
      !deduped.some(
        (other) =>
          other !== r &&
          parseFloat(other.amount) < parseFloat(r.amount) &&
          other.speedDays < r.speedDays
      )
  );
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

  const transitDays = (r) => r.delivery_days || r.est_delivery_days || null;
  const upsSpeed = (r) => transitDays(r) || UPS_FALLBACK_DAYS[r.service] || 12;

  const toRate = (r) => ({
    token: r.id,
    serviceToken: r.service,
    service: UPS_SERVICE_NAMES[r.service] || r.service,
    amount: r.rate,
    currency: r.currency?.toUpperCase() || "USD",
    estimatedDays: transitDays(r),
    durationTerms: (() => {
      const days = transitDays(r);
      if (days) return days === 1 ? "Next business day" : `${days} business days`;
      return UPS_DURATION_FALLBACK[r.service] || null;
    })(),
    speedDays: upsSpeed(r),
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

  // Same shape as domestic: the cheapest option, plus one or two that are
  // genuinely faster. Picking a "middle" by price position meant it was often
  // no quicker than the cheapest, just dearer.
  const cheapest = allRates[0];

  const faster = allRates.filter((r) => r.id !== cheapest.id && upsSpeed(r) < upsSpeed(cheapest));

  // Quickest on offer, cheapest first among ties.
  const fastest = faster.length
    ? faster.slice().sort((a, b) => upsSpeed(a) - upsSpeed(b) || parseFloat(a.rate) - parseFloat(b.rate))[0]
    : null;

  // A middle step, but only if it saves real time — a day quicker for a few
  // dollars more isn't a choice worth making someone read.
  const middle = fastest
    ? faster.find(
        (r) =>
          r.id !== fastest.id &&
          parseFloat(r.rate) < parseFloat(fastest.rate) &&
          upsSpeed(r) <= upsSpeed(cheapest) - 2
      ) || null
    : null;

  const seen = new Set();
  const picked = [cheapest, middle, fastest]
    .filter(Boolean)
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .map(toRate);

  // Same guard as domestic: never show an option that is both slower and pricier.
  return picked.filter(
    (r) =>
      !picked.some(
        (other) =>
          other !== r &&
          parseFloat(other.amount) < parseFloat(r.amount) &&
          other.speedDays < r.speedDays
      )
  );
}

// ── Cart validation ──

const MAX_QTY_PER_LINE = 20;

// An unknown id means the cart predates a change to products.js, so the only
// name we have for it is the one the browser cached. Treat it as display text:
// strip control characters and cap the length before it reaches an error message.
function cachedName(raw) {
  if (typeof raw?.name !== "string") return null;
  const name = raw.name
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return null;
  return name.length > 60 ? `${name.slice(0, 60)}…` : name;
}

// Rebuilds the cart from server-side product data. The browser sends ids and
// quantities; prices, price ids and stock come from here and nowhere else.
// Errors carry the offending item's id so /checkout can offer to remove it.
export function validateCart(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return { error: "Your cart is empty." };
  }

  const lines = [];
  for (const raw of rawItems) {
    const product = products.find((p) => p.id === raw?.id);
    if (!product) {
      const name = cachedName(raw);
      return {
        error: name
          ? `${name} is no longer available.`
          : "One of the items in your cart is no longer available.",
        errorItemId: typeof raw?.id === "string" ? raw.id : null,
      };
    }
    if (!product.inStock) {
      return { error: `${product.name} is sold out.`, errorItemId: product.id };
    }
    if (!product.stripePriceId) {
      return { error: `${product.name} can't be purchased right now.`, errorItemId: product.id };
    }

    const qty = Math.floor(Number(raw?.qty));
    if (!Number.isFinite(qty) || qty < 1) {
      return { error: `Invalid quantity for ${product.name}.`, errorItemId: product.id };
    }
    if (qty > MAX_QTY_PER_LINE) {
      return {
        error: `You can order at most ${MAX_QTY_PER_LINE} of ${product.name} at a time. Email hi@nopicnicpress.com for bulk orders.`,
        errorItemId: product.id,
      };
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
