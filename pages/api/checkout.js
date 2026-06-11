import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ALL_COUNTRIES = [
  "US", "CA", "GB", "AU", "NZ", "DE", "FR", "NL", "SE", "NO", "DK",
  "IE", "BE", "CH", "AT", "IT", "ES", "PT", "PL", "JP", "KR",
  "SG", "HK", "MX", "BR", "AR", "ZA", "IN",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { items, selectedRate, address } = req.body;

  const line_items = items.map((item) => ({
    price: item.stripePriceId,
    quantity: item.qty,
  }));

  // Build the single shipping option from the live rate the customer selected on /checkout.
  // Falls back to $0 for digital-only carts.
  const shipping_options = selectedRate
    ? [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: {
              amount: Math.round(parseFloat(selectedRate.amount) * 100),
              currency: "usd",
            },
            display_name: selectedRate.service,
            ...(selectedRate.estimatedDays && {
              delivery_estimate: {
                minimum: { unit: "business_day", value: selectedRate.estimatedDays },
                maximum: { unit: "business_day", value: selectedRate.estimatedDays + 2 },
              },
            }),
          },
        },
      ]
    : [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: "Digital delivery",
          },
        },
      ];

  const hasPhysical = items.some((i) => !i.isDigital);

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items,
      ...(hasPhysical && {
        shipping_address_collection: { allowed_countries: ALL_COUNTRIES },
      }),
      shipping_options,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      return_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      customer_creation: "always",
    });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ clientSecret: session.client_secret });
}
