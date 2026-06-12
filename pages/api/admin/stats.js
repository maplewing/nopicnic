import Stripe from "stripe";
import { checkAdminAuth } from "../../../lib/adminAuth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function fetchAllSessions(params) {
  const sessions = [];
  let hasMore = true;
  let startingAfter;
  while (hasMore) {
    const batch = await stripe.checkout.sessions.list({
      limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
      ...params,
    });
    sessions.push(...batch.data);
    hasMore = batch.has_more;
    startingAfter = batch.data.length ? batch.data[batch.data.length - 1].id : undefined;
    if (!hasMore) break;
  }
  return sessions;
}

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const now = Math.floor(Date.now() / 1000);
  const since30 = now - 30 * 86400;

  // All sessions in last 30 days (for funnel)
  const allSessions = await fetchAllSessions({
    created: { gte: since30 },
    expand: ["data.payment_intent.latest_charge"],
  });

  // Exclude fully refunded sessions everywhere
  const nonRefunded = allSessions.filter((s) => !(s.payment_intent?.latest_charge?.amount_refunded > 0));

  // Only completed + paid sessions (non-refunded)
  const completed = nonRefunded.filter(
    (s) => s.status === "complete" && s.payment_status === "paid"
  );

  // Build daily revenue map (last 30 days)
  const dailyMap = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dailyMap[key] = { revenue: 0, orders: 0 };
  }

  for (const s of completed) {
    const key = new Date(s.created * 1000).toISOString().slice(0, 10);
    if (dailyMap[key]) {
      dailyMap[key].revenue += (s.amount_total || 0) / 100;
      dailyMap[key].orders += 1;
    }
  }

  const daily = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  // Period summaries
  const sum = (arr, field = "amount_total") =>
    arr.reduce((acc, s) => acc + (s[field] || 0) / 100, 0);

  const todayTs = now - 86400;
  const weekTs = now - 7 * 86400;
  const monthTs = since30;

  const todayC = completed.filter((s) => s.created >= todayTs);
  const weekC = completed.filter((s) => s.created >= weekTs);
  const monthC = completed.filter((s) => s.created >= monthTs);

  const totalRevenue = sum(completed);
  const totalOrders = completed.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalTax = completed.reduce(
    (acc, s) => acc + (s.total_details?.amount_tax || 0) / 100,
    0
  );

  return res.status(200).json({
    daily,
    totals: { revenue: totalRevenue, orders: totalOrders, avgOrderValue, tax: totalTax },
    periods: {
      today: { revenue: sum(todayC), orders: todayC.length },
      week: { revenue: sum(weekC), orders: weekC.length },
      month: { revenue: sum(monthC), orders: monthC.length },
    },
    funnel: {
      checkoutsStarted: nonRefunded.length,
      checkoutsCompleted: completed.length,
      conversionRate:
        nonRefunded.length > 0
          ? ((completed.length / nonRefunded.length) * 100).toFixed(1)
          : "0.0",
    },
  });
}
