import Head from "next/head";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCart } from "../components/CartContext";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const FREE_SHIPPING_CODE = "MOREBETTER";
const FREE_SHIPPING_MINIMUM = 50;

// Mirrors FREE_RATE in lib/shippingRates.js, which re-validates the code server-side.
const FREE_RATE = {
  token: "promo-free",
  serviceToken: "free_shipping",
  service: "Free shipping",
  amount: "0.00",
  currency: "USD",
  estimatedDays: null,
  durationTerms: "2–8 business days (Media Mail)",
};

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" },
  { code: "BO", name: "Bolivia" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BR", name: "Brazil" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "KH", name: "Cambodia" },
  { code: "CA", name: "Canada" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "HR", name: "Croatia" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Ireland" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KW", name: "Kuwait" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macau" },
  { code: "MY", name: "Malaysia" },
  { code: "MT", name: "Malta" },
  { code: "MX", name: "Mexico" },
  { code: "MA", name: "Morocco" },
  { code: "NL", name: "Netherlands" },
  { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PA", name: "Panama" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "RS", name: "Serbia" },
  { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" },
  { code: "KR", name: "South Korea" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Turkey" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "UY", name: "Uruguay" },
  { code: "VN", name: "Vietnam" },
];

function RemoveBlockedItem({ onRemove }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      style={{
        marginTop: 8,
        padding: 0,
        background: "none",
        border: "none",
        borderBottom: "1px solid #c00",
        color: "#c00",
        fontSize: 13,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      Remove it from your cart
    </button>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, updateQty, removeItem, hydrated } = useCart();

  const hasPhysical = items.some((i) => !i.isDigital && !i.isService);

  const [address, setAddress] = useState({ zip: "", country: "US" });
  const [rates, setRates] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [rateError, setRateError] = useState(null);
  const [proceeding, setProceeding] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  // Set when the server rejects a specific cart line, so we can offer to drop it.
  const [blockedItemId, setBlockedItemId] = useState(null);
  const [rateTouched, setRateTouched] = useState(false);

  // MOREBETTER is announced on a banner sitewide, so it was never a secret —
  // only a step between a qualifying order and the rate it had already earned.
  // Derived rather than stored so changing quantity re-evaluates it immediately;
  // api/checkout re-checks the same two conditions before honouring the rate.
  const qualifiesForFreeShipping =
    address.country === "US" && total >= FREE_SHIPPING_MINIMUM;
  const amountToFreeShipping = FREE_SHIPPING_MINIMUM - total;

  // Track which session key we last successfully created so we don't duplicate
  const activeSessionKeyRef = useRef(null);

  // Weight drives the quote, so the cart is as much an input as the address is.
  const cartKey = items.map((i) => `${i.id}:${i.qty}`).join(",");

  // Lets the async callback below read the live selection without making itself
  // a dependency (which would refetch rates every time the radio changes).
  const selectionRef = useRef({ serviceToken: null, touched: false });
  useEffect(() => {
    selectionRef.current = {
      serviceToken: selectedRate?.serviceToken ?? null,
      touched: rateTouched,
    };
  }, [selectedRate, rateTouched]);

  // Which address the rates on screen belong to, so a cart-only change can leave
  // them up while they refresh instead of blanking the list on every +/-.
  const quotedAddressRef = useRef(null);

  // Auto-fetch rates when the address or the cart changes
  useEffect(() => {
    if (!hasPhysical) return;

    const isUS = address.country === "US";
    const addressKey = `${address.country}:${address.zip}`;
    const addressChanged = quotedAddressRef.current !== addressKey;

    if (address.zip.length < (isUS ? 5 : 2)) {
      quotedAddressRef.current = null;
      setRates(null);
      setSelectedRate(null);
      setRateError(null);
      setFetchingRates(false);
      return;
    }

    // Set before the debounce, not inside it: this also gates session creation,
    // and a rate we already know is about to change shouldn't buy a Stripe session.
    setFetchingRates(true);

    // Quantity buttons are easy to click faster than a quote comes back, so a
    // superseded response must not be allowed to land on top of a fresher one.
    let cancelled = false;

    const timer = setTimeout(async () => {
      setRateError(null);
      setBlockedItemId(null);
      // Rates for a different destination are simply wrong; rates for a slightly
      // different weight are only stale, and worth keeping visible meanwhile.
      if (addressChanged) {
        setRates(null);
        setSelectedRate(null);
        setRateTouched(false);
      }
      try {
        const res = await fetch("/api/shipping-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: { country: address.country, zip: address.zip },
            items: items.map((i) => ({ id: i.id, qty: i.qty, name: i.name })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          // A rejected cart line names itself; anything else is an address problem.
          setRateError(data.error || "Couldn't fetch rates. Please check your address and try again.");
          setBlockedItemId(data.itemId || null);
        } else if (!data.rates?.length) {
          setRateError("No shipping options available for that address.");
        } else {
          quotedAddressRef.current = addressKey;
          setRates(data.rates);

          // Someone who deliberately picked Overnight should still have Overnight
          // after adding a book — at the new weight's price.
          const { serviceToken, touched } = selectionRef.current;
          const kept = touched && !addressChanged
            ? data.rates.find((r) => r.serviceToken === serviceToken)
            : null;

          if (kept) {
            setSelectedRate(kept);
          } else {
            setRateTouched(false);
            setSelectedRate(
              address.country === "US" && total >= FREE_SHIPPING_MINIMUM
                ? FREE_RATE
                : data.rates[0]
            );
          }
        }
      } catch {
        if (!cancelled) {
          setRateError("Couldn't fetch rates. Please check your address and try again.");
        }
      }
      if (!cancelled) setFetchingRates(false);
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [address.zip, address.country, cartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Free shipping and the cheapest paid rate are both "what we picked for you",
  // so keep re-picking as the cart crosses the minimum — but stop the moment the
  // customer chooses a speed themselves.
  useEffect(() => {
    if (rateTouched || !rates) return;
    setSelectedRate(qualifiesForFreeShipping ? FREE_RATE : rates[0]);
  }, [qualifiesForFreeShipping, rates, rateTouched]);

  // Derive a key that represents the current "ready" checkout state.
  // null = not ready to create a session yet.
  const canProceed = !hasPhysical || (selectedRate !== null && !fetchingRates);
  const sessionKey = canProceed && items.length > 0
    ? JSON.stringify({
        items: items.map((i) => `${i.id}:${i.qty}`),
        rate: selectedRate?.token ?? null,
        country: address.country,
      })
    : null;

  // Auto-create Stripe Checkout Session whenever the session key changes.
  useEffect(() => {
    if (!sessionKey) {
      setClientSecret(null);
      setCheckoutError(null);
      activeSessionKeyRef.current = null;
      return;
    }
    // Already created for this exact config
    if (sessionKey === activeSessionKeyRef.current && clientSecret) return;

    activeSessionKeyRef.current = sessionKey;
    setClientSecret(null);
    setCheckoutError(null);
    setProceeding(true);

    let cancelled = false;
    fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ id: i.id, qty: i.qty, name: i.name })),
        selectedRate,
        address,
        promoCode: selectedRate?.token === FREE_RATE.token ? FREE_SHIPPING_CODE : null,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.clientSecret) {
          setCheckoutError(data.error || "Something went wrong. Please try again.");
          setBlockedItemId(data.itemId || null);
          activeSessionKeyRef.current = null;
        } else {
          setClientSecret(data.clientSecret);
          setBlockedItemId(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckoutError("Something went wrong. Please try again.");
          activeSessionKeyRef.current = null;
        }
      })
      .finally(() => {
        if (!cancelled) setProceeding(false);
      });

    return () => { cancelled = true; };
  }, [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) return null;
  if (items.length === 0) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  const displayRates = qualifiesForFreeShipping && rates ? [FREE_RATE, ...rates] : rates;

  const shippingTotal = selectedRate ? parseFloat(selectedRate.amount) : null;
  const orderTotal = shippingTotal !== null ? total + shippingTotal : null;

  return (
    <>
      <Head><title>Checkout — No Picnic Press</title></Head>
      <div className="container">
        <div className="checkout-page">

          {/* ── Left column: shipping form + order summary ── */}
          <div>
            {hasPhysical ? (
              <>
                <h2 className="checkout-section-title">Shipping</h2>
                <div className="studio-form" style={{ marginTop: 0 }}>

                  <div className="studio-form-row">
                    <label htmlFor="co-country">Country</label>
                    <select
                      id="co-country"
                      value={address.country}
                      onChange={(e) => setAddress((prev) => ({ ...prev, country: e.target.value }))}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="studio-form-row">
                    <label htmlFor="co-zip">Postal code</label>
                    <input
                      id="co-zip"
                      type="text"
                      value={address.zip}
                      onChange={(e) => setAddress((prev) => ({ ...prev, zip: e.target.value }))}
                      placeholder="e.g. 94710"
                      maxLength={10}
                      autoComplete="postal-code"
                    />
                  </div>

                </div>

                {fetchingRates && (
                  <p style={{ fontSize: 13, color: "var(--gray-mid)", marginTop: 16 }}>Fetching rates…</p>
                )}
                {rateError && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontSize: 13, color: "#c00" }}>{rateError}</p>
                    {blockedItemId && <RemoveBlockedItem onRemove={() => removeItem(blockedItemId)} />}
                  </div>
                )}

                {displayRates && (
                  <div className="checkout-rates">
                    <h3 className="checkout-section-title" style={{ marginTop: 32 }}>Shipping method</h3>
                    {displayRates.map((rate) => (
                      <label
                        key={rate.token}
                        className={`rate-option${selectedRate?.token === rate.token ? " active" : ""}`}
                      >
                        <input
                          type="radio"
                          name="rate"
                          value={rate.token}
                          checked={selectedRate?.token === rate.token}
                          onChange={() => { setSelectedRate(rate); setRateTouched(true); }}
                        />
                        <span className="rate-service">{rate.service}</span>
                        <span className="rate-days">
                          {rate.estimatedDays
                            ? `~${rate.estimatedDays} day${rate.estimatedDays !== 1 ? "s" : ""}`
                            : rate.durationTerms || ""}
                        </span>
                        <span className="rate-price">
                          {parseFloat(rate.amount) === 0 ? "Free" : `$${parseFloat(rate.amount).toFixed(2)}`}
                        </span>
                      </label>
                    ))}
                    {qualifiesForFreeShipping ? (
                      selectedRate?.token === FREE_RATE.token ? (
                        <p className="promo-success">
                          Free shipping applied — your order is over ${FREE_SHIPPING_MINIMUM}.
                        </p>
                      ) : (
                        // They picked a faster service; don't claim we discounted it.
                        <p className="shipping-nudge">
                          Your order qualifies for free shipping — select it above to use it.
                        </p>
                      )
                    ) : address.country === "US" ? (
                      <p className="shipping-nudge">
                        Add ${amountToFreeShipping.toFixed(2)} to your order for free shipping.
                      </p>
                    ) : null}
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 className="checkout-section-title">Digital delivery</h2>
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                  Your download link will be delivered to the email address you provide at payment.
                </p>
              </>
            )}

            {/* Order summary */}
            {/* Stripe renders its own authoritative total on the right. This one
                is the editable cart, so name it that way rather than competing. */}
            <div className="checkout-summary" style={{ marginTop: 40 }}>
              <h2 className="checkout-section-title">Your cart</h2>
              {items.map((item) => (
                <div key={item.id} className="checkout-summary-row" style={{ alignItems: "flex-start", gap: 12 }}>
                  {item.images?.[0] && (
                    <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0, borderRadius: 2, overflow: "hidden" }}>
                      <Image src={item.images[0]} alt={item.name} fill sizes="52px" style={{ objectFit: "cover" }} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span>{item.name}</span>
                    <div style={{ marginTop: 6 }}>
                      {item.isDigital || item.isService ? (
                        <button className="cart-item-remove" onClick={() => removeItem(item.id)}>Remove</button>
                      ) : (
                        <div className="cart-item-qty">
                          <button onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                          <span>{item.qty}</span>
                          <button onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ flexShrink: 0 }}>${(item.price * item.qty).toFixed(2)}</span>
                </div>
              ))}
              <div className="checkout-summary-row checkout-summary-subtotal">
                <span>Subtotal</span>
                <span>${total.toFixed(2)}</span>
              </div>
              {selectedRate && (
                <div className="checkout-summary-row">
                  <span style={{ color: "var(--gray-mid)" }}>{selectedRate.service}</span>
                  <span style={{ color: "var(--gray-mid)" }}>
                    {parseFloat(selectedRate.amount) === 0 ? "Free" : `$${parseFloat(selectedRate.amount).toFixed(2)}`}
                  </span>
                </div>
              )}
              {orderTotal !== null && (
                <div className="checkout-summary-row checkout-summary-total">
                  <span>Total</span>
                  <span>${orderTotal.toFixed(2)}</span>
                </div>
              )}
            </div>

            <p style={{ marginTop: 16, fontSize: 12, color: "var(--gray-mid)" }}>
              <a href="/shipping-returns" style={{ color: "inherit", textDecoration: "underline" }}>Shipping &amp; returns</a>
            </p>
          </div>

          {/* ── Right column: Stripe embedded checkout ── */}
          <div>
            {checkoutError && (
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 13, color: "#c00" }}>{checkoutError}</p>
                {blockedItemId && <RemoveBlockedItem onRemove={() => removeItem(blockedItemId)} />}
              </div>
            )}
            {!canProceed && !checkoutError && (
              <p style={{ fontSize: 13, color: "var(--gray-mid)", lineHeight: 1.7 }}>
                {fetchingRates
                  ? "Finding shipping options…"
                  : "Enter your country and postal code to see shipping options and pay."}
              </p>
            )}
            {canProceed && (
              <>
                {proceeding && !clientSecret && (
                  <p style={{ fontSize: 13, color: "var(--gray-mid)" }}>Loading payment…</p>
                )}
                {clientSecret && (
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{ clientSecret }}
                  >
                    <EmbeddedCheckout />
                  </EmbeddedCheckoutProvider>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
