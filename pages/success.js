import Head from "next/head";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function Success() {
  const router = useRouter();

  useEffect(() => {
    const { session_id } = router.query;
    if (!session_id) return;

    function fire() {
      fetch(`/api/session-summary?session_id=${session_id}`)
        .then((r) => r.json())
        .then(({ total, currency, contentIds }) => {
          window.fbq(
            "track",
            "Purchase",
            {
              value: total,
              currency: currency || "USD",
              content_ids: contentIds,
              content_type: "product",
            },
            { eventID: session_id }
          );
        })
        .catch(() => {});
    }

    if (typeof window.fbq === "function") {
      fire();
    } else {
      // Pixel script may still be loading — poll until ready
      const interval = setInterval(() => {
        if (typeof window.fbq === "function") {
          clearInterval(interval);
          fire();
        }
      }, 200);
      setTimeout(() => clearInterval(interval), 5000);
    }
  }, [router.query.session_id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Head>
        <title>Order confirmed — No Picnic Press</title>
      </Head>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>
          Order confirmed
        </p>
        <h1 style={{ fontSize: 22, fontWeight: 400, marginBottom: 24 }}>
          Thank you.
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: "#555", marginBottom: 32 }}>
          You'll receive a confirmation email shortly. For physical orders, we'll send a tracking number once your order ships. For digital orders, your download links will be in your confirmation email. Questions? <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a>
        </p>
        <Link href="/" style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #000" }}>
          Back to shop
        </Link>
      </div>
    </>
  );
}
