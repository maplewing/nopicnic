// What the unshipped digest would send right now, without sending it.
//
// Same query api/drip/unshipped runs on its daily cron: paid orders carrying
// something physical, no label yet, at least N days old. Reads Stripe only.
//
// Run:  node scripts/list-unshipped.mjs
//       node scripts/list-unshipped.mjs 0    # every unshipped order, any age

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
Object.assign(process.env, env);

// Imported after the env is in place — lib/shipments.js builds its Stripe
// client at module load, and an empty key there fails on the first call.
const { getUnshippedOrders, ALERT_AFTER_DAYS } = await import("../lib/shipments.js");

const afterDays = process.argv[2] !== undefined ? Number(process.argv[2]) : ALERT_AFTER_DAYS;
const orders = await getUnshippedOrders({ afterDays });

if (orders.length === 0) {
  console.log(`Nothing unshipped past ${afterDays} days.`);
  process.exit(0);
}

console.log(`${orders.length} unshipped, ${afterDays}+ days old:\n`);
for (const o of orders) {
  const a = o.address;
  console.log(`${o.ageDays}d  ${o.sessionId}`);
  console.log(`    ${o.name || "(no name)"} <${o.email}>  $${o.total.toFixed(2)}`);
  console.log(`    ${o.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}`);
  console.log(`    ${a ? `${a.city}, ${a.state || ""} ${a.country}` : "(no address)"}\n`);
}
