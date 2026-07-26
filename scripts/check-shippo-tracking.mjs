// Does Shippo return tracking for labels we bought through Pirateship?
//
// Shippo's GET /tracks/{carrier}/{number} is a carrier lookup, not a query
// against your Shippo account, so in principle it resolves any tracking number.
// This proves it against real recent shipments instead of assuming.
//
// Run:  node scripts/check-shippo-tracking.mjs
//
// A 401 mentioning a payment method means Shippo is refusing to talk at all —
// that gate fires before any lookup, so it tells you nothing about whether the
// number would resolve. Add a card at https://goshippo.com/user/billing/ and
// run this again.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env.local"), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);

const CARRIER_CODES = { USPS: "usps", UPS: "ups", FedEx: "fedex", DHL: "dhl" };

const Stripe = (await import("stripe")).default;
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const sessions = await stripe.checkout.sessions.list({
  created: { gte: Math.floor(Date.now() / 1000) - 60 * 86400 },
  limit: 100,
  expand: ["data.payment_intent"],
});

const shipments = [];
for (const s of sessions.data) {
  if (s.status !== "complete") continue;
  const m = (typeof s.payment_intent === "object" && s.payment_intent?.metadata) || {};
  if (m.shipped_at && m.tracking_number && m.carrier) {
    shipments.push({ carrier: m.carrier, number: m.tracking_number, shippedAt: m.shipped_at });
  }
}

if (shipments.length === 0) {
  console.log("No shipments with tracking in the last 60 days — nothing to test.");
  process.exit(0);
}

// Newest first: old numbers age out of carrier systems and would muddy the result.
shipments.sort((a, b) => b.shippedAt.localeCompare(a.shippedAt));
const sample = shipments.slice(0, 5);

console.log(`Testing ${sample.length} of ${shipments.length} recent shipments\n`);

let resolved = 0;
let billingBlocked = false;

for (const s of sample) {
  const code = CARRIER_CODES[s.carrier] || s.carrier.toLowerCase();
  const masked = s.number.slice(0, 4) + "…" + s.number.slice(-4);
  const res = await fetch(
    `https://api.goshippo.com/tracks/${code}/${encodeURIComponent(s.number)}`,
    { headers: { Authorization: `ShippoToken ${env.SHIPPO_API_KEY}` } }
  );

  if (res.status === 401) {
    const body = await res.text();
    billingBlocked = /payment method/i.test(body);
    console.log(`  ${masked}  401  ${billingBlocked ? "billing gate — card not on file" : body.slice(0, 80)}`);
    continue;
  }
  if (!res.ok) {
    console.log(`  ${masked}  ${res.status}  ${(await res.text()).slice(0, 80)}`);
    continue;
  }

  const data = await res.json();
  const status = data.tracking_status?.status || "(no status)";
  const eta = data.eta ? ` eta=${data.eta.slice(0, 10)}` : "";
  console.log(`  ${masked}  200  ${status}${eta}`);
  if (data.tracking_status?.status) resolved++;
}

console.log("");
if (billingBlocked) {
  console.log("Shippo is refusing every request until a card is on file, so this");
  console.log("says nothing about whether Pirateship numbers resolve.");
  console.log("Add one at https://goshippo.com/user/billing/ and re-run.");
} else if (resolved > 0) {
  console.log(`${resolved}/${sample.length} resolved to a real carrier status.`);
  console.log("Pirateship labels track fine through Shippo — the arrival cron will work.");
} else {
  console.log("Shippo answered but returned no status for any of them.");
  console.log("Pirateship numbers are not resolving; the arrival email needs a");
  console.log("different trigger. Worth reporting the output above.");
}
