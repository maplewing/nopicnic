// Loops contact signup
// Docs: https://loops.so/docs/api-reference/create-contact
// Set LOOPS_API_KEY in your .env.local

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, firstName } = req.body;

  try {
    const response = await fetch("https://app.loops.so/api/v1/contacts/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
      },
      body: JSON.stringify({
        email,
        firstName: firstName || "",
        subscribed: true,
        source: "website",
      }),
    });

    const data = await response.json();

    // Loops returns 409 if contact already exists — treat as success
    if (!response.ok && response.status !== 409) {
      console.error("Loops error:", data);
      return res.status(500).json({ error: "Subscription failed" });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
}
