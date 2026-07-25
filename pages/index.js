import Link from "next/link";
import Head from "next/head";
import Image from "next/image";
import { products, siteConfig } from "../data/products";

// The grid is the heaviest thing on the site; these are the only widths a card
// image is ever rendered at.
const CARD_SIZES = "(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 260px";

export default function Shop() {
  return (
    <>
      <Head>
        <title>No Picnic Press — Books on naming, branding, and running a studio</title>
        <meta name="description" content={siteConfig.tagline} />
        <link rel="canonical" href="https://nopicnicpress.com" />
        <meta property="og:title" content="No Picnic Press — Books on naming, branding, and running a studio" />
        <meta property="og:description" content={siteConfig.tagline} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://nopicnicpress.com" />
        <meta property="og:site_name" content="No Picnic Press" />
        <meta property="og:image" content="https://nopicnicpress.com/images/og-default.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="No Picnic Press — Books on naming, branding, and running a studio" />
        <meta name="twitter:description" content={siteConfig.tagline} />
        <meta name="twitter:image" content="https://nopicnicpress.com/images/og-default.jpg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "name": "No Picnic Press",
                  "url": "https://nopicnicpress.com",
                  "description": "No Picnic Press is the publishing imprint of naming strategist Eli Altman. Home of Don't Call It That, Run Studio Run, and Go Name Yourself.",
                },
                {
                  "@type": "Organization",
                  "name": "No Picnic Press",
                  "url": "https://nopicnicpress.com",
                  "description": "No Picnic Press is the Berkeley, California-based publishing imprint of Eli Altman. Publisher of books on naming, branding, and running small creative studios.",
                  "email": "hi@nopicnicpress.com",
                  "founder": {
                    "@type": "Person",
                    "name": "Eli Altman",
                    "url": "https://nopicnicpress.com/about",
                  },
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Berkeley",
                    "addressRegion": "CA",
                    "addressCountry": "US",
                  },
                },
              ],
            }),
          }}
        />
      </Head>

      <div className="container">
        <div className="shop-grid">
          {products.map((product, i) => (
            <Link key={product.id} href={`/shop/${product.slug}`} className="product-card">
              <div className="product-card-image">
                {product.images?.[0] && (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    sizes={CARD_SIZES}
                    style={{ objectFit: "cover" }}
                    priority={i < 4}
                  />
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
