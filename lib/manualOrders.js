import { put } from "@vercel/blob";

const MANUAL_ORDERS_PATH = "admin/manual-orders.json";
const STARTING_NUMBER = 208;

function manualOrdersUrl() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const storeId = token.match(/vercel_blob_rw_([^_]+)/)?.[1]?.toLowerCase() || "";
  return `https://${storeId}.private.blob.vercel-storage.com/${MANUAL_ORDERS_PATH}`;
}

async function readManualOrders() {
  const res = await fetch(manualOrdersUrl(), {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return { nextNumber: STARTING_NUMBER, orders: [] };
  return res.json();
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
  await writeManualOrders(data);
  return order;
}

export async function getManualOrder(id) {
  const data = await readManualOrders();
  return data.orders.find((o) => o.id === id) || null;
}

export async function deleteManualOrder(id) {
  const data = await readManualOrders();
  data.orders = data.orders.filter((o) => o.id !== id);
  await writeManualOrders(data);
}
