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
  const since60 = now - 60 * 86400;
  const statsSince = process.env.STATS_SINCE ? Math.max(since60, parseInt(process.env.STATS_SINCE)) : since60;

  // Fetch 60 days so we can compare current vs prior periods
  const allSessions = await fetchAllSessions({
    created: { gte: statsSince },
    expand: ["data.payment_intent.latest_charge"],
  });

  const nonRefunded = allSessions.filter((s) => !(s.payment_intent?.latest_charge?.amount_refunded > 0));
  const completed = nonRefunded.filter(
    (s) => s.status === "complete" && s.payment_status === "paid"
  );

  // Build daily revenue map (last 30 days only for chart)
  const since30 = now - 30 * 86400;
  const dailyMap = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dailyMap[d.toISOString().slice(0, 10)] = { revenue: 0, orders: 0 };
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

  const sum = (arr) => arr.reduce((acc, s) => acc + (s.amount_total || 0) / 100, 0);

  // Current periods
  const todayC      = completed.filter((s) => s.created >= now - 86400);
  const weekC       = completed.filter((s) => s.created >= now - 7 * 86400);
  const monthC      = completed.filter((s) => s.created >= since30);

  // Prior periods (for comparison)
  const yesterdayC  = completed.filter((s) => s.created >= now - 2 * 86400 && s.created < now - 86400);
  const lastWeekC   = completed.filter((s) => s.created >= now - 14 * 86400 && s.created < now - 7 * 86400);
  const lastMonthC  = completed.filter((s) => s.created >= now - 60 * 86400 && s.created < since30);

  const totalRevenue = sum(monthC);
  const totalOrders = monthC.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const prevRevenue = sum(lastMonthC);
  const prevOrders = lastMonthC.length;
  const prevAvg = prevOrders > 0 ? prevRevenue / prevOrders : 0;

  const totalTax = completed.reduce((acc, s) => acc + (s.total_details?.amount_tax || 0) / 100, 0);

  return res.status(200).json({
    daily,
    totals: { revenue: totalRevenue, orders: totalOrders, avgOrderValue, tax: totalTax },
    periods: {
      today:     { revenue: sum(todayC),     orders: todayC.length },
      week:      { revenue: sum(weekC),      orders: weekC.length },
      month:     { revenue: sum(monthC),     orders: monthC.length },
      yesterday: { revenue: sum(yesterdayC), orders: yesterdayC.length },
      lastWeek:  { revenue: sum(lastWeekC),  orders: lastWeekC.length },
      lastMonth: { revenue: sum(lastMonthC), orders: lastMonthC.length, avgOrderValue: prevAvg },
    },
  });
}
