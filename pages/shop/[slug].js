import Head from "next/head";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  products,
  reviews,
  relatedProducts,
  MEDIA_MAIL_RATE_USD,
  FREE_SHIPPING_MINIMUM_USD,
} from "../../data/products";
import { imageSize } from "../../lib/imageSize";
import { useCart } from "../../components/CartContext";
import { useState, useEffect, useRef } from "react";

const MAIN_IMAGE_SIZES = "(max-width: 900px) 100vw, 560px";
const CARD_SIZES = "(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 260px";

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
  const otherProducts = relatedProducts(product);
  const successor = product.supersededBy
    ? products.find((p) => p.slug === product.supersededBy) ?? null
    : null;
  return { props: { product, productReviews, otherProducts, successor } };
}

export default function ProductPage({ product, productReviews, otherProducts, successor }) {
  const { addItem, setIsOpen } = useCart();
  const router = useRouter();
  const [activeImg, setActiveImg] = useState(0);
  const [showReviews, setShowReviews] = useState(false);

  const [added, setAdded] = useState(false);

  // On a phone the inline buy controls still start near the fold, so a bar takes
  // over once they scroll away. Desktop never sees it (hidden by media query).
  const ctaRef = useRef(null);
  const [ctaOffScreen, setCtaOffScreen] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver(
      ([entry]) => setCtaOffScreen(!entry.isIntersecting),
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [product.id]);

  useEffect(() => {
    if (typeof window.fbq === "function") {
      window.fbq("track", "ViewContent", {
        content_ids: [product.id],
        content_type: "product",
        content_name: product.name,
        value: product.price,
        currency: "USD",
      });
    }
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleAdd() {
    addItem(product);
    // Opening the drawer is the whole point: "Added!" on its own left people
    // with no visible way forward.
    setIsOpen(true);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
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
        <link rel="canonical" href={`${process.env.NEXT_PUBLIC_URL}/shop/${product.slug}`} />
        <title>{`${product.name} — No Picnic Press`}</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={`${product.name} — No Picnic Press`} />
        <meta property="og:description" content={product.description} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`${process.env.NEXT_PUBLIC_URL}/shop/${product.slug}`} />
        {product.images?.[0] && (
          <meta property="og:image" content={`${process.env.NEXT_PUBLIC_URL}${product.images[0]}`} />
        )}
        <meta property="og:site_name" content="No Picnic Press" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} — No Picnic Press`} />
        <meta name="twitter:description" content={product.description} />
        {product.images?.[0] && (
          <meta name="twitter:image" content={`${process.env.NEXT_PUBLIC_URL}${product.images[0]}`} />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: product.name,
              description: product.description,
              image: product.images?.map((img) => `${process.env.NEXT_PUBLIC_URL}${img}`),
              brand: { "@type": "Brand", name: "No Picnic Press" },
              author: { "@type": "Person", name: "Eli Altman" },
              offers: {
                "@type": "Offer",
                price: product.price,
                priceCurrency: "USD",
                availability: product.inStock
                  ? "https://schema.org/InStock"
                  : product.outOfPrint
                    ? "https://schema.org/Discontinued"
                    : "https://schema.org/OutOfStock",
                url: `${process.env.NEXT_PUBLIC_URL}/shop/${product.slug}`,
                seller: { "@type": "Organization", name: "No Picnic Press" },
                hasMerchantReturnPolicy: {
                  "@type": "MerchantReturnPolicy",
                  name: "No Picnic Press Return Policy",
                  description: product.isDigital
                    ? "Digital items may be returned within 2 days of purchase at no cost."
                    : "Physical items may be returned within 14 days. Customer is responsible for return shipping.",
                  applicableCountry: "US",
                  returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
                  merchantReturnDays: product.isDigital ? 2 : 14,
                  returnMethod: "https://schema.org/ReturnByMail",
                  returnFees: product.isDigital
                    ? "https://schema.org/FreeReturn"
                    : "https://schema.org/ReturnShippingFees",
                },
                shippingDetails: (product.isDigital || product.isService)
                  ? { "@type": "OfferShippingDetails", doesNotShip: true }
                  : {
                      "@type": "OfferShippingDetails",
                      shippingDestination: {
                        "@type": "DefinedRegion",
                        addressCountry: "US",
                      },
                      shippingRate: {
                        "@type": "MonetaryAmount",
                        value: MEDIA_MAIL_RATE_USD,
                        currency: "USD",
                      },
                      deliveryTime: {
                        "@type": "ShippingDeliveryTime",
                        handlingTime: {
                          "@type": "QuantitativeValue",
                          minValue: 1,
                          maxValue: 3,
                          unitCode: "DAY",
                        },
                        transitTime: {
                          "@type": "QuantitativeValue",
                          minValue: 3,
                          maxValue: 7,
                          unitCode: "DAY",
                        },
                      },
                    },
              },
              ...(product.schemaTopics?.length > 0 && {
                about: product.schemaTopics.map((t) => ({ "@type": "Thing", name: t })),
              }),
              ...(productReviews.length > 0 && {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: parseFloat(score),
                  reviewCount: productReviews.length,
                  bestRating: 5,
                  worstRating: 1,
                },
                review: productReviews.slice(0, 5).map((r) => ({
                  "@type": "Review",
                  author: { "@type": "Person", name: r.author },
                  reviewRating: {
                    "@type": "Rating",
                    ratingValue: r.rating,
                    bestRating: 5,
                  },
                  reviewBody: r.text,
                })),
              }),
            }),
          }}
        />
      </Head>

      <div className="container">
        <div className="product-page">
          <div className="product-images">
            <div className="product-image-main">
              {product.images?.[activeImg] && (
                <Image
                  src={product.images[activeImg]}
                  alt={product.name}
                  {...(imageSize(product.images[activeImg]) || { width: 1200, height: 900 })}
                  sizes={MAIN_IMAGE_SIZES}
                  style={{ width: "100%", height: "auto" }}
                  priority
                />
              )}
            </div>
            {product.images?.length > 1 && (
              <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImg(i)}
                    aria-label={`View image ${i + 1} of ${product.images.length}`}
                    aria-current={i === activeImg}
                    style={{
                      position: "relative",
                      width: 60,
                      height: 76,
                      padding: 0,
                      background: "#f5f5f5",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: i === activeImg ? "1px solid #000" : "1px solid transparent",
                    }}
                  >
                    <Image src={img} alt="" fill sizes="60px" style={{ objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="product-info">
            <h1>{product.name}</h1>
            {product.subtitle && (
              <p style={{ fontSize: 16, color: "#333", marginBottom: 16, lineHeight: 1.4 }}>{product.subtitle}</p>
            )}
            {/* A price on something we can't sell is just a tease. */}
            {!product.outOfPrint && <p className="product-price">${product.price.toFixed(2)}</p>}
            {!product.isDigital && !product.isService && !product.outOfPrint && (
              <p style={{ fontSize: 13, marginTop: -8, marginBottom: 16, color: product.price >= FREE_SHIPPING_MINIMUM_USD ? "rgb(26, 110, 60)" : "#888" }}>
                {product.price >= FREE_SHIPPING_MINIMUM_USD
                  ? "Free U.S. shipping"
                  : `+ $${MEDIA_MAIL_RATE_USD.toFixed(2)} shipping · Free on U.S. orders of $${FREE_SHIPPING_MINIMUM_USD} or more`}
              </p>
            )}

            {productReviews.length > 0 && !product.hideReviews && (
              <button className="rating-bar" onClick={() => setShowReviews(true)} aria-label="Read all reviews">
                <span className="stars" aria-hidden>{stars}</span>
                <span className="rating-score">{score}/5</span>
                <span className="rating-count">({productReviews.length} {productReviews.length === 1 ? "review" : "reviews"})</span>
              </button>
            )}

            {/* The buy controls sit directly under the rating so they clear the
                fold; everything descriptive follows them. */}
            <div ref={ctaRef}>
              {product.inStock ? (
                <>
                  <button className="btn-primary" onClick={handleBuyNow}>Buy now</button>
                  <button className="btn-secondary" onClick={handleAdd} disabled={added}>
                    {added ? "Added!" : "Add to cart"}
                  </button>
                </>
              ) : product.outOfPrint ? (
                // A disabled button is a dead end. Say why, and point at whatever
                // replaced it — this is the page people land on from old links.
                <div className="out-of-print">
                  <p className="out-of-print-label">Out of print</p>
                  {successor ? (
                    <p className="out-of-print-note">
                      The current edition is{" "}
                      <Link href={`/shop/${successor.slug}`}>{successor.name}</Link>.
                    </p>
                  ) : (
                    <p className="out-of-print-note">
                      We can&rsquo;t sell this any more, but it&rsquo;s here for the record.
                    </p>
                  )}
                </div>
              ) : (
                <button className="btn-primary" disabled>Sold out</button>
              )}
            </div>
            {product.inStock && product.limited && (
              <p style={{ fontSize: 12, color: "#888", marginTop: 8, letterSpacing: "0.03em", textTransform: "uppercase" }}>Limited stock</p>
            )}

            <p className="product-description product-description-below-cta">
              {product.descriptionAttribution ? (
                <>
                  <em>&ldquo;{product.description}&rdquo;</em>
                  {" "}
                  <img src={`/images/${product.descriptionAttribution.toLowerCase()}-logo.png`} alt={product.descriptionAttribution} style={{ height: 16, display: "inline-block", verticalAlign: "middle", opacity: 0.75 }} />
                </>
              ) : product.descriptionAttributionText ? (
                <>
                  <em>&ldquo;{product.description}&rdquo;</em>
                  {" "}
                  <span style={{ fontSize: 13, color: "#888" }}>— {product.descriptionAttributionText}</span>
                </>
              ) : product.description}
              {product.learnMore && (
                <> Learn more at <a href={product.learnMore.url} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", textDecoration: "underline" }}>{product.learnMore.text}</a></>
              )}
            </p>

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

        {product.bodyText && (
          <div className="product-full-section">
            <p style={{ fontSize: 20, lineHeight: 1.7, color: "#555" }}>
              {product.bodyTextLead && <strong>{product.bodyTextLead} </strong>}
              {product.bodyText}
            </p>
          </div>
        )}

        {product.pressImage && (
          <div className="product-full-section">
            <p className="product-full-section-label">As seen in</p>
            <Image
              src={product.pressImage}
              alt="Press mentions"
              {...(imageSize(product.pressImage) || { width: 1200, height: 300 })}
              sizes="(max-width: 900px) 100vw, 900px"
              style={{ maxWidth: "100%", height: "auto", display: "block", backgroundColor: "#fff" }}
            />
            {product.pressImageCaption && (
              <p style={{ fontSize: 12, color: "#aaa", marginTop: 8 }}>{product.pressImageCaption}</p>
            )}
          </div>
        )}

        {product.productSections?.length > 0 && (
          <div className="product-full-section">
            {product.productSections.map((section, i) => (
              <div key={i} style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{section.heading}</p>
                <p style={{ fontSize: 16, lineHeight: 1.7, color: "#555" }}>{section.text}</p>
              </div>
            ))}
          </div>
        )}

        {product.namedBy?.length > 0 && product.namedBy.some(item => item.logo) && (
          <div className="product-full-section">
            <p className="product-full-section-label">From the namers behind</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", marginTop: 16 }}>
              {product.namedBy.map((item, i) => (
                <img key={i} src={item.logo} alt={item.name} style={{ height: 20, opacity: 0.6, objectFit: "contain" }} />
              ))}
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
              <Image
                src={product.kickstarter.image}
                alt="Run Studio Run on Kickstarter"
                {...(imageSize(product.kickstarter.image) || { width: 1200, height: 800 })}
                sizes="(max-width: 900px) 100vw, 900px"
                style={{ maxWidth: "100%", height: "auto", display: "block", marginBottom: 16 }}
              />
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
                    {p.images?.[0] && (
                      <Image
                        src={p.images[0]}
                        alt={p.name}
                        fill
                        sizes={CARD_SIZES}
                        style={{ objectFit: "cover" }}
                      />
                    )}
                  </div>
                  <p className="product-card-name">{p.name}</p>
                  <p className="product-card-price">${p.price.toFixed(2)}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {product.inStock && (
        <div className={`buy-bar${ctaOffScreen ? " visible" : ""}`} aria-hidden={!ctaOffScreen}>
          <div className="buy-bar-info">
            <span className="buy-bar-name">{product.name}</span>
            <span className="buy-bar-price">${product.price.toFixed(2)}</span>
          </div>
          <button className="btn-primary" onClick={handleAdd} disabled={added} tabIndex={ctaOffScreen ? 0 : -1}>
            {added ? "Added!" : "Add to cart"}
          </button>
        </div>
      )}
    </>
  );
}
