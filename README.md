# No Picnic Press

Next.js storefront with Stripe Checkout (Apple Pay + PayPal), Loops for the
newsletter, Resend for order email, and Shippo/EasyPost for rates and labels.

## Stack
- **Next.js 14** — framework + API routes
- **Stripe Checkout** — payments (card, Apple Pay, PayPal, discount codes)
- **Resend** — all order and post-purchase email
- **Loops** — newsletter list only (see "Who sends what" below)
- **Shippo** — domestic rates, labels, delivery tracking
- **EasyPost** — international (UPS) rates
- **Upstash Redis** — sequential order numbers
- **Vercel** — hosting, cron jobs, blob storage

## Setup

### 1. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/nopicnicpress.git
cd nopicnicpress
npm install
```

### 2. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:
- `STRIPE_SECRET_KEY` — from Stripe dashboard → Developers → API keys
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — same place
- `NEXT_PUBLIC_URL` — your domain (https://nopicnicpress.com)
- `STRIPE_WEBHOOK_SECRET` — signing secret for the checkout webhook
- `RESEND_API_KEY` — sends every order and drip email
- `LOOPS_API_KEY` — newsletter contacts
- `SHIPPO_API_KEY` — domestic rates and delivery tracking
- `EASYPOST_API_KEY` — international rates
- `CRON_SECRET` — required, or the daily cron jobs 401 and silently do nothing
- `DOWNLOAD_TOKEN_SECRET` — signs digital download and unsubscribe links
- `BLOB_READ_WRITE_TOKEN` — stock levels and legacy records
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — order numbers
- `NEXT_PUBLIC_META_PIXEL_ID` / `META_CAPI_ACCESS_TOKEN` — optional; see privacy note below

### 3. Stripe products
In your Stripe dashboard, create a Product for each item in `data/products.js`.
Each product needs a Price. Copy the Price ID (starts with `price_`) into the
`stripePriceId` field for the matching product in `data/products.js`.

Enable PayPal in Stripe: Dashboard → Settings → Payment methods → PayPal.
Apple Pay works automatically on Safari when your domain is verified.

### 4. Add product images
Put your product images in `/public/images/`. Filenames should match what's
referenced in `data/products.js` (e.g. `dcit-cover.jpg`).

Add the NPP logo at `/public/images/npp-logo.png`.

### 5. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### 6. Deploy to Vercel
1. Push to GitHub
2. Connect repo at vercel.com
3. Add environment variables in Vercel project settings
4. Deploy — Vercel gives you a `.vercel.app` URL to test
5. Add your custom domain in Vercel → point nopicnicpress.com DNS there

## Who sends what

There is no Zapier, and Loops runs no automations. Everything a customer
receives after ordering is sent by this app through Resend:

| Email | Sent by | When |
|---|---|---|
| Order confirmation + download links | `api/webhook` | Stripe `checkout.session.completed` |
| Shipping confirmation | `api/admin/shipments` | You add tracking in the admin |
| Arrival + promo code | `api/drip/arrival` (cron) | Shippo reports the parcel delivered |
| Review request | `api/drip/review-request` (cron) | 9–11 days after purchase |
| Announcement | `api/drip/announce` | Manually, to newsletter subscribers only |

**Loops holds the newsletter list and nothing else.** Buying something records
the customer in Loops as `subscribed: false`; only the footer signup form sets
it true. `api/webhook` deliberately does not send a `purchase` event — if you
add one and wire a Loop to it, customers get two review asks and two discount
nudges, because the crons above already cover that ground.

The two crons need `CRON_SECRET` set in Vercel. Without it every invocation
401s and nothing is sent, with no error anywhere obvious.

Arrival email requires a **payment method on file at Shippo**
([billing](https://goshippo.com/user/billing/)). Rate lookups are free, but
tracking is not: without a card every lookup 401s with "Your account needs to
have a valid payment method on file to use this service", nothing is ever seen
as delivered, and the cron reports `trackingUnavailable` in its JSON response.
It's a billing gate, not a setting — there is nothing to switch on.

## Privacy

The Meta pixel and Conversions API are withheld from visitors in the EEA, the
UK, and Switzerland — see `lib/region.js`. There is no consent banner because
those visitors simply aren't tracked. If you ever add a banner, that geo-gate
is what to relax. Policy copy lives in `pages/policies.js`.

## Updating content

### Change a price or add a product
Edit `data/products.js`. Update the corresponding price in Stripe dashboard too.

### Update reviews or star rating
Edit the `reviews` array and `aggregateRating` object in `data/products.js`.

### Add/remove stockists
Edit the `stockists` array in `pages/stockists.js`.

### Update discount code
In Stripe dashboard → Coupons → create or update your code.
You can rotate it as often as you want from there.
