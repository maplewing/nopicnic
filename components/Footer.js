import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "../data/products";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);

  async function handleSignup(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-links">
          <Link href="/shipping-returns">Shipping + Returns</Link>
          <a href={siteConfig.instagram} target="_blank" rel="noopener">Instagram</a>
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          <Link href="/stockists">Stockists</Link>
        </div>

        <div className="footer-signup">
          <h3>Stay in the loop</h3>
          {status === "success" ? (
            <p style={{ fontSize: 13, color: "#666" }}>Thank you!</p>
          ) : (
            <form className="signup-form" onSubmit={handleSignup}>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "..." : "Sign up"}
              </button>
              {status === "error" && (
                <p style={{ fontSize: 12, color: "red" }}>Something went wrong. Try again.</p>
              )}
            </form>
          )}
          <p style={{ fontSize: 11, color: "#999", marginTop: 8 }}>
            Very occasional updates. We will never share your information.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        <span>©2019 to ∞ all rights reserved</span>
        <span>No Picnic Press</span>
      </div>
    </footer>
  );
}
