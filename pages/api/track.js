import { list, put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { page, event, product, sessionStart, sessionEngaged } = req.body || {};

  // Must have at least something to track
  if (!page && !event && !sessionStart && !sessionEngaged) return res.status(400).end();

  // Skip admin and API routes for page tracking
  if (page && (page.startsWith("/admin") || page.startsWith("/api"))) {
    res.status(200).end();
    return;
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const blobPath = `admin/analytics/${today}.json`;

  try {
    const { blobs } = await list({ prefix: blobPath, limit: 1 });
    let data = { totalViews: 0, pages: {}, events: {} };

    const blob = blobs.find((b) => b.pathname === blobPath);
    if (blob) {
      const fetchRes = await fetch(blob.downloadUrl);
      if (fetchRes.ok) {
        const existing = await fetchRes.json();
        data = { events: {}, ...existing };
      }
    }

    if (page) {
      data.totalViews = (data.totalViews || 0) + 1;
      data.pages = data.pages || {};
      data.pages[page] = (data.pages[page] || 0) + 1;
    }

    if (event) {
      data.events = data.events || {};
      data.events[event] = (data.events[event] || 0) + 1;
      if (product) {
        data.events[`${event}:${product}`] = (data.events[`${event}:${product}`] || 0) + 1;
      }
    }

    if (sessionStart) {
      data.events["session_start"] = (data.events["session_start"] || 0) + 1;
    }

    if (sessionEngaged) {
      data.events["session_engaged"] = (data.events["session_engaged"] || 0) + 1;
    }

    await put(blobPath, JSON.stringify(data), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } catch (err) {
    console.error("Track error:", err.message);
  }

  res.status(200).end();
}
