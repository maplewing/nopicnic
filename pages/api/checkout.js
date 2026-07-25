import Stripe from "stripe";
import {
  getRates,
  validateCart,
  FREE_RATE,
  FREE_SHIPPING_CODE,
  FREE_SHIPPING_MINIMUM,
} from "../../lib/shippingRates";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { items, selectedRate, address, promoCode } = req.body;

  // Prices, price ids and stock come from data/products.js, never from the
  // browser — a stale cart in localStorage can hold weeks-old prices.
  const cart = validateCart(items);
  if (cart.error) return res.status(400).json({ error: cart.error });

  const { lines, subtotal, hasPhysical } = cart;

  const line_items = lines.map((l) => ({
    price: l.product.stripePriceId,
    quantity: l.qty,
  }));

  let shipping_options;
  let shipTo = null;

  if (hasPhysical) {
    const country = address?.country;
    if (!country) return res.status(400).json({ error: "Choose a shipping country." });

    const rate = await resolveShippingRate({
      country,
      zip: address?.zip,
      lines,
      subtotal,
      selectedToken: selectedRate?.token,
      selectedService: selectedRate?.serviceToken,
      promoCode,
    });
    if (rate.error) return res.status(400).json({ error: rate.error });

    // Stripe collects the real address after this point. Restricting it to the
    // country we quoted keeps the rate charged and the destination in sync.
    shipTo = country;
    shipping_options = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: Math.round(parseFloat(rate.amount) * 100),
            currency: "usd",
          },
          display_name: rate.service,
          ...(rate.estimatedDays && {
            delivery_estimate: {
              minimum: { unit: "business_day", value: rate.estimatedDays },
              maximum: { unit: "business_day", value: rate.estimatedDays + 2 },
            },
          }),
        },
      },
    ];
  } else {
    shipping_options = [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: 0, currency: "usd" },
          display_name: "Digital delivery",
        },
      },
    ];
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      line_items,
      ...(shipTo && {
        shipping_address_collection: { allowed_countries: [shipTo] },
      }),
      shipping_options,
      automatic_tax: { enabled: true },
      saved_payment_method_options: { payment_method_save: "disabled" },
      allow_promotion_codes: true,
      return_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      customer_creation: "always",
      metadata: {
        quoted_country: shipTo || "",
        quoted_zip: address?.zip || "",
      },
    });
  } catch (err) {
    console.error("Stripe checkout error:", err.message);
    return res.status(500).json({ error: err.message });
  }

  res.json({ clientSecret: session.client_secret });
}

// Re-fetches live rates and matches the customer's pick against them, so the
// amount charged is one we actually quoted rather than one the browser sent.
async function resolveShippingRate({ country, zip, lines, subtotal, selectedToken, selectedService, promoCode }) {
  if (selectedToken === FREE_RATE.token) {
    const code = String(promoCode || "").trim().toUpperCase();
    if (code !== FREE_SHIPPING_CODE) return { error: "Invalid promo code." };
    if (country !== "US") return { error: "Free shipping is for US orders only." };
    if (subtotal < FREE_SHIPPING_MINIMUM) {
      return { error: `${FREE_SHIPPING_CODE} applies to orders of $${FREE_SHIPPING_MINIMUM} or more.` };
    }
    return FREE_RATE;
  }

  let rates;
  try {
    rates = await getRates({ country, zip, lines });
  } catch (err) {
    console.error("Shipping rate error during checkout:", err.message);
    return { error: "Couldn't confirm shipping rates. Please try again." };
  }

  if (!rates.length) return { error: "No shipping options available for that address." };

  // Rate tokens from the carriers expire, so fall back to matching the service
  // rather than failing a customer who sat on the page too long.
  const match =
    rates.find((r) => r.token === selectedToken) ||
    rates.find((r) => r.serviceToken && r.serviceToken === selectedService);
  if (!match) return { error: "That shipping option is no longer available. Please pick another." };

  return match;
}
