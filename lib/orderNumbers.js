import { list, put } from "@vercel/blob";

const ORDER_NUMBERS_PATH = "admin/order-numbers.json";
const STARTING_ORDER_NUMBER = 2684;

async function readOrderNumbers() {
  const { blobs } = await list({ prefix: ORDER_NUMBERS_PATH, limit: 1 });
  const blob = blobs.find((b) => b.pathname === ORDER_NUMBERS_PATH);
  if (!blob) return { mapping: {}, nextOrderNumber: STARTING_ORDER_NUMBER };
  const res = await fetch(blob.downloadUrl);
  if (!res.ok) return { mapping: {}, nextOrderNumber: STARTING_ORDER_NUMBER };
  return res.json();
}

async function writeOrderNumbers(data) {
  await put(ORDER_NUMBERS_PATH, JSON.stringify(data), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
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
