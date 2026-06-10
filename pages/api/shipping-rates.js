// Fetches live USPS rates from Shippo based on destination address and parcel weight.
// Requires SHIPPO_API_KEY and NPP_ORIGIN_ZIP env vars.

const USPS_DOMESTIC = ["usps_media_mail", "usps_priority", "usps_express"];
const USPS_INTL = [
  "usps_first_class_package_international_service",
  "usps_priority_mail_international",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { address, weightOz } = req.body;
  if (!address || !weightOz) return res.status(400).json({ error: "Missing address or weight" });

  const isIntl = address.country !== "US";
  const allowedTokens = isIntl ? USPS_INTL : USPS_DOMESTIC;

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
          city: "Berkeley",
          state: "CA",
          zip: process.env.NPP_ORIGIN_ZIP || "94710",
          country: "US",
        },
        address_to: {
          name: "Customer",
          street1: address.street1 || "",
          city: address.city || "",
          state: address.state || "",
          zip: address.zip || "",
          country: address.country,
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

  const rates = (data.rates || [])
    .filter(
      (r) =>
        r.provider === "USPS" &&
        allowedTokens.includes(r.servicelevel?.token) &&
        r.amount
    )
    .map((r) => ({
      token: r.object_id,
      serviceToken: r.servicelevel.token,
      service: r.servicelevel.name,
      amount: r.amount,           // string, e.g. "5.34"
      currency: r.currency,
      estimatedDays: r.estimated_days || null,
      durationTerms: r.duration_terms || null,
    }))
    .sort((a, b) => parseFloat(a.amount) - parseFloat(b.amount));

  res.json({ rates });
}
