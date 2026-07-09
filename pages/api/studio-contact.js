import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { name, studio, description, email, website } = req.body;

  if (!name || !email || !description) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  // Honeypot: bots fill hidden fields, humans don't
  if (website) return res.status(200).json({ ok: true });

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: "noreply@nopicnicpress.com",
      to: "hi@nopicnicpress.com",
      replyTo: email,
      subject: `Studio Sessions inquiry from ${name}`,
      text: `Name: ${name}\nStudio / Company: ${studio || "—"}\nEmail: ${email}\n\n${description}`,
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Studio contact error:", err);
    return res.status(500).json({ error: "Failed to send" });
  }
}
