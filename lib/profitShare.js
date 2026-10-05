// Quarterly profit share: what each collaborator is owed for a calendar quarter.
//
// Sales are split into six lines, and each collaborator is paid a share of some
// of them:
//
//   dcit, rsr      — copies sold on their own, retail and wholesale together
//   dcitBundle     — the DCIT half of each bundle sold through the site
//   gnyRetail      — GNY sold through the site
//   gnyWholesale   — GNY on a manual order, alone or in a bundle
//   gnyBundle      — the GNY half of each bundle sold through the site
//
// Every line is paid on what the buyer paid less the Stripe fee that came out
// of it. The DCIT and RSR lines also take off what each copy cost to print —
// that is how the Moniker agreement is written. A DCIT copy in a bundle cost
// the same to print as one sold alone, so both use the DCIT figure.
//
// "What the buyer paid" is the item's price after discounts, before tax and
// shipping, reduced pro rata by any partial refund. Orders refunded in full are
// cancelled and left out. Wholesale is paid off Stripe, so it carries no fee,
// and counts at what the manual order says it was invoiced at — except GNY,
// which is always counted at the standard wholesale price, 40% off list.
// A bundle on a manual order is wholesale, not a bundle sale: its GNY counts
// as a wholesale GNY at that price, and the rest of what was paid goes to DCIT.
//
// A bundle is priced below its two parts, and that discount is split evenly
// between them. At $60 against $26 + $40, each absorbs $3: DCIT counts $23 and
// GNY $37. A coupon on a bundle widens the discount and is split the same way.
//
// Who is paid, at what share, on which lines, and the print costs all live in
// private blob storage, not here — this repository is public.
//
// The order date decides the quarter, in Pacific time. Ebooks and everything
// else not on a line are reported as "not counted" so a stray sale is visible
// rather than silently dropped.

import { put } from "@vercel/blob";
import { products } from "../data/products.js";

const CONFIG_PATH = "admin/profit-share.json";

export const LINES = [
  { id: "dcit", label: "Don't Call It That", printCost: "dcit" },
  { id: "rsr", label: "Run Studio Run", printCost: "rsr" },
  { id: "dcitBundle", label: "Don't Call It That, in bundle", printCost: "dcit" },
  { id: "gnyRetail", label: "Go Name Yourself, retail", printCost: null },
  { id: "gnyWholesale", label: "Go Name Yourself, wholesale", printCost: null },
  { id: "gnyBundle", label: "Go Name Yourself, in bundle", printCost: null },
];

// The books whose print cost comes off before the share is taken.
export const PRINT_COSTS = [
  { id: "dcit", label: "Don't Call It That" },
  { id: "rsr", label: "Run Studio Run" },
];

const DCIT = products.find((p) => p.id === "dont-call-it-that");
const RSR = products.find((p) => p.id === "run-studio-run");
const GNY = products.find((p) => p.id === "go-name-yourself");
const BUNDLE = products.find((p) => p.id === "name-right-now-bundle");

const GNY_WHOLESALE_PRICE = GNY.price * (1 - 0.4);

// ─── Config ───────────────────────────────────────────────────────────────────

