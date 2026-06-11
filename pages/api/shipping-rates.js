// Fetches live shipping rates from Shippo based on destination address and parcel weight.
// Domestic: USPS (Media Mail, Priority, Express)
// International: UPS (Worldwide Expedited, Worldwide Express)
// Requires SHIPPO_API_KEY and NPP_ORIGIN_ZIP env vars.

const USPS_DOMESTIC = [
  "usps_media_mail",
  "usps_ground_advantage", // interim: shown as "Standard Shipping" until Media Mail resolves in Shippo
  "usps_priority",
  "usps_priority_express",
];
const UPS_INTL = [
  "ups_worldwide_expedited",
  "ups_worldwide_express",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { address, weightOz } = req.body;
  if (!address || !weightOz) return res.status(400).json({ error: "Missing address or weight" });

  const isIntl = address.country !== "US";
  const allowedTokens = isIntl ? UPS_INTL : USPS_DOMESTIC;
  const allowedProvider = isIntl ? "UPS" : "USPS";

  let shippoRes;
  try {
    shippoRes = await fetch("https://api.goshippo.com/shipments/", {
      method: "POST",
      headers: {
        Authorization: `ShippoToken ${process.env.SHIPPO_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address_from: {
          name: "No Picnic Press",
          street1: "1715 9th St.",
          city: "Berkeley",
          state: "CA",
          zip: process.env.NPP_ORIGIN_ZIP || "94710",
          country: "US",
        },
        address_to: {
          name: "Customer",
          zip: address.zip || "",
          country: address.country,
          ...(address.street1 && { street1: address.street1 }),
          ...(address.city && { city: address.city }),
          ...(address.state && { state: address.state }),
        },
        parcels: [
          {
            length: "12",
            width: "9",
            height: "2",
            distance_unit: "in",
            weight: String(weightOz),
            mass_unit: "oz",
          },
        ],
        async: false,
      }),
    });
  } catch (err) {
    console.error("Shippo fetch error:", err);
    return res.status(502).json({ error: "Could not reach shipping provider" });
  }

  if (!shippoRes.ok) {
    const text = await shippoRes.text();
    console.error("Shippo error response:", text);
    return res.status(502).json({ error: "Shipping provider error" });
  }

  const data = await shippoRes.json();

  // Diagnostic logging — remove once rates are confirmed working
  console.log("[shipping-rates] shipment status:", data.status, "| country:", address.country, "| zip:", address.zip, "| weightOz:", weightOz);
  console.log("[shipping-rates] address_from validation:", data.address_from?.validation_results?.is_valid, "| address_to validation:", data.address_to?.validation_results?.is_valid);
  console.log("[shipping-rates] raw rates:", (data.rates || []).map((r) => `${r.provider}/${r.servicelevel?.token}=${r.amount} (${r.object_status})`).join(" | ") || "(none)");
  if (data.messages?.length) console.log("[shipping-rates] messages:", JSON.stringify(data.messages));

  const toRateShape = (r) => ({
    token: r.object_id,
    serviceToken: r.servicelevel.token,
    service: r.servicelevel.token === "usps_ground_advantage" ? "Standard Shipping" : r.servicelevel.name,
    amount: r.amount,
    currency: r.currency,
    estimatedDays: r.estimated_days || null,
    durationTerms: r.servicelevel.token === "usps_ground_advantage" ? "2–8 business days" : (r.duration_terms || null),
  });

  const allProviderRates = (data.rates || []).filter(
    (r) => r.provider === allowedProvider && r.amount
  );

  let rates = allProviderRates
    .filter((r) => allowedTokens.includes(r.servicelevel?.token))
    .map(toRateShape)
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

  // Fallback: if the token allow-list filtered everything out, return whatever
  // the carrier returned so the checkout doesn't break on new service types.
  if (rates.length === 0 && allProviderRates.length > 0) {
    console.warn("[shipping-rates] allow-list filtered all rates — returning all provider rates as fallback");
    rates = allProviderRates.map(toRateShape).sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));
  }

  res.json({ rates });
}
