// Drip campaign email templates for No Picnic Press
// Matches the brand style of lib/orderEmail.js:
//   - Courier New monospace, 14px, black on white
//   - Logo at top (150px), signed "— npp"
//   - Max-width 520px centered
//   - Dark green CTAs (#1a6e3c)

const siteUrl = "https://nopicnicpress.com";

const mono =
  "font-family:'Courier New',Courier,monospace;font-size:14px;color:#000000;line-height:1.6;";

const monoMuted =
  "font-family:'Courier New',Courier,monospace;font-size:13px;color:#555555;line-height:1.6;";

const label =
  "font-family:'Courier New',Courier,monospace;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555555;";

const btn =
  "display:inline-block;background:#1a6e3c;color:#ffffff !important;font-family:'Courier New',Courier,monospace;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:2px;letter-spacing:0.02em;";

// transactional: true omits the unsubscribe footer (for order-triggered emails)
function shell(body, { transactional = false } = {}) {
  const footer = transactional
    ? `<p style="${monoMuted}margin:16px 0 0;font-size:12px;">No Picnic Press · Berkeley, CA</p>`
    : `<p style="${monoMuted}margin:16px 0 0;font-size:12px;">
         No Picnic Press · Berkeley, CA<br>
         <a href="${siteUrl}/unsubscribe?email={{email}}" style="color:#555555;">Unsubscribe</a>
       </p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:48px 24px 64px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
          <tr>
            <td>
              <img src="${siteUrl}/images/npp-logo.png" alt="No Picnic Press" width="150" style="display:block;margin-bottom:40px;border:0;">
              ${body}
              <p style="${mono}margin:48px 0 0;">— npp</p>
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── 1. New site announcement ─────────────────────────────────────────────────
// Subject: "The new nopicnicpress.com is here"
// Send to: all subscribed contacts
// Trigger: manually via POST /api/drip/announce (admin only)

export function announcementEmail(firstName = "there") {
  return shell(`
    <h1 style="${mono}font-size:20px;font-weight:normal;margin:0 0 24px;letter-spacing:-0.01em;">
      The new nopicnicpress.com is here.
    </h1>

    <p style="${mono}margin:0 0 16px;">Hey ${firstName},</p>

    <p style="${mono}margin:0 0 16px;">
      We rebuilt the site. Faster, cleaner, easier to navigate — everything a small press
      bookstore should be, and nothing it shouldn't.
    </p>

    <p style="${mono}margin:0 0 32px;">
      Same books. Same ideas. New coat of paint. Come take a look.
    </p>

    <a href="${siteUrl}" style="${btn}">Shop the new site →</a>

    <p style="${monoMuted}margin:32px 0 0;">
      Questions or feedback? Just reply here.
    </p>
  `);
}

// ─── 2. Shipment arrival day ──────────────────────────────────────────────────
// Subject: "Your order is arriving today"
// Send to: individual customer on estimated delivery date
// Trigger: manually via POST /api/drip/arrival (admin) or Shippo delivery webhook

export function shipmentArrivalEmail(
  firstName = "there",
  items = [],
  trackingUrl = null
) {
  const itemBlock =
    items.length > 0
      ? `<p style="${label}margin:32px 0 6px;">What's inside</p>
         <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #000000;margin-bottom:32px;">
           ${items
             .map(
               (name) =>
                 `<tr><td style="${mono}padding:8px 0;border-bottom:1px solid #e5e5e5;">${name}</td></tr>`
             )
             .join("")}
         </table>`
      : "";

  const trackBlock = trackingUrl
    ? `<p style="${monoMuted}margin:24px 0 0;"><a href="${trackingUrl}" style="color:#000000;text-decoration:underline;">Track your package →</a></p>`
    : "";

  return shell(`
    <h1 style="${mono}font-size:20px;font-weight:normal;margin:0 0 24px;letter-spacing:-0.01em;">
      Your order is arriving today.
    </h1>

    <p style="${mono}margin:0 0 16px;">Hey ${firstName},</p>

    <p style="${mono}margin:0 0 8px;">
      Good news — your No Picnic Press order is out for delivery today.
      Keep an eye out.
    </p>

    <p style="${mono}margin:0 0 0;">
      We hope it's everything you were expecting.
    </p>

    ${itemBlock}

    <a href="${siteUrl}" style="${btn}">Browse the full catalog →</a>

    ${trackBlock}

    <p style="${monoMuted}margin:32px 0 0;">
      Something wrong with your order? Just reply and we'll sort it out.
    </p>
  `, { transactional: true });
}

// ─── 3. Shipping confirmation + welcome ───────────────────────────────────────
// Subject: "Your order is on its way"
// Send to: individual customer when their order ships
// Trigger: manually via POST /api/drip/ship (admin)
// Note: fulfills the "we'll send a tracking number when your order ships"
//       promise made in the order confirmation email

export function shippingConfirmationEmail(
  firstName = "there",
  items = [],
  trackingNumber = null,
  trackingUrl = null,
  carrier = null
) {
  const itemBlock =
    items.length > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:2px solid #000000;margin-bottom:32px;">
           ${items
             .map(
               (name) =>
                 `<tr><td style="${mono}padding:8px 0;border-bottom:1px solid #e5e5e5;">${name}</td></tr>`
             )
             .join("")}
         </table>`
      : `<p style="${mono}margin:0 0 32px;"></p>`;

  const trackingBlock = trackingNumber
    ? `<p style="${label}margin:0 0 6px;">${carrier ? carrier + " " : ""}Tracking</p>
       <p style="${mono}margin:0 0 ${trackingUrl ? "8px" : "32px"};">${trackingNumber}</p>
       ${trackingUrl ? `<p style="${mono}margin:0 0 32px;"><a href="${trackingUrl}" style="color:#000000;text-decoration:underline;">Track your package →</a></p>` : ""}`
    : trackingUrl
    ? `<p style="${mono}margin:0 0 32px;"><a href="${trackingUrl}" style="color:#000000;text-decoration:underline;">Track your package →</a></p>`
    : "";

  return shell(`
    <h1 style="${mono}font-size:20px;font-weight:normal;margin:0 0 24px;letter-spacing:-0.01em;">
      Your order is on its way.
    </h1>

    <p style="${mono}margin:0 0 16px;">Hey ${firstName},</p>

    <p style="${mono}margin:0 0 16px;">Your order is headed your way!</p>

    ${itemBlock}

    ${trackingBlock}

    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="border-top:1px solid #e5e5e5;padding-top:28px;">

        <p style="${label}margin:0 0 12px;">While you wait</p>

        <p style="${mono}margin:0 0 12px;">
          No Picnic Press is a small publishing company out of Berkeley. We make books
          about naming, language, and the creative work that goes into building things
          people care about.
        </p>

        <p style="${mono}margin:0 0 28px;">
          If you're into that kind of thing, we write about it on the blog.
          Worth a look between now and when your package arrives.
        </p>

        <a href="${siteUrl}/blog" style="${btn}">Read the blog →</a>

      </td></tr>
    </table>

    <p style="${monoMuted}margin:32px 0 0;">
      Questions about your order? Just reply here.
    </p>
  `, { transactional: true });
}

