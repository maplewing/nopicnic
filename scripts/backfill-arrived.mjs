// One-off: mark already-delivered shipments as handled so the arrival cron
// doesn't email a backlog.
//
// The arrival email never worked (see git history), so every parcel shipped
// before tracking started working is sitting unmarked. The first cron run after
// tracking goes live would find them all DELIVERED at once and tell each
// customer their weeks-old order is "arriving today".
//
// This stamps arrived_at on anything already delivered, so the cron starts from
// a clean slate and only emails genuinely new deliveries. Shipments still in
// transit are left alone — those should get a real arrival email when they land.
//
//   node scripts/backfill-arrived.mjs            # dry run, changes nothing
//   node scripts/backfill-arrived.mjs --apply    # writes to Stripe metadata

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

const APPLY = process.argv.includes("--apply");
const CARRIER_CODES = { USPS: "usps", UPS: "ups", FedEx: "fedex", DHL: "dhl" };

const Stripe = (await import("stripe")).default;
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const sessions = await stripe.checkout.sessions.list({
  created: { gte: Math.floor(Date.now() / 1000) - 90 * 86400 },
  limit: 100,
  expand: ["data.payment_intent"],
});

const candidates = [];
for (const s of sessions.data) {
  if (s.status !== "complete") continue;
  const m = (typeof s.payment_intent === "object" && s.payment_intent?.metadata) || {};
  if (!m.shipped_at || !m.tracking_number || !m.carrier) continue;
  if (m.arrived_at) continue;
  candidates.push({ paymentIntentId: s.payment_intent.id, ...m });
}

console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${candidates.length} unmarked shipment(s)\n`);

let marked = 0;
let skipped = 0;

for (const c of candidates) {
  const code = CARRIER_CODES[c.carrier] || c.carrier.toLowerCase();
  const masked = c.tracking_number.slice(0, 4) + "…" + c.tracking_number.slice(-4);
  const days = Math.floor((Date.now() - new Date(c.shipped_at)) / 86400000);

  const res = await fetch(
    `https://api.goshippo.com/tracks/${code}/${encodeURIComponent(c.tracking_number)}`,
    { headers: { Authorization: `ShippoToken ${env.SHIPPO_API_KEY}` } }
  );
  if (!res.ok) {
    console.log(`  ${masked}  lookup failed (${res.status}) — leaving alone`);
    skipped++;
    continue;
  }
  const status = (await res.json()).tracking_status?.status || null;

  if (status !== "DELIVERED") {
    console.log(`  ${masked}  ${status || "no status"} — leaving alone, will email on arrival`);
    skipped++;
    continue;
  }

  if (APPLY) {
    await stripe.paymentIntents.update(c.paymentIntentId, {
      metadata: {
        arrived_at: new Date().toISOString(),
        // Records why no arrival email went out, so this isn't mistaken later
        // for a delivery we emailed about.
        arrival_email: "skipped-backfill",
      },
    });
  }
  console.log(`  ${masked}  DELIVERED (shipped ${days}d ago) — ${APPLY ? "marked" : "would mark"}`);
  marked++;
}

console.log("");
console.log(`  ${APPLY ? "marked" : "would mark"}: ${marked}`);
console.log(`  left for the cron to email: ${skipped}`);
if (!APPLY && marked > 0) console.log("\n  Re-run with --apply to write these.");
