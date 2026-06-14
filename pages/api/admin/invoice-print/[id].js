import { getManualOrder } from "../../../../lib/manualOrders";
import { checkAdminAuth } from "../../../../lib/adminAuth";

function fmt(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function fmtDate(iso) {
  const d = new Date(iso + "T12:00:00Z");
  const day = d.getUTCDate();
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateHTML(order) {
  const { id, date, recipient, items, tracking, carrier, via, shippingCost } = order;

  const itemSubtotals = (items || []).map((item) => {
    const base = (item.qty || 0) * (item.unitPrice || 0);
    return item.discount > 0 ? base * (1 - item.discount / 100) : base;
  });
  const total = itemSubtotals.reduce((a, b) => a + b, 0) + (shippingCost || 0);

  const itemsHTML = (items || [])
    .map(
      (item, i) => `
    <div class="block">
      <div>${esc(item.name)}</div>
      <div>qty: ${esc(item.qty)} @ ${fmt(item.unitPrice)} ea</div>
      ${item.discount > 0 ? `<div>x ${esc(item.discount)}% (wholesale discount) = ${fmt(itemSubtotals[i])} USD</div>` : ""}
    </div>`
    )
    .join("");

  const shippingHTML =
    tracking || shippingCost > 0
      ? `
    <div class="block">
      <div>: Shipping${carrier ? ` ${esc(carrier)}` : ""}${tracking ? ` ${esc(tracking)}` : ""}${via ? ` via ${esc(via)}` : ""}</div>
      ${shippingCost > 0 ? `<div>${fmt(shippingCost)}</div>` : ""}
    </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>npp_invoice_${esc(id.toLowerCase())}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Courier New", Courier, monospace; font-size: 13px; line-height: 1.6; color: #000; background: #fff; }
    .page { max-width: 640px; margin: 60px auto; padding: 0 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .invoice-title { text-decoration: underline; font-weight: bold; font-size: 13px; }
    .logo { width: 243px; opacity: 0.85; }
    .block { margin-bottom: 24px; }
    .underline { text-decoration: underline; }
    .signature { margin-top: 32px; }
    .sig-logo { width: 60px; display: block; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="invoice-title">INVOICE</div>
        <div>${fmtDate(date)}</div>
      </div>
      <img src="/images/npp-logo.png" class="logo" alt="">
    </div>

    <div class="block">
      <div>To:</div>
      <div style="white-space: pre-line">${esc(recipient.name)}</div>
      ${recipient.address ? `<div style="white-space: pre-line">${esc(recipient.address)}</div>` : ""}
      ${recipient.eori ? `<div>EORI ${esc(recipient.eori)}</div>` : ""}
      ${recipient.vatId ? `<div>VAT ID: ${esc(recipient.vatId)}</div>` : ""}
    </div>

    <div class="block">
      <div>: Order ${esc(id)}</div>
    </div>

    ${itemsHTML}
    ${shippingHTML}

    <div class="block">
      <div>: Total</div>
      <div class="underline">${fmt(total)} USD</div>
    </div>

    <div class="block">
      <div>: Payment terms</div>
      <div>Payment is due upon receipt</div>
    </div>

    <div class="block">
      <div>Make check payable to :</div>
      <div>Eli Altman</div>
      <div>1715 9th St</div>
      <div>Berkeley, CA 94710</div>
    </div>

    <div class="block">
      <div>Or Paypal at hi@elialtman.com</div>
    </div>

    <div class="signature">
      <div>Many thanks.</div>
      <br>
      <img src="/images/favicon.png" class="sig-logo" alt="">
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (!checkAdminAuth(req)) return res.status(401).end();
  const { id } = req.query;
  const order = await getManualOrder(id);
  if (!order) return res.status(404).end();
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(generateHTML(order));
}