// ─── 4. 10-day review request ─────────────────────────────────────────────────
// Subject: "A quick favor?"
// Send to: customers whose physical order arrived ~10 days ago
// Trigger: Vercel Cron → GET /api/drip/review-request (daily at 10am UTC)

export function reviewRequestEmail(firstName = "there", items = []) {
  const productName =
    items.length === 1
      ? items[0]
      : items.length > 1
      ? `${items[0]} and ${items.length - 1} other item${items.length > 2 ? "s" : ""}`
      : "your recent order";

  return shell(`
    <h1 style="${mono}font-size:20px;font-weight:normal;margin:0 0 24px;letter-spacing:-0.01em;">
      A quick favor?
    </h1>

    <p style="${mono}margin:0 0 16px;">Hey ${firstName},</p>

    <p style="${mono}margin:0 0 16px;">
      It's been about ten days since ${productName} landed on your doorstep.
      Hopefully you've had a chance to dig in.
    </p>

    <p style="${mono}margin:0 0 32px;">
      If you've got a minute, a review goes a long way — it helps other readers
      figure out if it's the right book for them, and it helps us know what's
      working. Even a sentence is useful.
    </p>

    <a href="${siteUrl}/reviews" style="${btn}">Leave a review →</a>

    <p style="${monoMuted}margin:32px 0 0;">
      No obligation. And if you have questions or thoughts about the book itself,
      just reply here — we actually read these.
    </p>
  `);
}
