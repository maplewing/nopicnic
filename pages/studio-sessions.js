import Head from "next/head";
import { useState } from "react";

export default function StudioSessions() {
  const [form, setForm] = useState({ name: "", studio: "", description: "", email: "" });
  const [status, setStatus] = useState("idle");

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/studio-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <Head>
        <title>Studio Sessions — No Picnic Press</title>
      </Head>
      <div className="about-page">
        <h1>Studio Sessions</h1>

        <img
          src="/images/studio-session.png"
          alt="Studio session"
          style={{ width: "100%", display: "block", marginBottom: 32 }}
        />

        <p>
          I'm starting to do very limited consulting with people who run small creative studios
          and are looking to improve the way they do business. If that sounds like you, fill out
          the form below and I'll follow up with a few questions before we get started.
        </p>
        <p>
          Introductory work sessions are one hour and take place over video conference. The cost
          is $500 USD. Ideally you have something specific we can work on that will put $500 in
          perspective. Monthly and quarterly check-ins for progress monitoring and accountability
          are available after the first session.
        </p>

        {status === "success" ? (
          <p style={{ fontStyle: "italic" }}>Got it — I'll follow up soon.</p>
        ) : (
          <form onSubmit={handleSubmit} className="studio-form">
            <div className="studio-form-row">
              <label htmlFor="sf-name">Name</label>
              <input
                id="sf-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="studio-form-row">
              <label htmlFor="sf-studio">Studio / Company</label>
              <input
                id="sf-studio"
                name="studio"
                type="text"
                value={form.studio}
                onChange={handleChange}
              />
            </div>
            <div className="studio-form-row">
              <label htmlFor="sf-description">What do you want to work on?</label>
              <textarea
                id="sf-description"
                name="description"
                rows={5}
                value={form.description}
                onChange={handleChange}
                required
              />
            </div>
            <div className="studio-form-row">
              <label htmlFor="sf-email">Email</label>
              <input
                id="sf-email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <button type="submit" className="btn-primary" disabled={status === "loading"}>
              {status === "loading" ? "Sending…" : "Send"}
            </button>
            {status === "error" && (
              <p style={{ marginTop: 12, fontSize: 13, color: "#c00" }}>
                Something went wrong — please email{" "}
                <a href="mailto:nopicnicpress@gmail.com">nopicnicpress@gmail.com</a> directly.
              </p>
            )}
          </form>
        )}

        <p style={{ marginTop: 48 }}>
          If you'd rather read the book, check out{" "}
          <a href="/shop/run-studio-run">Run Studio Run</a>.
        </p>
        <p>
          If you want to get a sense for what it's like to work with me, read my{" "}
          <a href="https://businessofhome.com/boh/article/book-review" target="_blank" rel="noopener">
            interview with interior designer Stephanie Sabbe
          </a>{" "}
          in Business of Home or listen to the Run Studio Run podcast mini-series featuring
          conversations with designers Danielle Baskin, Chris Do, Eileen Tjan, and Fritz Mesenbrink,
          below.
        </p>

        <h2>Run Studio Run Podcast Mini-Series</h2>
        <p>
          A four part podcast mini-series following up on Run Studio Run. I spoke with four different
          studio leaders about their experience running creative businesses.
          Thanks to Audrey McGlinchy for editing.
        </p>

        <iframe
          allow="autoplay *; encrypted-media *; fullscreen *; clipboard-write"
          frameBorder="0"
          height="450"
          style={{ width: "100%", overflow: "hidden", borderRadius: 8, marginTop: 16 }}
          sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
          src="https://embed.podcasts.apple.com/us/podcast/the-run-studio-run-podcast/id1536158507"
        />
      </div>
    </>
  );
}
