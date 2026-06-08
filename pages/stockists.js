import Head from "next/head";

// Update this list as needed
const stockists = [
  // { name: "Example Books", location: "San Francisco, CA", url: "https://examplebooks.com" },
];

export default function Stockists() {
  return (
    <>
      <Head>
        <title>Stockists — No Picnic Press</title>
      </Head>
      <div className="stockists-page">
        <h1 style={{ fontSize: 18, fontWeight: 400, marginBottom: 32 }}>Stockists</h1>
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
