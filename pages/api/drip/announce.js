// POST /api/drip/announce
// Admin-only. Sends the new-site announcement email to all subscribed
// Loops contacts via Resend's batch API.
//
// Usage (from your admin panel or curl):
//   curl -X POST https://nopicnicpress.com/api/drip/announce \
//     -H "Cookie: npp-admin-session=<token>"
//
// Loops contacts/search returns up to 100 results per page.
// For large lists, run multiple times with &page=2, &page=3, etc.
// (Add a `page` query param below once your list exceeds 100.)

import { Resend } from "resend";
import { checkAdminAuth } from "../../../lib/adminAuth";
import { announcementEmail } from "../../../lib/dripEmails";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  // Fetch subscribed contacts from Loops
  let contacts = [];
  try {
    const loopsRes = await fetch(
      "https://app.loops.so/api/v1/contacts/search?subscribed=true",
      {
        headers: {
          Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!loopsRes.ok) {
      const err = await loopsRes.json().catch(() => ({}));
      console.error("Loops contacts/search error:", err);
      return res.status(502).json({ error: "Failed to fetch contacts from Loops" });
    }

    contacts = await loopsRes.json();
  } catch (err) {
    console.error("Loops fetch error:", err);
    return res.status(500).json({ error: "Server error fetching contacts" });
  }

  if (!contacts.length) {
    return res.status(200).json({ sent: 0, message: "No subscribed contacts found" });
  }

  // Build per-contact email objects for Resend batch API
  const batch = contacts.map((contact) => ({
    from: "No Picnic Press <hi@nopicnicpress.com>",
    to: contact.email,
    subject: "The new nopicnicpress.com is here",
    html: announcementEmail(contact.firstName || "there"),
  }));

  // Resend batch: max 100 emails per call
  let sentCount = 0;
  const errors = [];

  for (let i = 0; i < batch.length; i += 100) {
    const chunk = batch.slice(i, i + 100);
    const { data, error } = await resend.batch.send(chunk);
    if (error) {
      console.error(`Resend batch error (chunk ${i / 100 + 1}):`, error);
      errors.push(error);
    } else {
      sentCount += chunk.length;
    }
  }

  return res.status(200).json({
    sent: sentCount,
    total: contacts.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
