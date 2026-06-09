import Head from "next/head";

// Update this list as needed
const stockists = [
  { name: "Magma — Covent Garden", location: "London, UK", url: "https://magma-shop.com" },
  { name: "Magma — Holborn", location: "London, UK", url: "https://magma-shop.com" },
  { name: "Magma — Manchester", location: "Manchester, UK", url: "https://magma-shop.com" },
  { name: "Buchhandlung Walther König", location: "Köln, Germany", url: "https://www.buchhandlung-walther-koenig.de" },
  { name: "Basheer Graphic Books", location: "Singapore", url: "https://www.basheergraphic.com" },
  { name: "Casa Bosques", location: "Mexico City, Mexico", url: "https://casabosques.net" },
  { name: "Swipe Design", location: "Toronto, Canada", url: "https://www.swipe.com" },
  { name: "Standards Manual", location: "Brooklyn, NY", url: "https://standardsmanual.com" },
];

export default function Stockists() {
  return (
    <>
      <Head>
        <title>Stockists — No Picnic Press</title>
      </Head>
      <div className="stockists-page">
        <h1 style={{ fontSize: 18, fontWeight: 400, marginBottom: 16 }}>You can find No Picnic Press books at these fine establishments.</h1>
        <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 32 }}>
          If you live in or near these countries, it will likely be faster and more cost-effective to buy directly from a stockist near you.
        </p>
        <img src="/images/casa-bosques.jpg" alt="Casa Bosques, Mexico City" style={{ width: "100%", marginBottom: 40, display: "block" }} />
        {stockists.length === 0 ? (
          <p style={{ fontSize: 14, color: "#999" }}>Coming soon.</p>
        ) : (
          <ul className="stockist-list">
            {stockists.map((s, i) => (
              <li key={i}>
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noopener">{s.name}</a>
                ) : (
                  s.name
                )}
                {s.location && <span style={{ color: "#999" }}> — {s.location}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
