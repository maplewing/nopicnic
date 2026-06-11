import Head from "next/head";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 — No Picnic Press</title>
      </Head>
      <div style={{ maxWidth: 500, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <img
          src="/images/simpsons-technical-difficulties.gif"
          alt="Technical difficulties"
          style={{ width: "100%", maxWidth: 400, marginBottom: 32 }}
        />
        <p style={{ fontSize: 13, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>
          that&rsquo;s a 404
        </p>
        <Link href="/" style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: "1px solid #000" }}>
          Back to shop
        </Link>
      </div>
    </>
  );
}
