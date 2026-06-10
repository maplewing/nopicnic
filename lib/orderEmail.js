// Order confirmation email template
// Called by pages/api/webhook.js after checkout.session.completed

function fmt(cents) {
  return "$" + (cents / 100).toFixed(2);
}

const FORMAT_LABELS = { epub: "ePub", pdf: "PDF", mobi: "MOBI" };

// downloadLinks: [{ name, formats: [{ format, url }] }]
export function orderConfirmationEmail(session, downloadLinks = []) {
  const name = session.customer_details?.name || "there";
  const address = session.shipping_details?.address;
  const items = session.line_items?.data || [];
  const discount = session.total_details?.amount_discount || 0;
  const shippingCost = session.shipping_cost?.amount_total;
  const siteUrl = process.env.NEXT_PUBLIC_URL || "https://nopicnicpress.com";

  const mono =
    "font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;line-height:1.6;";

  const itemRows = items
    .map((item) => {
      const qty = item.quantity > 1 ? ` × ${item.quantity}` : "";
      return `
        <tr>
          <td style="${mono}padding:10px 0;border-bottom:1px solid #e5e5e5;">
            ${item.description}${qty}
          </td>
          <td style="${mono}padding:10px 0;border-bottom:1px solid #e5e5e5;text-align:right;white-space:nowrap;">
            ${fmt(item.amount_total)}
          </td>
        </tr>`;
    })
    .join("");

  const discountRow =
    discount > 0
      ? `<tr>
          <td style="${mono}padding:6px 0;color:#555555;">Discount</td>
          <td style="${mono}padding:6px 0;color:#555555;text-align:right;">−${fmt(discount)}</td>
        </tr>`
      : "";

  const shippingRow =
    shippingCost !== undefined
      ? `<tr>
          <td style="${mono}padding:6px 0;color:#555555;">Shipping</td>
          <td style="${mono}padding:6px 0;color:#555555;text-align:right;">${shippingCost === 0 ? "Free" : fmt(shippingCost)}</td>
        </tr>`
      : "";

  const addressBlock = address
    ? `<p style="${mono}margin:32px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555555;">Ships to</p>
       <p style="${mono}margin:0;">
         ${session.customer_details?.name || ""}<br>
         ${address.line1}${address.line2 ? "<br>" + address.line2 : ""}<br>
         ${address.city}, ${address.state} ${address.postal_code}<br>
         ${address.country}
       </p>
       <p style="${mono}margin:16px 0 0;color:#555555;">We'll send a tracking number when your order ships.</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Order confirmed</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:48px 24px 64px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td>

              <img src="${siteUrl}/images/npp-logo.png" alt="No Picnic Press" width="150" style="display:block;margin-bottom:40px;border:0;">

              <h1 style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:normal;margin:0 0 8px;letter-spacing:-0.01em;color:#000000;">Order confirmed.</h1>
              <p style="${mono}margin:0 0 36px;color:#555555;">Hi ${name}, thanks for your order.</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #000000;">
                ${itemRows}
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;">
                ${discountRow}
                ${shippingRow}
                <tr>
                  <td style="${mono}padding:10px 0;border-top:2px solid #000000;font-weight:bold;">Total</td>
                  <td style="${mono}padding:10px 0;border-top:2px solid #000000;font-weight:bold;text-align:right;">${fmt(session.amount_total)}</td>
                </tr>
              </table>

              ${addressBlock}

              ${downloadLinks.length > 0 ? `
              <p style="${mono}margin:40px 0 6px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555555;">Your downloads</p>
              <p style="${mono}margin:0 0 12px;color:#555555;font-size:13px;">Links expire in 72 hours. Reply to this email if you need them resent.</p>
              ${downloadLinks.map(({ name, formats }) => `
                <p style="${mono}margin:0 0 4px;font-weight:bold;">${name}</p>
                <p style="${mono}margin:0 0 16px;">
                  ${formats.map(({ format, url }) =>
                    `<a href="${url}" style="color:#000000;text-decoration:underline;margin-right:16px;">${FORMAT_LABELS[format] || format}</a>`
                  ).join("")}
                </p>
              `).join("")}` : ""}

              <p style="${mono}margin:48px 0 0;">— npp</p>

            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
