import Head from "next/head";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { useCart } from "../components/CartContext";
import { STANDARD_MAILER_OZ, LARGE_MAILER_OZ } from "../data/products";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

const AddressAutofill = dynamic(
  () => import("@mapbox/search-js-react").then((m) => ({ default: m.AddressAutofill })),
  { ssr: false }
);

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

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, updateQty, removeItem, hydrated } = useCart();

  const physicalItems = items.filter((i) => !i.isDigital);
  const hasPhysical = physicalItems.length > 0;
  const totalWeightOz = hasPhysical
    ? physicalItems.reduce((sum, i) => sum + (i.productWeightOz || 14) * i.qty, 0) +
      getPackagingOz(physicalItems)
    : 0;

  const [address, setAddress] = useState({
    street: "", city: "", state: "", zip: "", country: "US",
  });
  const [rates, setRates] = useState(null);
  const [selectedRate, setSelectedRate] = useState(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [rateError, setRateError] = useState(null);
  const [proceeding, setProceeding] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState(null);

  // Called when user picks a suggestion from Mapbox autocomplete
  function handleRetrieve(res) {
    const props = res.features[0]?.properties;
    if (!props) return;
    const newCountry = (props.country_code || "").toUpperCase();
    setAddress({
      street: props.address_line1 || "",
      city: props.place || props.address_level2 || "",
      state: props.region_code || props.address_level1 || "",
      zip: props.postcode || "",
      country: newCountry || "US",
    });
  }

  // Auto-fetch rates when zip or country changes
  useEffect(() => {
    if (!hasPhysical) return;

    const isUS = address.country === "US";
    if (isUS && address.zip.length < 5) {
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
            address: {
              country: address.country,
              zip: address.zip,
              city: address.city,
              state: address.state,
              street1: address.street,
            },
            weightOz: totalWeightOz,
          }),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data.rates?.length) throw new Error("no rates");
        setRates(data.rates);
        setSelectedRate(data.rates[0]); // auto-select cheapest (Media Mail when available)
      } catch {
        setRateError("Couldn't fetch rates. Please check your address and try again.");
      }
      setFetchingRates(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [address.zip, address.country]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) return null;
  if (items.length === 0) {
    if (typeof window !== "undefined") router.push("/");
    return null;
  }

  function handleApplyPromo(e) {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (code !== "MOREBETTER") { setPromoError("Invalid promo code."); return; }
    if (address.country !== "US") { setPromoError("Free shipping is for US orders only."); return; }
    if (total < 50) { setPromoError("MOREBETTER applies to orders of $50 or more."); return; }
    setPromoApplied(true);
    setPromoError(null);
    setSelectedRate(FREE_RATE);
  }

  const displayRates = promoApplied && rates ? [FREE_RATE, ...rates] : rates;

  const fetchClientSecret = useCallback(() => {
    return fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, selectedRate, address }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.clientSecret) throw new Error(data.error || "No client secret");
        return data.clientSecret;
      });
  }, [items, selectedRate, address]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleProceed() {
    setProceeding(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, selectedRate, address }),
      });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setCheckoutError(data.error || "Something went wrong. Please try again.");
        setProceeding(false);
        return;
      }
      setClientSecret(data.clientSecret);
      setProceeding(false);
      setTimeout(() => document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" }), 100);
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
      <Head><title>Checkout — No Picnic Press</title></Head>
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
          </div>

          {/* ── Shipping / payment ── */}
          <div>
            {hasPhysical ? (
              <>
                <h2 className="checkout-section-title">Shipping</h2>
                <div className="studio-form" style={{ marginTop: 0 }}>

                  <div className="studio-form-row">
                    <label htmlFor="co-address">Address</label>
                    <AddressAutofill
                      accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
                      onRetrieve={handleRetrieve}
                    >
                      <input
                        id="co-address"
                        type="text"
                        placeholder="Start typing your address…"
                        autoComplete="shipping address-line1"
                        value={address.street}
                        onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                      />
                    </AddressAutofill>
                  </div>

                  <div className="studio-form-row">
                    <label htmlFor="co-zip">ZIP / Postal code</label>
                    <input
                      id="co-zip"
                      type="text"
                      value={address.zip}
                      onChange={(e) => setAddress((prev) => ({ ...prev, zip: e.target.value }))}
                      placeholder="e.g. 94710"
                      maxLength={10}
                    />
                  </div>

                </div>

                {fetchingRates && (
                  <p style={{ fontSize: 13, color: "var(--gray-mid)", marginTop: 16 }}>Fetching rates…</p>
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
                    {promoApplied && <p className="promo-success">MOREBETTER applied — shipping is free.</p>}
                    {promoError && <p className="promo-error">{promoError}</p>}
                  </div>
                )}

                {canProceed && !clientSecret && (
                  <button
                    className="btn-primary"
                    style={{ marginTop: 24 }}
                    onClick={handleProceed}
                    disabled={proceeding}
                  >
                    {proceeding ? "Loading…" : "Proceed to payment →"}
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
                {!clientSecret && (
                  <button className="btn-primary" onClick={handleProceed} disabled={proceeding}>
                    {proceeding ? "Loading…" : "Proceed to payment →"}
                  </button>
                )}
                {checkoutError && (
                  <p style={{ marginTop: 12, fontSize: 13, color: "#c00" }}>{checkoutError}</p>
                )}
              </>
            )}

            {clientSecret && (
              <div id="payment-section" style={{ marginTop: 40 }}>
                <h2 className="checkout-section-title">Payment</h2>
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{ clientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
