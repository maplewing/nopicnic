import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useCart } from "../components/CartContext";

const money = (n) => `$${Number(n).toFixed(2)}`;

export default function Success() {
  const router = useRouter();
  const { clearCart, hydrated } = useCart();
  const [order, setOrder] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // The provider restores the saved cart in its own mount effect, which runs
  // after this one. Waiting for `hydrated` keeps that restore from undoing the clear.
  useEffect(() => {
    if (!hydrated) return;
    if (!router.query.session_id) return;
    clearCart();
  }, [hydrated, router.query.session_id]); // eslint-disable-line react-hooks/exhaustive-deps

  // One fetch feeds both the receipt below and the Purchase pixel.
  useEffect(() => {
    const { session_id } = router.query;
    if (!session_id) return;

    let cancelled = false;

    fetch(`/api/session-summary?session_id=${encodeURIComponent(session_id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("lookup failed"))))
      .then((data) => {
        if (cancelled) return;
        setOrder(data);

        // Pixel is absent for EEA/UK/Swiss visitors by design, and may still be
        // loading for everyone else.
        let attempts = 0;
        const send = () => {
          if (typeof window.fbq !== "function") return false;
          window.fbq(
            "track",
            "Purchase",
            {
              value: data.total,
              currency: data.currency || "USD",
              content_ids: data.contentIds,
              content_type: "product",
            },
            { eventID: session_id }
          );
          return true;
        };
        if (send()) return;
        const interval = setInterval(() => {
          if (send() || ++attempts > 25) clearInterval(interval);
        }, 200);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => { cancelled = true; };
  }, [router.query.session_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addr = order?.shippingAddress;

  return (
    <>
      <Head>
        <title>Order confirmed — No Picnic Press</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="success-page">
        <p className="success-eyebrow">Order confirmed</p>
        <h1 className="success-heading">Thank you.</h1>

        {order?.orderNumber && (
          <p className="success-order-number">Order #{order.orderNumber}</p>
        )}

        <p className="success-intro">
          {order?.email ? (
            <>A confirmation is on its way to <strong>{order.email}</strong>.</>
          ) : (
            <>You&rsquo;ll receive a confirmation email shortly.</>
          )}{" "}
          {order?.hasDigital && "Your download links are in that email. "}
          {addr && "We'll send a tracking number once your order ships. "}
          Questions? <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a>
        </p>

        {order && (
          <div className="success-receipt">
            {order.items?.map((item, i) => (
              <div key={i} className="success-row">
                <span>
                  {item.name}
                  {item.quantity > 1 && ` × ${item.quantity}`}
                </span>
                <span>{money(item.amount)}</span>
              </div>
            ))}

            <div className="success-row success-row-sub">
              <span>Subtotal</span>
              <span>{money(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="success-row success-row-muted">
                <span>Discount</span>
                <span>−{money(order.discount)}</span>
              </div>
            )}
            {order.shippingCost != null && (
              <div className="success-row success-row-muted">
                <span>Shipping</span>
                <span>{order.shippingCost === 0 ? "Free" : money(order.shippingCost)}</span>
              </div>
            )}
            {order.tax > 0 && (
              <div className="success-row success-row-muted">
                <span>Tax</span>
                <span>{money(order.tax)}</span>
              </div>
            )}
            <div className="success-row success-row-total">
              <span>Total</span>
              <span>{money(order.total)}</span>
            </div>

            {addr && (
              <div className="success-address">
                <p className="success-address-label">Shipping to</p>
                <p>
                  {addr.name && <>{addr.name}<br /></>}
                  {addr.line1}<br />
                  {addr.line2 && <>{addr.line2}<br /></>}
                  {addr.city}{addr.state ? `, ${addr.state}` : ""} {addr.postalCode}<br />
                  {addr.country}
                </p>
              </div>
            )}
          </div>
        )}

        {loadFailed && (
          <p className="success-intro" style={{ color: "#555" }}>
            Your payment went through and your confirmation email is on its way — we just
            couldn&rsquo;t load the details to show here.
          </p>
        )}

        <Link href="/" className="success-back">
          Back to shop
        </Link>
      </div>
    </>
  );
}
