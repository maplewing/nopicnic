import Head from "next/head";
import { useRouter } from "next/router";
import { products, reviews, aggregateRating } from "../../data/products";
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
  return { props: { product, productReviews } };
}

export default function ProductPage({ product, productReviews }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  function handleAdd() {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  const stars = "★".repeat(Math.round(aggregateRating.score)) + "☆".repeat(5 - Math.round(aggregateRating.score));

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
              <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>{product.subtitle}</p>
            )}
            <p className="product-price">${product.price.toFixed(2)}</p>

            {productReviews.length > 0 && (
              <div className="rating-bar">
                <span className="stars" aria-hidden>{stars}</span>
                <span className="rating-score">{aggregateRating.score}/5</span>
                <span className="rating-count">({aggregateRating.count} reviews)</span>
              </div>
            )}

            <p className="product-description">{product.description}</p>

            {product.details?.length > 0 && (
              <div className="product-details">
                {product.details.map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
            )}

            {product.inStock ? (
              <button className="btn-primary" onClick={handleAdd}>
                {added ? "Added ✓" : "Add to cart"}
              </button>
            ) : (
              <button className="btn-primary" disabled>Sold out</button>
            )}

            {product.whatsNew && (
              <div style={{ marginTop: 32 }}>
                <p style={{ fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>
                  What's new in this edition
                </p>
                <ul style={{ paddingLeft: 16, fontSize: 13, lineHeight: 2, color: "#555" }}>
                  {product.whatsNew.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {productReviews.length > 0 && (
              <div className="reviews-section">
                <h2>What people are saying</h2>
                {productReviews.map((r, i) => (
                  <div key={i} className="review-item">
                    <p className="review-text">"{r.text}"</p>
                    <p className="review-author">— {r.author}</p>
                  </div>
                ))}
              </div>
            )}

            {product.pressImage && (
              <div className="product-press">
                <p className="product-press-label">As seen in</p>
                <img src={product.pressImage} alt="Press mentions" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
