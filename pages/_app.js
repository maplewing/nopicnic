import "../styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Montserrat, Courier_Prime } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { CartProvider } from "../components/CartContext";
import Nav from "../components/Nav";
import CartDrawer from "../components/CartDrawer";
import Footer from "../components/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-display",
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-body",
});

function trackPageView(url) {
  if (url.startsWith("/admin") || url.startsWith("/api")) return;
  const body = { page: url };
  try {
    const KEY = "npp-sess";
    const state = sessionStorage.getItem(KEY);
    if (!state) {
      // First page of this browser session → visitor
      sessionStorage.setItem(KEY, "1");
      body.sessionStart = true;
    } else if (state === "1") {
      // Second page in same session → engaged (not a bounce)
      sessionStorage.setItem(KEY, "2+");
      body.sessionEngaged = true;
    }
    // 3rd+ pages: just track the page view, no extra flags
  } catch (_) {
    // sessionStorage unavailable (e.g. SSR context)
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Track initial page load
    trackPageView(router.asPath);
    // Track subsequent navigations
    router.events.on("routeChangeComplete", trackPageView);

    // Also mark as engaged after 30s on site (catches single-page deep reads)
    const KEY = "npp-sess";
    const engageTimer = setTimeout(() => {
      try {
        if (sessionStorage.getItem(KEY) === "1") {
          sessionStorage.setItem(KEY, "2+");
          fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionEngaged: true }),
            keepalive: true,
          }).catch(() => {});
        }
      } catch (_) {}
    }, 10000);

    return () => {
      router.events.off("routeChangeComplete", trackPageView);
      clearTimeout(engageTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin pages opt out of the site shell
  if (Component.noLayout) {
    return (
      <div className={`${montserrat.variable} ${courierPrime.variable}`}>
        <Component {...pageProps} />
      </div>
    );
  }

  return (
    <CartProvider>
      <div className={`${montserrat.variable} ${courierPrime.variable}`}>
        <div className="shipping-banner">
          Use code MOREBETTER for free domestic shipping on orders of $50 or more
        </div>
        <Nav />
        <CartDrawer />
        <main>
          <Component {...pageProps} />
        </main>
        <Footer />
        <SpeedInsights />
        <Analytics />
      </div>
    </CartProvider>
  );
}
