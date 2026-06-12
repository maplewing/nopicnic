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
                  <img src={product.images[0]} alt={product.name} loading="lazy" />
                )}
              </div>
              <p className="product-card-name">{product.name}</p>
              <p className="product-card-price">${product.price.toFixed(2)}</p>
              {!product.inStock && <span className="badge-soldout">Sold out</span>}
              {product.inStock && product.limited && <span className="badge-limited">Limited stock</span>}
            </Link>
          ))}
        </div>
      </div>

      <div className="homepage-description container">
        <p>
          No Picnic Press is the Berkeley, California-based publishing imprint of{" "}
          <Link href="/about">Eli Altman</Link>, Managing Director at the naming studio{" "}
          <a href="https://www.ahundredmonkeys.com" target="_blank" rel="noopener">A Hundred Monkeys</a>.
          He is the author of <Link href="/shop/dont-call-it-that">Don't Call It That</Link>, the naming workbook,
          now in its third edition. <Link href="/shop/run-studio-run">Run Studio Run</Link> is the go-to guide
          for running small creative studios. <Link href="/shop/go-name-yourself">Go Name Yourself</Link> is
          the deck of cards for name generation. <Link href="/shop/assorted-characters">Assorted Characters</Link>{" "}
          is a three-volume zine dedicated to the names that naming professionals find interesting.
          If you've made it this far, thank you for buying directly from us instead of all-powerful lord Bezos.
        </p>
      </div>
    </>
  );
}
