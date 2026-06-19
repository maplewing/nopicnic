import { list, put } from "@vercel/blob";

// Module-level accumulator — persists across warm Lambda invocations.
// Reduces Blob advanced requests from 2/request to ~2/BATCH_SIZE requests.
const BATCH_SIZE = 25;
const MAX_AGE_MS = 2 * 60 * 1000; // flush at least every 2 minutes

let acc = {
  date: null,
  counts: { totalViews: 0, pages: {}, events: {} },
  n: 0,
  lastFlush: Date.now(),
};

async function flush(date) {
  const blobPath = `admin/analytics/${date}.json`;

  // Snapshot and reset immediately so new events don't double-count
  const snapshot = acc.counts;
  acc.counts = { totalViews: 0, pages: {}, events: {} };
  acc.n = 0;
  acc.lastFlush = Date.now();

  try {
    const { blobs } = await list({ prefix: blobPath, limit: 1 });
    let stored = { totalViews: 0, pages: {}, events: {} };

    const existing = blobs.find((b) => b.pathname === blobPath);
    if (existing) {
      const r = await fetch(existing.url, {
        headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
        cache: "no-store",
      });
      if (r.ok) stored = { events: {}, ...await r.json() };
    }

    stored.totalViews = (stored.totalViews || 0) + (snapshot.totalViews || 0);
    for (const [k, v] of Object.entries(snapshot.pages || {}))
      stored.pages[k] = (stored.pages[k] || 0) + v;
    for (const [k, v] of Object.entries(snapshot.events || {}))
      stored.events[k] = (stored.events[k] || 0) + v;

    await put(blobPath, JSON.stringify(stored), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    console.error("Track flush error:", err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { page, event, product, sessionStart, sessionEngaged } = req.body || {};

  if (!page && !event && !sessionStart && !sessionEngaged) return res.status(400).end();
  if (page && (page.startsWith("/admin") || page.startsWith("/api"))) return res.status(200).end();

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

  // Day rollover — flush previous day's buffer then reset
  if (acc.date !== today) {
    if (acc.date && acc.n > 0) flush(acc.date).catch(console.error);
    acc.date = today;
    acc.counts = { totalViews: 0, pages: {}, events: {} };
    acc.n = 0;
    acc.lastFlush = Date.now();
  }

  // Accumulate in memory
  if (page) {
    acc.counts.totalViews++;
    acc.counts.pages[page] = (acc.counts.pages[page] || 0) + 1;
  }
  if (event) {
    acc.counts.events[event] = (acc.counts.events[event] || 0) + 1;
    if (product) acc.counts.events[`${event}:${product}`] = (acc.counts.events[`${event}:${product}`] || 0) + 1;
  }
  if (sessionStart) acc.counts.events["session_start"] = (acc.counts.events["session_start"] || 0) + 1;
  if (sessionEngaged) acc.counts.events["session_engaged"] = (acc.counts.events["session_engaged"] || 0) + 1;
  acc.n++;

  // Fire-and-forget flush when batch is full or time threshold exceeded
  if (acc.n >= BATCH_SIZE || Date.now() - acc.lastFlush > MAX_AGE_MS) {
    flush(today).catch(console.error);
  }

  res.status(200).end();
}
