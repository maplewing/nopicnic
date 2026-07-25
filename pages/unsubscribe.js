import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Unsubscribe() {
  const router = useRouter();
  const { email, token } = router.query;
  // Mail clients prefetch links, so the opt-out is confirmed by a click here
  // rather than happening on page load.
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (router.isReady && (!email || !token)) setStatus("invalid");
  }, [router.isReady, email, token]);

  async function confirm() {
    setStatus("working");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setStatus("error");
        return;
      }
      setStatus("done");
    } catch {
      setError("Something went wrong.");
      setStatus("error");
    }
  }

  return (
    <>
      <Head>
        <title>Unsubscribe — No Picnic Press</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="about-page legal-page" style={{ maxWidth: 520 }}>
        <h1>Unsubscribe</h1>

        {status === "invalid" && (
          <p>
            This link is missing something. Email{" "}
            <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a> and we&rsquo;ll take
            you off the list by hand.
          </p>
        )}

        {(status === "idle" || status === "working") && email && (
          <>
            <p>
              Unsubscribe <strong>{email}</strong> from No Picnic Press emails? You&rsquo;ll
              still get receipts and shipping updates for anything you order — those aren&rsquo;t
              marketing and we can&rsquo;t not send them.
            </p>
            <button
              className="btn-primary"
              onClick={confirm}
              disabled={status === "working"}
              style={{ maxWidth: 280 }}
            >
              {status === "working" ? "One moment…" : "Yes, unsubscribe me"}
            </button>
          </>
        )}

        {status === "done" && (
          <p>
            Done — <strong>{email}</strong> is unsubscribed. Sorry to see you go. If it was a
            mistake, the signup form in the footer will put you back.
          </p>
        )}

        {status === "error" && (
          <>
            <p>{error}</p>
            <p>
              Email <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a> and
              we&rsquo;ll sort it out.
            </p>
          </>
        )}

        <p style={{ marginTop: 32 }}>
          <Link href="/">Back to shop</Link>
        </p>
      </div>
    </>
  );
}
