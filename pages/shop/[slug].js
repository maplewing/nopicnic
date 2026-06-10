import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { products, reviews } from "../../data/products";
import { useCart } from "../../components/CartContext";
import { useState } from "react";

export async function getStaticPaths() {
  return {
    paths: products.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const product = products.find((p) => p.slug === params.slug);
  const reviewKey = product.reviewsFor || product.name;
  const productReviews = reviews.filter((r) => r.product === reviewKey);
  const otherProducts = products.filter((p) => p.slug !== params.slug && p.inStock).slice(0, 3);
  return { props: { product, productReviews, otherProducts } };
}

export default function ProductPage({ product, productReviews, otherProducts }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [activeImg, setActiveImg] = useState(0);
  const [showReviews, setShowReviews] = useState(false);

  function handleAdd() {
    addItem(product);
    router.push("/checkout");
  }

  const score = productReviews.length
    ? (productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length).toFixed(1)
    : null;
  const stars = score ? "★".repeat(Math.round(score)) + "☆".repeat(5 - Math.round(score)) : "";

  return (
    <>
      <Head>
        <title>{product.name} — No Picnic Press</title>
        <meta name="description" content={product.description} />
      </Head>

      <div className="container">
        <div className="product-page">
          <div className="product-images">
            <div className="product-image-main">
              {product.images?.[activeImg] && (
                <img src={product.images[activeImg]} alt={product.name} />
              )}
            </div>
            {product.images?.length > 1 && (
              <div style={{ display: "flex", gap: 8 }}>
                {product.images.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImg(i)}
                    style={{
                      width: 60,
                      height: 76,
                      background: "#f5f5f5",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: i === activeImg ? "1px solid #000" : "1px solid transparent",
                    }}
                  >
                    <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <h1>{product.name}</h1>
            {product.subtitle && (
              <p style={{ fontSize: 16, color: "#333", marginBottom: 16, lineHeight: 1.4 }}>{product.subtitle}</p>
            )}
            <p className="product-price">${product.price.toFixed(2)}</p>

            {productReviews.length > 0 && !product.hideReviews && (
              <button className="rating-bar" onClick={() => setShowReviews(true)} aria-label="Read all reviews">
                <span className="stars" aria-hidden>{stars}</span>
                <span className="rating-score">{score}/5</span>
                <span className="rating-count">({productReviews.length} {productReviews.length === 1 ? "review" : "reviews"})</span>
              </button>
            )}

            <p className="product-description">{product.description}</p>

            {product.inStock ? (
              <button className="btn-primary" onClick={handleAdd}>
                Add to cart
              </button>
            ) : (
              <button className="btn-primary" disabled>Sold out</button>
            )}
            {product.inStock && product.limited && (
              <p style={{ fontSize: 12, color: "#888", marginTop: 8, letterSpacing: "0.03em", textTransform: "uppercase" }}>Limited stock</p>
            )}

            {product.details?.length > 0 && (
              <div className="product-details">
                {product.details.map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
            )}

            {product.credits?.length > 0 && !product.suits && (
              <div style={{ marginTop: 12 }}>
                {product.credits.map((c, i) => (
                  <p key={i} style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
                    {c.label}{" "}
                    {c.names
                      ? c.names.map((n, j) => <span key={j}>{j > 0 && " and "}<a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{n.name}</a></span>)
                      : c.url
                        ? <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{c.name}</a>
                        : <span>{c.name}</span>
                    }
                  </p>
                ))}
              </div>
            )}

          </div>
        </div>

        {showReviews && !product.hideReviews && (
          <div className="reviews-modal-overlay" onClick={() => setShowReviews(false)}>
            <div className="reviews-modal" onClick={(e) => e.stopPropagation()}>
              <div className="reviews-modal-header">
                <h2>What people are saying</h2>
                <button className="reviews-modal-close" onClick={() => setShowReviews(false)} aria-label="Close">✕</button>
              </div>
              {productReviews.map((r, i) => (
                <div key={i} className="review-item">
                  <p className="review-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</p>
                  <p className="review-text">"{r.text}"</p>
                  <p className="review-author">— {r.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {product.pressImage && (
          <div className="product-full-section">
            <p className="product-full-section-label">As seen in</p>
            <img src={product.pressImage} alt="Press mentions" style={{ maxWidth: "100%", display: "block", backgroundColor: "#fff" }} />
          </div>
        )}

        {product.suits?.length > 0 && (
          <div className="product-full-section">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }}>
              <div>
                <p className="product-full-section-label" style={{ marginBottom: 20 }}>The suits</p>
                {product.suits.map((s, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.name} <span style={{ fontWeight: 400, color: "#888" }}>({s.count} cards)</span></p>
                    <p style={{ fontSize: 16, lineHeight: 1.6, color: "#555" }}>{s.description}</p>
                  </div>
                ))}
              </div>
              {product.crossSell && (
                <div>
                  {product.credits?.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                      {product.credits.map((c, i) => (
                        <p key={i} style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>
                          {c.label}{" "}
                          {c.names
                            ? c.names.map((n, j) => <span key={j}>{j > 0 && " and "}<a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{n.name}</a></span>)
                            : c.url
                              ? <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{c.name}</a>
                              : <span>{c.name}</span>
                          }
                        </p>
                      ))}
                    </div>
                  )}
                  <p style={{ fontSize: 20, lineHeight: 1.6, color: "#333", marginBottom: 16 }}>
                    Also available with Don&rsquo;t Call It That as part of the{" "}
                    <Link href={`/shop/${product.crossSell.slug}`} style={{ color: "inherit", textDecoration: "underline" }}>
                      {product.crossSell.name}
                    </Link>
                  </p>
                  {product.companionText && (
                    <p style={{ fontSize: 20, lineHeight: 1.6, color: "#555" }}>{product.companionText}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {product.topics?.length > 0 && (
          <div className="product-full-section">
            <p className="product-full-section-label">Let&rsquo;s figure out</p>
            <p style={{ fontSize: 20, lineHeight: 2, color: "#555" }}>
              {product.topics.join(" · ")}
            </p>
          </div>
        )}

        {product.contributors?.length > 0 && (
          <div className="product-full-section">
            <p className="product-full-section-label">{product.contributorsLabel || "Contributors"}</p>
            <p style={{ fontSize: 20, lineHeight: 2, color: "#555" }}>
              {product.contributors.map((c, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>{c.name}</a>
                </span>
              ))}
            </p>
          </div>
        )}

        {product.kickstarter && (
          <div className="product-full-section">
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#555", marginBottom: 16 }}>{product.kickstarter.text}</p>
            {product.kickstarter.image && (
              <img src={product.kickstarter.image} alt="Run Studio Run on Kickstarter" style={{ maxWidth: "100%", display: "block", marginBottom: 16 }} />
            )}
            {product.kickstarter.postText && (
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "#555" }}>
                {product.kickstarter.postText}{" "}
                <Link href={product.kickstarter.postLinkHref} style={{ color: "inherit", textDecoration: "underline" }}>
                  {product.kickstarter.postLinkText}
                </Link>
              </p>
            )}
          </div>
        )}

        {product.whatsNew && (
          <div className="product-whats-new">
            <p style={{ fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16, fontFamily: "var(--font-display)" }}>
              {product.whatsNewTitle || "What's new in this edition"}
            </p>
            <ul className="product-whats-new-list">
              {product.whatsNew.map((item, i) => (
                <li key={i}>
                  {typeof item === "object"
                    ? <><strong>{item.bold}:</strong> {item.text}</>
                    : item
                  }
                </li>
              ))}
            </ul>
          </div>
        )}

        {otherProducts?.length > 0 && (
          <div className="product-other-flavors">
            <p className="product-full-section-label">Other flavors</p>
            <div className="shop-grid" style={{ paddingTop: 16 }}>
              {otherProducts.map((p) => (
                <Link key={p.id} href={`/shop/${p.slug}`} className="product-card">
                  <div className="product-card-image">
                    {p.images?.[0] && <img src={p.images[0]} alt={p.name} />}
                  </div>
                  <p className="product-card-name">{p.name}</p>
                  <p className="product-card-price">${p.price.toFixed(2)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
