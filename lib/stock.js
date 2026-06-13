import { put } from "@vercel/blob";
import { Resend } from "resend";

const STOCK_PATH = "admin/stock.json";

function blobUrl(pathname) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const storeId = token.match(/vercel_blob_rw_([^_]+)/)?.[1]?.toLowerCase() || "";
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

async function fetchBlob(pathname) {
  const res = await fetch(blobUrl(pathname), {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

async function readStock() {
  const data = await fetchBlob(STOCK_PATH);
  return data || {};
}

async function writeStock(data) {
  await put(STOCK_PATH, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getStockLevels() {
  return readStock();
}

export async function setStockLevel(productId, qty) {
  const data = await readStock();
  data[productId] = qty;
  await writeStock(data);
}

const ALERT_THRESHOLDS = [100, 50, 0];

export async function decrementStock(productId, qty) {
  const data = await readStock();
  if (!(productId in data)) return; // not tracked, skip silently
  const oldLevel = data[productId];
  const newLevel = Math.max(0, oldLevel - qty);
  data[productId] = newLevel;
  await writeStock(data);

  for (const threshold of ALERT_THRESHOLDS) {
    if (oldLevel > threshold && newLevel <= threshold) {
      await sendStockAlert(productId, newLevel, threshold).catch((err) =>
        console.error("Stock alert error:", err)
      );
    }
  }

  if (newLevel === 0) {
    await setProductOutOfStock(productId).catch((err) =>
      console.error("Auto OOS error:", err)
    );
  }
}

async function sendStockAlert(productId, level, threshold) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: "No Picnic Press <orders@nopicnicpress.com>",
    to: "hi@nopicnicpress.com",
    subject: `Stock alert: ${productId} has reached ${threshold}`,
    html: `<p><strong>${productId}</strong> stock has crossed the ${threshold} threshold.</p><p>Current level: <strong>${level}</strong></p>`,
  });
}

async function setProductOutOfStock(productId) {
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const ghToken = process.env.GITHUB_TOKEN_NPP;

  if (!repo || !ghToken) {
    throw new Error("GITHUB_REPO or GITHUB_TOKEN_NPP not configured");
  }

  const apiBase = `https://api.github.com/repos/${repo}/contents/data/products.js`;
  const headers = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
  if (!getRes.ok) throw new Error(`GitHub GET failed: ${getRes.status}`);
  const fileData = await getRes.json();
  const currentContent = Buffer.from(fileData.content, "base64").toString("utf8");
  const sha = fileData.sha;

  const idMarker = `id: "${productId}"`;
  const idIndex = currentContent.indexOf(idMarker);
  if (idIndex === -1) throw new Error(`Product "${productId}" not found in products.js`);

  const afterId = currentContent.slice(idIndex);
  const inStockMatch = afterId.match(/inStock: (?:true|false)/);
  if (!inStockMatch) throw new Error(`inStock field not found for "${productId}"`);

  const absoluteIndex = idIndex + afterId.indexOf(inStockMatch[0]);
  const newContent =
    currentContent.slice(0, absoluteIndex) +
    `inStock: false` +
    currentContent.slice(absoluteIndex + inStockMatch[0].length);

  const putRes = await fetch(apiBase, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `Admin: auto set ${productId} inStock=false (stock reached 0)`,
      content: Buffer.from(newContent).toString("base64"),
      sha,
      branch,
    }),
  });

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(`GitHub commit failed: ${putRes.status} — ${err.message}`);
  }
}
