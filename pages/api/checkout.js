import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { items } = req.body;

  const line_items = items.map((item) => ({
    price: item.stripePriceId,
    quantity: item.qty,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    payment_method_types: ["card", "paypal"],
    // Apple Pay is enabled automatically for card when on Safari/iOS
    shipping_address_collection: {
      allowed_countries: ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "NL", "SE", "NO", "DK"],
    },
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 500, currency: "usd" },
          display_name: "Standard shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 10 },
          },
        },
      },
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "Free shipping (orders $50+)",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 5 },
            maximum: { unit: "business_day", value: 10 },
          },
        },
      },
    ],
    allow_promotion_codes: true,  // enables your discount codes
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/`,
    // customer_email collected here feeds the Zapier → Kit trigger
    customer_creation: "always",
  });

  res.json({ url: session.url });
}
