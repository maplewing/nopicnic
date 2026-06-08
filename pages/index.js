import { useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { products, aggregateRating, siteConfig } from "../data/products";

const categories = ["All", "Books", "Naming", "Digital"];

export default function Shop() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filtered =
    activeCategory === "All"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <>
      <Head>
        <title>No Picnic Press</title>
        <meta name="description" content={siteConfig.tagline} />
      </Head>

      <div className="container" style={{ paddingTop: 32, paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <span style={{ fontSize: 13 }}>
            {"★".repeat(Math.round(aggregateRating.score))}
          </span>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{aggregateRating.score}/5</span>
          <span style={{ fontSize: 12, color: "#999" }}>({aggregateRating.count} reviews)</span>
        </div>
      </div>

      <div className="category-filter container">
        {categories.map((cat) => (
          <button
            key={cat}
            className={activeCategory === cat ? "active" : ""}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="container">
        <div className="shop-grid">
          {filtered.map((product) => (
            <Link key={product.id} href={`/shop/${product.slug}`} className="product-card">
              <div className="product-card-image">
                {product.images?.[0] && (
                  <img src={product.images[0]} alt={product.name} />
                )}
              </div>
              <p className="product-card-name">{product.name}</p>
              <p className="product-card-price">${product.price.toFixed(2)}</p>
              {!product.inStock && <span className="badge-soldout">Sold out</span>}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
