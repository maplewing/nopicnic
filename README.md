# No Picnic Press

Next.js storefront with Stripe Checkout (Apple Pay + PayPal), Kit email signups, and Pirateship for fulfillment.

## Stack
- **Next.js 14** — framework + API routes
- **Stripe Checkout** — payments (card, Apple Pay, PayPal, discount codes)
- **Kit (ConvertKit)** — email list + drip sequences
- **Vercel** — hosting (free)
- **Pirateship** — shipping labels (manual, free)
- **Zapier** — Stripe → Kit post-purchase trigger (free tier)

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
- `KIT_API_KEY` — from Kit account settings
- `KIT_FORM_ID` — the ID of your signup form in Kit

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

### 7. Zapier: Stripe → Kit (post-purchase drip)
Create a Zap:
- **Trigger**: Stripe → Payment Intent Succeeded
- **Action**: Kit → Add Subscriber to Form (with tag: "customer")
The Kit sequence (Day 3 review ask, Day 14 referral code, Day 30 repeat nudge)
is set up in Kit directly on that form/tag.

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
