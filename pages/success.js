import Head from "next/head";
import Link from "next/link";

export default function Success() {
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
          You'll receive a confirmation email shortly. For physical orders, we'll send a tracking number once your order ships. For digital orders, your download links will be in your confirmation email. Questions? <a href="mailto:nopicnicpress@gmail.com">nopicnicpress@gmail.com</a>
        </p>
        <Link href="/" style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #000" }}>
          Back to shop
        </Link>
      </div>
    </>
  );
}
