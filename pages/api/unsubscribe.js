// Marks a Loops contact as unsubscribed. Reached from the opt-out link in the
// announcement and review-request emails, which carry an HMAC of the recipient's
// address so one person can't unsubscribe another.

import { verifyUnsubscribeToken } from "../../lib/unsubscribeToken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, token } = req.body || {};

  if (!verifyUnsubscribeToken(email, token)) {
    return res.status(400).json({ error: "This unsubscribe link isn't valid." });
  }

  try {
    const response = await fetch("https://app.loops.so/api/v1/contacts/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
      },
      body: JSON.stringify({ email, subscribed: false }),
    });

    // A contact we've never stored is already, functionally, unsubscribed.
    if (!response.ok && response.status !== 404) {
      const detail = await response.text();
      console.error("Loops unsubscribe failed:", response.status, detail);
      return res.status(502).json({ error: "Couldn't reach our email provider." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Unsubscribe error:", err.message);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
