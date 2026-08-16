// What an order needs from us before it counts as fulfilled.
//
//   physical — a parcel has to be packed and labelled
//   digital  — download links went out with the confirmation email
//   service  — a studio session, delivered by showing up
//
// Two jobs depend on this. The unshipped alert must not chase an ebook that will
// never have a label, and the review request must not tell someone their
// download landed on their doorstep.
//
// Line items match products by Stripe price ID — the same key api/webhook.js
// uses to decide who gets a download link, and exact where matching on the
// description string is not.

// Extension included so plain `node` can resolve this too — scripts/ runs these
// modules directly, outside webpack, where "../data/products" does not resolve.
import { products } from "../data/products.js";

export function orderKind(session) {
  const lineItems = session.line_items?.data || [];

  // No line items means the expand didn't come back, not that there is nothing
  // to ship. Physical is the safe answer for both callers: it produces an alert
  // that can be dismissed rather than a parcel nobody is watching, and it holds
  // the review email rather than sending a wrong one.
  if (lineItems.length === 0) return "physical";

  const matched = lineItems.map((item) => {
    const priceId = item.price?.id;
    // Several products in data/products.js carry stripePriceId: "" — never let
    // an item with no price ID match one of those.
    if (!priceId) return null;
    return products.find((p) => p.stripePriceId && p.stripePriceId === priceId) || null;
  });

  // An unrecognised price — retired from data/products.js, or created by hand in
  // Stripe — is treated as physical. A false alert about a download costs one
  // glance; a book nobody was reminded to ship is what this exists to prevent.
  if (matched.some((p) => !p || (!p.isDigital && !p.isService))) return "physical";
  if (matched.every((p) => p.isService)) return "service";
  return "digital";
}
