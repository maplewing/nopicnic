import { list, put } from "@vercel/blob";

const MANUAL_ORDERS_PATH = "admin/manual-orders.json";
const STARTING_NUMBER = 208;

async function readManualOrders() {
  const { blobs } = await list({ prefix: MANUAL_ORDERS_PATH, limit: 1 });
  const blob = blobs.find((b) => b.pathname === MANUAL_ORDERS_PATH);
  if (!blob) return { nextNumber: STARTING_NUMBER, orders: [] };
  const res = await fetch(blob.url, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
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
