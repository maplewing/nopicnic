import Head from "next/head";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useCart } from "../components/CartContext";
import { STANDARD_MAILER_OZ, LARGE_MAILER_OZ } from "../data/products";

const DCIT_IDS = new Set([
  "dont-call-it-that",
  "dont-call-it-that-1st-edition",
  "dont-call-it-that-2nd-edition",
]);

function getPackagingOz(items) {
  const ids = new Set(items.map((i) => i.id));
  const hasDCIT = [...DCIT_IDS].some((id) => ids.has(id));
  const hasGNY = ids.has("go-name-yourself");
  const hasBundle = ids.has("name-right-now-bundle");
  const hasExtraStrength = ids.has("extra-strength");
  if ((hasDCIT && hasGNY) || hasBundle || hasExtraStrength) return LARGE_MAILER_OZ;
  return STANDARD_MAILER_OZ;
}

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
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "IE", name: "Ireland" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "PL", name: "Poland" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "ZA", name: "South Africa" },
  { code: "IN", name: "India" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, updateQty, removeItem, hydrated } = useCart();

  const physicalItems = items.filter((i) => !i.isDigital);
  const hasPhysical = physicalItems.length > 0;
  const totalWeightOz = hasPhysical
    ? physicalItems.reduce((sum, i) => sum + (i.productWeightOz || 14) * i.qty, 0) +
      getPackagingOz(physicalItems)
    : 0;

  const [country, setCountry] = useState("US");
  const [zip, setZip] = useState("");
  const [rates, setRates] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [rateError, setRateError] = useState(null);
  const [proceeding, setProceeding] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState(null);

  // Auto-fetch rates when zip is complete (US) or country changes (international)
  useEffect(() => {
    if (!hasPhysical) return;

    const isUS = country === "US";
    if (isUS && zip.length < 5) {
      setRates(null);
      setSelectedRate(null);
      setRateError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setFetchingRates(true);
      setRateError(null);
      setRates(null);
      setSelectedRate(null);
      setPromoApplied(false);
      setPromoError(null);
      try {
        const res = await fetch("/api/shipping-rates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: { country, zip },
            weightOz: totalWeightOz,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data.rates?.length) throw new Error("no rates");
        setRates(data.rates);
      } catch {
        setRateError("Couldn't fetch rates. Please check your ZIP code and try again.");
      }
      setFetchingRates(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [zip, country]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) return null;
  if (items.length === 0) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  function handleApplyPromo(e) {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code !== "MOREBETTER") {
      setPromoError("Invalid promo code.");
      return;
    }
    if (country !== "US") {
      setPromoError("Free shipping is for US orders only.");
      return;
    }
    if (total < 50) {
      setPromoError("MOREBETTER applies to orders of $50 or more.");
      return;
    }
    setPromoApplied(true);
    setPromoError(null);
    setSelectedRate(FREE_RATE);
  }

  const displayRates = promoApplied && rates ? [FREE_RATE, ...rates] : rates;

  async function handleProceed() {
    setProceeding(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, selectedRate }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setCheckoutError(data.error || "Something went wrong. Please try again.");
        setProceeding(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
      setProceeding(false);
    }
  }

  const shippingTotal = selectedRate ? parseFloat(selectedRate.amount) : null;
  const orderTotal = shippingTotal !== null ? total + shippingTotal : null;

  const canProceed = !hasPhysical || selectedRate !== null;

  return (
    <>
      <Head>
        <title>Checkout — No Picnic Press</title>
      </Head>
      <div className="container">
        <div className="checkout-page">

          {/* ── Order summary ── */}
          <div className="checkout-summary">
            <h2 className="checkout-section-title">Order summary</h2>
            {items.map((item) => (
              <div key={item.id} className="checkout-summary-row">
                <div>
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
                <span>${(item.price * item.qty).toFixed(2)}</span>
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
            {country === "US" && total >= 50 && !promoApplied && (
              <p className="checkout-morebetter">
                Use code <strong>MOREBETTER</strong> for free shipping.
              </p>
            )}
          </div>

          {/* ── Shipping / payment ── */}
          <div>
            {hasPhysical ? (
              <>
                <h2 className="checkout-section-title">Shipping</h2>

                <div className="studio-form" style={{ marginTop: 0 }}>
                  <div className="studio-form-row">
                    <label htmlFor="co-country">Country *</label>
                    <select
                      id="co-country"
                      value={country}
                      onChange={(e) => { setCountry(e.target.value); setZip(""); }}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="studio-form-row">
                    <label htmlFor="co-zip">
                      {country === "US" ? "ZIP code *" : "Postal code"}
                    </label>
                    <input
                      id="co-zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder={country === "US" ? "e.g. 94710" : "Optional"}
                      maxLength={10}
                    />
                  </div>
                </div>

                {fetchingRates && (
                  <p style={{ fontSize: 13, color: "var(--gray-mid)", marginTop: 16 }}>
                    Fetching rates…
                  </p>
                )}
                {rateError && (
                  <p style={{ marginTop: 12, fontSize: 13, color: "#c00" }}>{rateError}</p>
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
                          onChange={() => setSelectedRate(rate)}
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

                    {!promoApplied && (
                      <form onSubmit={handleApplyPromo} className="promo-form">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => { setPromoCode(e.target.value); setPromoError(null); }}
                          placeholder="Promo code"
                        />
                        <button type="submit">Apply</button>
                      </form>
                    )}
                    {promoApplied && (
                      <p className="promo-success">MOREBETTER applied — shipping is free.</p>
                    )}
                    {promoError && (
                      <p className="promo-error">{promoError}</p>
                    )}
                  </div>
                )}

                {canProceed && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: 24 }}
                    onClick={handleProceed}
                    disabled={proceeding}
                  >
                    {proceeding ? "Redirecting…" : "Proceed to payment →"}
                  </button>
                )}
                {checkoutError && (
                  <p style={{ marginTop: 12, fontSize: 13, color: "#c00" }}>{checkoutError}</p>
                )}
              </>
            ) : (
              <>
                <h2 className="checkout-section-title">Digital delivery</h2>
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                  Your download link will be delivered to the email address you provide at payment.
                </p>
                <button className="btn-primary" onClick={handleProceed} disabled={proceeding}>
                  {proceeding ? "Redirecting…" : "Proceed to payment →"}
                </button>
                {checkoutError && (
                  <p style={{ marginTop: 12, fontSize: 13, color: "#c00" }}>{checkoutError}</p>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
