import { list } from "@vercel/blob";
import { checkAdminAuth } from "../../../lib/adminAuth";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const days = parseInt(req.query.days || "30");

  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  const { blobs } = await list({ prefix: "admin/analytics/", limit: 1000 });
  const blobByDate = Object.fromEntries(
    blobs.map((b) => [b.pathname.replace("admin/analytics/", "").replace(".json", ""), b])
  );

  const daily = [];
  const pageViewTotals = {};
  let totalAddToCart = 0;
  let totalSessions = 0;
  let totalEngaged = 0;

  for (const date of dates) {
    const blob = blobByDate[date];
    if (blob) {
      try {
        const r = await fetch(blob.downloadUrl);
        if (r.ok) {
          const data = await r.json();
          daily.push({ date, totalViews: data.totalViews || 0, pages: data.pages || {} });
          for (const [page, views] of Object.entries(data.pages || {})) {
            pageViewTotals[page] = (pageViewTotals[page] || 0) + views;
          }
          totalAddToCart += data.events?.["add_to_cart"] || 0;
          totalSessions += data.events?.["session_start"] || 0;
          totalEngaged += data.events?.["session_engaged"] || 0;
          continue;
        }
      } catch (_) {
        // fall through to empty
      }
    }
    daily.push({ date, totalViews: 0, pages: {} });
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

  return res.status(200).json({
    daily,
    topPages,
    totalViews,
    totalAddToCart,
    totalSessions,
    bouncedSessions,
    bounceRate,
  });
}
