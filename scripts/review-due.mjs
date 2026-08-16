// Who the review cron would email on its next run, without emailing them.
//
// Runs the same eligibility lib/reviewTiming.js gives api/drip/review-request,
// against live Stripe orders and the live Redis sent-set. Reads only.
//
// Run:  node scripts/review-due.mjs

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

const { listCompletedSessions } = await import("../lib/shipments.js");
const { orderKind } = await import("../lib/orderKind.js");
const { reviewStatus } = await import("../lib/reviewTiming.js");
const { hasReviewBeenSent } = await import("../lib/reviewSent.js");

const sessions = await listCompletedSessions({
  withinDays: 60,
  expand: ["data.line_items", "data.payment_intent.latest_charge"],
});

const tally = {};
const due = [];

for (const session of sessions) {
  if (session.payment_status !== "paid") continue;
  const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
  if (intent?.latest_charge?.amount_refunded > 0) {
    tally.refunded = (tally.refunded || 0) + 1;
    continue;
  }
  if (!session.customer_details?.email) continue;

  const kind = orderKind(session);
  const { status } = reviewStatus(session, kind);
  const key = `${status}/${kind}`;
  tally[key] = (tally[key] || 0) + 1;

  if (status !== "due") continue;
  if (await hasReviewBeenSent(session.id)) {
    tally["due-already-sent"] = (tally["due-already-sent"] || 0) + 1;
    continue;
  }
  due.push({
    kind,
    name: session.customer_details?.name || "",
    email: session.customer_details.email,
    items: (session.line_items?.data || []).map((i) => i.description).join(", "),
    ageDays: Math.floor((Date.now() - session.created * 1000) / 86400000),
  });
}

console.log(`${sessions.length} completed sessions in the last 60 days`);
console.log(tally);
console.log(`\nWOULD SEND NOW: ${due.length}`);
for (const d of due) {
  console.log(`  [${d.kind}] ${d.name} <${d.email}> — ${d.items} (ordered ${d.ageDays}d ago)`);
}
