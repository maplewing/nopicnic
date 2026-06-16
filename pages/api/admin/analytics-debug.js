import { list } from "@vercel/blob";
import { checkAdminAuth } from "../../../lib/adminAuth";

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") return res.status(405).end();

  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dates.push(d.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }));
  }

  const { blobs } = await list({ prefix: "admin/analytics/", limit: 1000 });
  const blobByDate = Object.fromEntries(
    blobs.map((b) => [b.pathname.replace("admin/analytics/", "").replace(".json", ""), b])
  );

  const result = [];
  for (const date of dates) {
    const blob = blobByDate[date];
    if (!blob) { result.push({ date, exists: false }); continue; }
    const r = await fetch(blob.url, {
      headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
      cache: "no-store",
    });
    const data = r.ok ? await r.json() : null;
    result.push({
      date,
      exists: true,
      totalViews: data?.totalViews || 0,
      events: data?.events || {},
      topPages: Object.entries(data?.pages || {}).sort(([,a],[,b]) => b - a).slice(0, 5),
    });
  }

  res.status(200).json(result);
}
