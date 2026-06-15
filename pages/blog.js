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


export default function Blog() {
  const [posts, setPosts] = useState(null);

  useEffect(() => {
    fetch("/api/blog-posts")
      .then((r) => r.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
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
        <p style={{ fontSize: 13, color: "var(--gray-mid)", marginTop: 8 }}>
          Posts open at{" "}
          <a href="https://www.ahundredmonkeys.com" target="_blank" rel="noopener">
            ahundredmonkeys.com
          </a>
        </p>
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
              {post.image && (
                <a href={post.link} target="_blank" rel="noopener" style={{ display: "block", marginBottom: 16 }}>
                  <img
                    src={post.image}
                    alt=""
                    style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }}
                  />
                </a>
              )}
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
                {post.title}
              </a>
              {post.excerpt && (
                <p style={{ fontSize: 16, lineHeight: 1.7, color: "#333", margin: 0 }}>
                  {post.excerpt}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