function blobUrl(pathname) {
  const token = process.env.BLOB_READ_WRITE_TOKEN || "";
  const storeId = token.match(/vercel_blob_rw_([^_]+)/)?.[1]?.toLowerCase() || "";
  return `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;
}

// { unitCosts: { [printCostId]: dollars }, payees: [{ name, share, lines: [lineId] }] }
// null when nothing has been saved yet.
export async function getProfitShareConfig() {
  const res = await fetch(blobUrl(CONFIG_PATH), {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export function validateConfig(config) {
  const lineIds = new Set(LINES.map((l) => l.id));
  if (!config || typeof config !== "object") return "config is required";
  for (const { id, label } of PRINT_COSTS) {
    const cost = config.unitCosts?.[id];
    if (cost !== undefined && (typeof cost !== "number" || !(cost >= 0))) return `print cost for ${label} must be a number ≥ 0`;
  }
  if (!Array.isArray(config.payees)) return "payees must be a list";
  for (const p of config.payees) {
    if (!p.name?.trim()) return "every payee needs a name";
    if (typeof p.share !== "number" || !(p.share >= 0 && p.share <= 1)) return `${p.name}: share must be between 0 and 1`;
    if (!Array.isArray(p.lines) || p.lines.some((l) => !lineIds.has(l))) return `${p.name}: unknown line`;
  }
  return null;
}

export async function saveProfitShareConfig(config) {
  await put(CONFIG_PATH, JSON.stringify(config), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

// ─── Quarters ─────────────────────────────────────────────────────────────────

const ZONE = "America/Los_Angeles";

// Epoch seconds of midnight Pacific on the given day — -08:00 or -07:00
// depending on daylight saving, whichever lands on midnight there.
function pacificMidnight(year, month, day) {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  for (const offset of ["-08:00", "-07:00"]) {
    const t = Date.parse(`${iso}T00:00:00${offset}`);
    const hour = new Intl.DateTimeFormat("en-US", { timeZone: ZONE, hour: "numeric", hourCycle: "h23" }).format(t);
    if (Number(hour) === 0) return t / 1000;
  }
  throw new Error(`No Pacific midnight on ${iso}`);
}

// "2026-Q3" → { from, to } as epoch seconds, plus the same as YYYY-MM-DD for
// manual orders, whose dates are plain strings. `to` is exclusive.
export function quarterBounds(quarter) {
  const m = /^(\d{4})-Q([1-4])$/.exec(quarter || "");
  if (!m) return null;
  const year = Number(m[1]);
  const startMonth = (Number(m[2]) - 1) * 3 + 1;
  const endYear = startMonth === 10 ? year + 1 : year;
  const endMonth = startMonth === 10 ? 1 : startMonth + 3;
  const pad = (n) => String(n).padStart(2, "0");
  return {
    from: pacificMidnight(year, startMonth, 1),
    to: pacificMidnight(endYear, endMonth, 1),
    fromDate: `${year}-${pad(startMonth)}-01`,
    toDate: `${endYear}-${pad(endMonth)}-01`,
  };
}

// ─── Sales ────────────────────────────────────────────────────────────────────

function productForPriceId(priceId) {
  if (!priceId) return null;
  return products.find((p) => p.stripePriceId === priceId || p.formerStripePriceIds?.includes(priceId)) || null;
}

function normalizeName(name) {
  return (name || "").toLowerCase().replace(/[’‘]/g, "'").replace(/[—–]/g, "-").replace(/\s+/g, " ").trim();
}

// Manual-order items picked from the dropdown carry a productId; older or
// hand-typed ones only have a name, often with a SKU in front of it
// ("DCIT3 - Don't Call It That"). The longest product name the item's name
// contains wins, so "Don't Call It That — Digital" is not read as the book.
function productForManualItem(item) {
  if (item.productId) return products.find((p) => p.id === item.productId) || null;
  const name = normalizeName(item.name);
  const matches = products.filter((p) => name.includes(normalizeName(p.name)));
  return matches.sort((a, b) => b.name.length - a.name.length)[0] || null;
}

// A bundle's per-copy amount split into its DCIT and GNY parts, the discount
// against the two list prices shared evenly.
function splitBundle(perCopy) {
  const discount = DCIT.price + GNY.price - perCopy;
  const dcit = DCIT.price - discount / 2;
  return { dcit, gny: perCopy - dcit };
}

function emptyLine() {
  return { units: 0, proceeds: 0, fees: 0 };
}

// Adds one sale to the line totals. `amount` and `fee` cover all `qty` copies.
function addSale(lines, excluded, { product, name, qty, amount, fee, wholesale }) {
  const add = (id, units, dollars, dollarsFee) => {
    lines[id].units += units;
    lines[id].proceeds += dollars;
    lines[id].fees += dollarsFee;
  };

  if (product === DCIT) return add("dcit", qty, amount, fee);
  if (product === RSR) return add("rsr", qty, amount, fee);
  if (product === GNY && wholesale) return add("gnyWholesale", qty, qty * GNY_WHOLESALE_PRICE, 0);
  if (product === GNY) return add("gnyRetail", qty, amount, fee);
  if (product === BUNDLE && wholesale) {
    const gnyAmount = qty * GNY_WHOLESALE_PRICE;
    add("dcit", qty, amount - gnyAmount, 0);
    add("gnyWholesale", qty, gnyAmount, 0);
    return;
  }
  if (product === BUNDLE) {
    const { dcit } = splitBundle(qty ? amount / qty : 0);
    const dcitAmount = dcit * qty;
    const dcitFee = amount ? (fee * dcitAmount) / amount : 0;
    add("dcitBundle", qty, dcitAmount, dcitFee);
    add("gnyBundle", qty, amount - dcitAmount, fee - dcitFee);
    return;
  }

  const reason = !product ? "not recognised" : product.isDigital ? "digital" : "not in a profit share";
  const key = `${name}|${reason}`;
  excluded[key] ??= { name, reason, units: 0, amount: 0 };
  excluded[key].units += qty;
  excluded[key].amount += amount;
}

function chargeOf(session) {
  const charge = session.payment_intent?.latest_charge;
  return typeof charge === "object" && charge !== null ? charge : null;
}

async function stripeSessions(stripe, from, to) {
  const sessions = [];
  for await (const session of stripe.checkout.sessions.list({
    created: { gte: from, lt: to },
    status: "complete",
    limit: 100,
    expand: ["data.line_items", "data.payment_intent.latest_charge.balance_transaction"],
  })) {
    if (session.payment_status !== "paid") continue;
    // The expanded list stops at the first page of items.
    if (session.line_items?.has_more) {
      const all = [];
      for await (const li of stripe.checkout.sessions.listLineItems(session.id, { limit: 100 })) all.push(li);
      session.line_items = { data: all };
    }
    sessions.push(session);
  }
  return sessions;
}

export async function quarterSales({ stripe, manualOrders, quarter }) {
  const bounds = quarterBounds(quarter);
  if (!bounds) throw new Error(`Bad quarter ${quarter}`);

  const lines = Object.fromEntries(LINES.map((l) => [l.id, emptyLine()]));
  const excluded = {};
  const notes = { cancelledOrders: 0, partialRefunds: 0, missingFees: 0, stripeOrders: 0, manualOrders: 0 };

  for (const session of await stripeSessions(stripe, bounds.from, bounds.to)) {
    const charge = chargeOf(session);
    const chargeCents = charge?.amount || session.amount_total || 0;
    const refundedCents = charge?.amount_refunded || 0;
    if (refundedCents > 0 && refundedCents >= chargeCents) {
      notes.cancelledOrders += 1;
      continue;
    }
    if (refundedCents > 0) notes.partialRefunds += 1;
    notes.stripeOrders += 1;

    const bt = charge?.balance_transaction;
    const feeCents = typeof bt === "object" && bt !== null ? bt.fee : null;
    if (feeCents === null) notes.missingFees += 1;

    const keep = chargeCents ? 1 - refundedCents / chargeCents : 1;
    for (const li of session.line_items?.data || []) {
      const paidCents = (li.amount_subtotal || 0) - (li.amount_discount || 0);
      addSale(lines, excluded, {
        product: productForPriceId(li.price?.id),
        name: li.description || "",
        qty: li.quantity || 0,
        amount: (paidCents * keep) / 100,
        // The fee was charged on the whole payment, tax and shipping included,
        // so each item carries the part of it its own amount accounts for.
        fee: feeCents && chargeCents ? (feeCents * paidCents) / chargeCents / 100 : 0,
        wholesale: false,
      });
    }
  }

  for (const order of manualOrders) {
    if (!(order.date >= bounds.fromDate && order.date < bounds.toDate)) continue;
    notes.manualOrders += 1;
    for (const item of order.items || []) {
      const qty = Number(item.qty) || 0;
      const amount = qty * (Number(item.unitPrice) || 0) * (1 - (Number(item.discount) || 0) / 100);
      // A copy sent at no charge was given away, not sold — counting it would
      // charge its print cost against the collaborator.
      if (amount <= 0) {
        const key = `${item.name}|no charge`;
        excluded[key] ??= { name: item.name, reason: "no charge", units: 0, amount: 0 };
        excluded[key].units += qty;
        continue;
      }
      addSale(lines, excluded, {
        product: productForManualItem(item),
        name: item.name,
        qty,
        amount,
        fee: 0,
        wholesale: true,
      });
    }
  }

  return { quarter, lines, excluded: Object.values(excluded), notes };
}

// ─── Payouts ──────────────────────────────────────────────────────────────────

const cents = (n) => Math.round(n * 100) / 100;

export function payouts(sales, config) {
  const lines = LINES.map((def) => {
    const s = sales.lines[def.id];
    const unitCost = def.printCost ? config?.unitCosts?.[def.printCost] ?? 0 : null;
    const cost = def.printCost ? s.units * unitCost : 0;
    const fees = s.fees;
    return {
      ...def,
      units: s.units,
      proceeds: cents(s.proceeds),
      unitCost,
      cost: cents(cost),
      fees: cents(fees),
      base: cents(s.proceeds - cost - fees),
    };
  });

  const payees = (config?.payees || []).map((p) => {
    const own = lines.filter((l) => p.lines.includes(l.id));
    const rows = own.map((l) => ({ id: l.id, label: l.label, base: l.base, amount: cents(l.base * p.share) }));
    return { name: p.name, share: p.share, rows, total: cents(rows.reduce((sum, r) => sum + r.amount, 0)) };
  });

  return { lines, payees };
}
