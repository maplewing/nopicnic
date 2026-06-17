// POST /api/admin/send-test-emails
// Sends preview versions of all drip emails to a given address.
// Body: { to }

import { Resend } from "resend";
import { checkAdminAuth } from "../../../lib/adminAuth";
import {
  shippingConfirmationEmail,
  shipmentArrivalEmail,
  reviewRequestEmail,
} from "../../../lib/dripEmails";
import { products } from "../../../data/products";

const resend = new Resend(process.env.RESEND_API_KEY);

const MOCK = {
  firstName: "Eli",
  items: ["Don't Call It That"],
  trackingNumber: "9400111899223397988345",
  trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400111899223397988345",
  carrier: "USPS",
  promoCode: "PREVIEW20",
  promoExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  }),
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!checkAdminAuth(req)) return res.status(401).json({ error: "Unauthorized" });

  const to = req.body?.to;
  if (!to) return res.status(400).json({ error: "to required" });

  // Fetch real blog posts for the shipping confirmation
  let recentPosts = [];
  try {
    const wpRes = await fetch(
      "https://www.ahundredmonkeys.com/wp-json/wp/v2/posts?per_page=2&orderby=date&order=desc&_embed=wp:featuredmedia&author=5"
    );
    if (wpRes.ok) {
      const posts = await wpRes.json();
      recentPosts = posts.map((p) => ({
        title: p.title?.rendered?.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n)).replace(/&amp;/g, "&").replace(/&quot;/g, '"') || "",
        link: p.link,
        image: p._embedded?.["wp:featuredmedia"]?.[0]?.source_url || null,
      }));
    }
  } catch (_) {}

  const suggestedProducts = products
    .filter((p) => p.inStock && !p.isService && !MOCK.items.some((i) => i.toLowerCase().includes(p.name.toLowerCase())))
    .slice(0, 2)
    .map((p) => ({
      name: p.name,
      subtitle: p.subtitle || null,
      slug: p.slug,
      image: p.images?.[0] ? `https://nopicnicpress.com${p.images[0]}` : null,
    }));

  const emails = [
    {
      subject: "[PREVIEW] Your No Picnic Press order is on its way",
      html: shippingConfirmationEmail(
        MOCK.firstName, MOCK.items,
        MOCK.trackingNumber, MOCK.trackingUrl, MOCK.carrier,
        recentPosts, suggestedProducts
      ),
    },
    {
      subject: "[PREVIEW] Your No Picnic Press order is arriving today",
      html: shipmentArrivalEmail(
        MOCK.firstName, MOCK.items,
        MOCK.trackingUrl, MOCK.promoCode, MOCK.promoExpiry
      ),
    },
    {
      subject: "[PREVIEW] So, what do you think?",
      html: reviewRequestEmail(MOCK.firstName, MOCK.items),
    },
  ];

  const results = [];
  for (const email of emails) {
    const { error } = await resend.emails.send({
      from: "No Picnic Press <orders@nopicnicpress.com>",
      to,
      ...email,
    });
    results.push({ subject: email.subject, error: error?.message || null });
  }

  return res.status(200).json({ results });
}
