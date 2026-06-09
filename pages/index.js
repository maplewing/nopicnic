import Link from "next/link";
import Head from "next/head";
import { products, siteConfig } from "../data/products";

export default function Shop() {
  return (
    <>
      <Head>
        <title>No Picnic Press</title>
        <meta name="description" content={siteConfig.tagline} />
      </Head>

      <div className="container">
        <div className="shop-grid">
          {products.map((product) => (
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
