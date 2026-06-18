import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

function sha256(value) {
  if (!value) return undefined;
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function sendCapiPurchase({ email, name, value, currency = "USD", contentIds, eventId, eventSourceUrl }) {
  if (!PIXEL_ID || !ACCESS_TOKEN) return;

  const [firstName = "", ...rest] = (name || "").split(" ");
  const lastName = rest.join(" ");

  const payload = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        event_source_url: eventSourceUrl || "https://nopicnicpress.com/success",
        action_source: "website",
        user_data: {
          em: sha256(email),
          fn: sha256(firstName),
          ln: sha256(lastName) || undefined,
        },
        custom_data: {
          value,
          currency,
          content_ids: contentIds,
          content_type: "product",
        },
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("Meta CAPI error:", text);
    }
  } catch (err) {
    console.error("Meta CAPI fetch failed:", err.message);
  }
}
