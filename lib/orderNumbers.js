import { put } from "@vercel/blob";

const ORDER_NUMBERS_PATH = "admin/order-numbers.json";
const STARTING_ORDER_NUMBER = 2684;

function blobUrl(pathname) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const storeId = token.match(/vercel_blob_rw_([^_]+)/)?.[1]?.toLowerCase() || "";
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

async function readOrderNumbers() {
  const res = await fetch(blobUrl(ORDER_NUMBERS_PATH), {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return { mapping: {}, nextOrderNumber: STARTING_ORDER_NUMBER };
  return res.json();
}

async function writeOrderNumbers(data) {
  const payload = JSON.stringify(data);
  const opts = {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  };
  try {
    await put(ORDER_NUMBERS_PATH, payload, opts);
  } catch {
    await new Promise((r) => setTimeout(r, 500));
    await put(ORDER_NUMBERS_PATH, payload, opts);
  }
}

export async function getOrderNumbers() {
  return readOrderNumbers();
}

export async function assignOrderNumber(sessionId) {
  const data = await readOrderNumbers();
  if (data.mapping[sessionId] !== undefined) {
    return data.mapping[sessionId]; // already assigned
  }
  const orderNumber = data.nextOrderNumber;
  data.mapping[sessionId] = orderNumber;
  data.nextOrderNumber = orderNumber + 1;
  await writeOrderNumbers(data);
  return orderNumber;
}
