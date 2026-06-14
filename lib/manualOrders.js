import { put, del } from "@vercel/blob";

const MANUAL_ORDERS_PATH = "admin/manual-orders.json";
const MANUAL_ORDER_PATH = (id) => `admin/manual-orders/${id}.json`;
const STARTING_NUMBER = 208;

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

async function readManualOrders() {
  const data = await fetchBlob(MANUAL_ORDERS_PATH);
  return data || { nextNumber: STARTING_NUMBER, orders: [] };
}

async function writeManualOrders(data) {
  await put(MANUAL_ORDERS_PATH, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getManualOrders() {
  const data = await readManualOrders();
  return data.orders;
}

export async function createManualOrder(fields) {
  const data = await readManualOrders();
  const id = `M${data.nextNumber}`;
  const order = { id, ...fields };
  data.orders.unshift(order);
  data.nextNumber += 1;
  // Write per-order file first — new blobs have strong read-after-write consistency
  await put(MANUAL_ORDER_PATH(id), JSON.stringify(order), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  // Update the main list (may have brief eventual consistency, that's OK for the list view)
  await writeManualOrders(data);
  return order;
}

export async function getManualOrder(id) {
  // Per-order file: newly created = strong consistency, loads immediately for invoices
  const order = await fetchBlob(MANUAL_ORDER_PATH(id));
  if (order) return order;
  // Fallback to main list (handles orders created before this change)
  const data = await readManualOrders();
  return data.orders.find((o) => o.id === id) || null;
}

export async function updateManualOrder(id, fields) {
  const data = await readManualOrders();
  const idx = data.orders.findIndex((o) => o.id === id);
  if (idx === -1) throw new Error(`Order ${id} not found`);
  const order = { id, ...fields };
  data.orders[idx] = order;
  await put(MANUAL_ORDER_PATH(id), JSON.stringify(order), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  await writeManualOrders(data);
  return order;
}

export async function deleteManualOrder(id) {
  // Remove per-order file if it exists
  try { await del(blobUrl(MANUAL_ORDER_PATH(id))); } catch {}
  // Update main list
  const data = await readManualOrders();
  data.orders = data.orders.filter((o) => o.id !== id);
  await writeManualOrders(data);
}
