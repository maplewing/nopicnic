import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { products } from "../data/products";

const reviewableProducts = [
  ...new Set(products.filter((p) => !p.isDigital).map((p) => p.name)),
];

export default function ReviewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    author: "",
    product: reviewableProducts[0] || "",
    rating: 5,
    text: "",
  });
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"

  useEffect(() => {
    if (router.query.product) {
      const match = reviewableProducts.find(
        (p) => p.toLowerCase().replace(/\s+/g, "-") === router.query.product
      );
      if (match) setForm((f) => ({ ...f, product: match }));
    }
  }, [router.query.product]);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/submit-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="container" style={{ maxWidth: 560, paddingTop: 64 }}>
        <h1>Thank you</h1>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--gray-mid)" }}>
          Your review has been submitted. We'll review it and add it to the site shortly.
        </p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Leave a Review — No Picnic Press</title>
      </Head>
      <div className="container" style={{ maxWidth: 560, paddingTop: 64 }}>
        <h1>Leave a Review</h1>
        <form onSubmit={handleSubmit} style={{ marginTop: 40 }}>
          <div className="studio-form-row">
            <label>Book</label>
            <select value={form.product} onChange={set("product")} style={{ border: "1px solid var(--gray-border)", padding: "10px 12px", fontSize: 14, fontFamily: "var(--font-body)", width: "100%", outline: "none", background: "var(--white)" }}>
              {reviewableProducts.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="studio-form-row">
            <label>Your name</label>
            <input
              type="text"
              value={form.author}
              onChange={set("author")}
              required
              placeholder="First name or full name"
            />
          </div>

          <div className="studio-form-row">
            <label>Rating</label>
            <div style={{ display: "flex", gap: 4, alignItems: "center", marginTop: 2 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, rating: n }))}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 28,
                    cursor: "pointer",
                    color: n <= form.rating ? "var(--black)" : "var(--gray-border)",
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                  aria-label={`${n} star${n !== 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="studio-form-row">
            <label>Review</label>
            <textarea
              value={form.text}
              onChange={set("text")}
              required
              style={{ minHeight: 160 }}
              placeholder="What did you think?"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={status === "loading"}
            style={{ marginTop: 16 }}
          >
            {status === "loading" ? "Submitting..." : "Submit review"}
          </button>

          {status === "error" && (
            <p style={{ fontSize: 13, color: "red", marginTop: 12 }}>
              Something went wrong. Please try again or email hi@nopicnicpress.com.
            </p>
          )}
        </form>
      </div>
    </>
  );
}
