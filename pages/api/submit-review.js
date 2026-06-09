import { Resend } from "resend";
import { createReviewToken } from "../../lib/reviewToken";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { author, product, rating, text } = req.body;

  if (!author?.trim() || !product?.trim() || !text?.trim()) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Invalid rating" });
  }

  const review = {
    author: author.trim(),
    product: product.trim(),
    rating,
    text: text.trim(),
  };

  const token = createReviewToken(review);
  const siteUrl = process.env.NEXT_PUBLIC_URL || "https://nopicnicpress.com";
  const approveUrl = `${siteUrl}/api/review-action?action=approve&token=${token}`;
  const rejectUrl = `${siteUrl}/api/review-action?action=reject&token=${token}`;
  const ratingStars = "★".repeat(rating) + "☆".repeat(5 - rating);

  const { error } = await resend.emails.send({
    from: "No Picnic Press <orders@nopicnicpress.com>",
    to: "nopicnicpress@gmail.com",
    subject: `New review: ${product} — ${author}`,
    html: `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 16px; color: #111;">
        <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${product}</h2>
        <p style="font-size: 20px; margin: 0 0 16px; letter-spacing: 2px;">${ratingStars}</p>
        <blockquote style="border-left: 3px solid #ddd; margin: 0 0 16px; padding: 0 0 0 16px; font-style: italic; color: #333; line-height: 1.6;">
          "${review.text}"
        </blockquote>
        <p style="font-size: 14px; color: #666; margin-bottom: 32px;">— ${review.author}</p>
        <table>
          <tr>
            <td style="padding-right: 12px;">
              <a href="${approveUrl}" style="display: inline-block; background: #1a6e3c; color: #fff; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 2px;">
                👍 Publish
              </a>
            </td>
            <td>
              <a href="${rejectUrl}" style="display: inline-block; background: #eee; color: #333; text-decoration: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 2px;">
                👎 Decline
              </a>
            </td>
          </tr>
        </table>
        <p style="font-size: 11px; color: #999; margin-top: 32px;">Links expire in 7 days.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error on review submission:", error);
    return res.status(500).json({ error: "Failed to send" });
  }

  res.status(200).json({ ok: true });
}
