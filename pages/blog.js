import Head from "next/head";
import { useState, useEffect } from "react";

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function stripHtml(str) {
  return (str || "").replace(/<[^>]+>/g, "").replace(/\[&hellip;\]/g, "…").trim();
}

export default function Blog() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    fetch(
      "https://www.ahundredmonkeys.com/wp-json/wp/v2/posts?author=5&per_page=20&orderby=date&order=desc&_fields=id,title,excerpt,date,link"
    )
      .then((r) => r.json())
      .then((data) => setPosts(data))
      .catch(() => setPosts([]));
  }, []);

  return (
    <>
      <Head>
        <title>Blog — No Picnic Press</title>
        <meta name="description" content="Writing on naming, branding, and language by Eli Altman." />
      </Head>
      <div className="about-page">
        <h1>Blog</h1>
        <div style={{ marginTop: 32 }}>
          {posts === null && (
            <p style={{ color: "var(--gray-mid)" }}>Loading…</p>
          )}
          {posts !== null && posts.length === 0 && (
            <p>No posts found.</p>
          )}
          {posts !== null && posts.map((post) => (
            <div
              key={post.id}
              style={{
                borderBottom: "1px solid var(--gray-border)",
                paddingBottom: 32,
                marginBottom: 32,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--gray-mid)", marginBottom: 6 }}>
                {fmtDate(post.date)}
              </div>
              <a
                href={post.link}
                target="_blank"
                rel="noopener"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--black)",
                  display: "block",
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}
              >
                {post.title?.rendered || ""}
              </a>
              {post.excerpt?.rendered && (
                <p style={{ fontSize: 16, lineHeight: 1.7, color: "#333", margin: 0 }}>
                  {stripHtml(post.excerpt.rendered)}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
