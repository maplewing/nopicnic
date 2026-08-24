import { list } from "@vercel/blob";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { serveCached } from "../../../lib/adminCache";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const days = parseInt(req.query.days || "30");

  return serveCached(req, res, {
    name: "analytics",
    params: { days },
    build: () => buildAnalytics(days),
  });
}

async function buildAnalytics(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }));
  }

  const { blobs } = await list({ prefix: "admin/analytics/", limit: 1000 });
  const blobByDate = Object.fromEntries(
    blobs.map((b) => [b.pathname.replace("admin/analytics/", "").replace(".json", ""), b])
  );

  // One blob per day, fetched all at once. These used to run in sequence, so a
  // 30-day window paid 30 round trips end to end for reads that don't depend on
  // each other. A day with no blob resolves to null and is counted as zero.
  const perDay = await Promise.all(
    dates.map(async (date) => {
      const blob = blobByDate[date];
      if (!blob) return { date, data: null };
      try {
        const r = await fetch(blob.url, {
          headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        });
        if (!r.ok) return { date, data: null };
        return { date, data: await r.json() };
      } catch (_) {
        return { date, data: null };
      }
    })
  );

  const daily = [];
  const pageViewTotals = {};
  let totalAddToCart = 0;
  let totalSessions = 0;
  let totalEngaged = 0;

  for (const { date, data } of perDay) {
    if (!data) {
      daily.push({ date, totalViews: 0, pages: {} });
      continue;
    }
    daily.push({ date, totalViews: data.totalViews || 0, pages: data.pages || {} });
    for (const [page, views] of Object.entries(data.pages || {})) {
      pageViewTotals[page] = (pageViewTotals[page] || 0) + views;
    }
    totalAddToCart += data.events?.["add_to_cart"] || 0;
    totalSessions += data.events?.["session_start"] || 0;
    totalEngaged += data.events?.["session_engaged"] || 0;
  }

  const topPages = Object.entries(pageViewTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([page, views]) => ({ page, views }));

  const totalViews = daily.reduce((sum, d) => sum + (d.totalViews || 0), 0);
  const bouncedSessions = Math.max(0, totalSessions - totalEngaged);
  const bounceRate =
    totalSessions > 0
      ? ((bouncedSessions / totalSessions) * 100).toFixed(0)
      : null;

  return {
    daily,
    topPages,
    totalViews,
    totalAddToCart,
    totalSessions,
    bouncedSessions,
    bounceRate,
  };
}
