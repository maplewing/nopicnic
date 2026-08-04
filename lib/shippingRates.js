// Live shipping rates, shared by /api/shipping-rates (to show the customer)
// and /api/checkout (to re-verify what the customer picked before charging).
// Domestic (US): hardcoded Media Mail + Shippo (USPS Priority, cheapest overnight)
// International: Shippo (USPS First Class, Priority, Priority Express)
// Requires SHIPPO_API_KEY, NPP_ORIGIN_ZIP env vars.

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

  // Media Mail is the budget option whenever it's allowed, so the carrier's own
  // cheapest only earns a row when Media Mail is off the table — a card deck, a
  // poster, more than four books — or when it genuinely undercuts $5.50. Listing
  // both otherwise offers a few dollars more for a marginally tighter window,
  // which isn't a choice so much as a thing to squint at.
  const budget = !allowMediaMail
    ? cheapest
    : cheapest && parseFloat(cheapest.amount) < parseFloat(MEDIA_MAIL_RATE.amount)
      ? cheapest
      : null;

  const options = [
    ...(allowMediaMail ? [MEDIA_MAIL_RATE] : []),
    budget,
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

// ── International: USPS via Shippo ──

const USPS_INTL_SERVICE_NAMES = {
  usps_first_class_package_international_service: "USPS First Class International",
  usps_priority_mail_international:               "USPS Priority Mail International",
  usps_priority_mail_express_international:       "USPS Priority Mail Express International",
};

const USPS_INTL_FALLBACK_DAYS = {
  usps_first_class_package_international_service: 21,
  usps_priority_mail_international:               10,
  usps_priority_mail_express_international:        5,
};

async function getUSPSInternationalRates(country, zip, weightOz) {
  const shippoRes = await fetch("https://api.goshippo.com/shipments/", {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_from: ORIGIN,
      address_to: { name: "Customer", zip: zip || "", country },
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
    console.error("Shippo intl error:", await shippoRes.text());
    return [];
  }

  const data = await shippoRes.json();
  const allRates = data.rates || [];

  console.log("Shippo intl USPS rates:", JSON.stringify(
    allRates.filter((r) => r.provider === "USPS").map((r) => ({
      token: r.servicelevel?.token, name: r.servicelevel?.name, amount: r.amount, days: r.estimated_days,
    }))
  ));

  return allRates
    .filter((r) => r.provider === "USPS" && USPS_INTL_SERVICE_NAMES[r.servicelevel?.token] && r.amount)
    .map((r) => {
      const svcToken = r.servicelevel?.token;
      const days = r.estimated_days || USPS_INTL_FALLBACK_DAYS[svcToken] || 21;
      return {
        token: r.object_id,
        serviceToken: svcToken,
        service: USPS_INTL_SERVICE_NAMES[svcToken],
        amount: r.amount,
        currency: (r.currency || "USD").toUpperCase(),
        estimatedDays: r.estimated_days || null,
        durationTerms: `Up to ${days} business days`,
        speedDays: days,
      };
    });
}

async function getInternationalRates(country, zip, weightOz) {
  const rates = await getUSPSInternationalRates(country, zip, weightOz);
  return rates.sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
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
