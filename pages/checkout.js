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

function Field({ label, id, required, children }) {
  return (
    <div className="studio-form-row">
      <label htmlFor={id}>{label}{required && " *"}</label>
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total } = useCart();

  const physicalItems = items.filter((i) => !i.isDigital);
  const hasPhysical = physicalItems.length > 0;
  const totalWeightOz = hasPhysical
    ? physicalItems.reduce((sum, i) => sum + (i.productWeightOz || 14) * i.qty, 0) +
      getPackagingOz(physicalItems)
    : 0;

  const [address, setAddress] = useState({
    name: "", street1: "", street2: "", city: "", state: "", zip: "", country: "US",
  });
  const [rates, setRates] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [rateError, setRateError] = useState(null);
  const [proceeding, setProceeding] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState(null);

  useEffect(() => {
    setRates(null);
    setSelectedRate(null);
    setPromoApplied(false);
    setPromoError(null);
  }, [address.country]);

  if (items.length === 0) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  function set(field) {
    return (e) => setAddress((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleGetRates(e) {
    e.preventDefault();
    setFetchingRates(true);
    setRateError(null);
    setRates(null);
    setSelectedRate(null);
    setPromoApplied(false);
    try {
      const res = await fetch("/api/shipping-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, weightOz: totalWeightOz }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.rates?.length) throw new Error("no rates");
      setRates(data.rates);
    } catch {
      setRateError("Couldn't fetch rates — please double-check the address and try again.");
    }
    setFetchingRates(false);
  }

  function handleApplyPromo(e) {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code !== "MOREBETTER") {
      setPromoError("Invalid promo code.");
      return;
    }
    if (address.country !== "US") {
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

  // Prepend free rate when promo is active
  const displayRates = promoApplied && rates ? [FREE_RATE, ...rates] : rates;

  async function handleProceed() {
    setProceeding(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, selectedRate }),
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setProceeding(false);
    }
  }

  const shippingTotal = selectedRate ? parseFloat(selectedRate.amount) : null;
  const orderTotal = shippingTotal !== null ? total + shippingTotal : null;

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
                <span>
                  {item.name}
                  {item.qty > 1 && <span style={{ color: "var(--gray-mid)" }}> ×{item.qty}</span>}
                </span>
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
            {address.country === "US" && total >= 50 && !promoApplied && (
              <p className="checkout-morebetter">
                Use code <strong>MOREBETTER</strong> for free shipping.
              </p>
            )}
          </div>

          {/* ── Shipping ── */}
          <div>
            {hasPhysical ? (
              <>
                <h2 className="checkout-section-title">Shipping address</h2>
                <form onSubmit={handleGetRates} className="studio-form" style={{ marginTop: 0 }}>
                  <Field label="Full name" id="co-name" required>
                    <input id="co-name" type="text" value={address.name} onChange={set("name")} required />
                  </Field>
                  <Field label="Country" id="co-country" required>
                    <select id="co-country" value={address.country} onChange={set("country")}>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Street address" id="co-street1" required>
                    <input id="co-street1" type="text" value={address.street1} onChange={set("street1")} required />
                  </Field>
                  <Field label="Apt / suite" id="co-street2">
                    <input id="co-street2" type="text" value={address.street2} onChange={set("street2")} />
                  </Field>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <Field label="City" id="co-city" required>
                      <input id="co-city" type="text" value={address.city} onChange={set("city")} required />
                    </Field>
                    {address.country === "US" ? (
                      <Field label="State" id="co-state" required>
                        <input id="co-state" type="text" value={address.state} onChange={set("state")} maxLength={2} placeholder="CA" required />
                      </Field>
                    ) : (
                      <Field label="Province / region" id="co-state">
                        <input id="co-state" type="text" value={address.state} onChange={set("state")} />
                      </Field>
                    )}
                  </div>
                  <Field label="ZIP / postal code" id="co-zip" required>
                    <input id="co-zip" type="text" value={address.zip} onChange={set("zip")} required />
                  </Field>
                  <button type="submit" className="btn-secondary" disabled={fetchingRates}>
                    {fetchingRates ? "Fetching rates…" : rates ? "Recalculate rates" : "Get shipping rates"}
                  </button>
                  {rateError && (
                    <p style={{ marginTop: 12, fontSize: 13, color: "#c00" }}>{rateError}</p>
                  )}
                </form>

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

                    {/* Promo code */}
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

                {selectedRate && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: 24 }}
                    onClick={handleProceed}
                    disabled={proceeding}
                  >
                    {proceeding ? "Redirecting…" : "Proceed to payment →"}
                  </button>
                )}
              </>
            ) : (
              <>
                <h2 className="checkout-section-title">Digital delivery</h2>
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                  Your ePub will be delivered to the email address you provide at payment.
                </p>
                <button className="btn-primary" onClick={handleProceed} disabled={proceeding}>
                  {proceeding ? "Redirecting…" : "Proceed to payment →"}
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
