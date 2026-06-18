import "../styles/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { Inter, Courier_Prime } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { CartProvider } from "../components/CartContext";
import Nav from "../components/Nav";
import CartDrawer from "../components/CartDrawer";
import Footer from "../components/Footer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["700"],
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

    // Track subsequent navigations (internal + Meta Pixel PageView)
    function handleRouteChange(url) {
      trackPageView(url);
      if (typeof window.fbq === "function") {
        window.fbq("track", "PageView");
      }
    }
    router.events.on("routeChangeComplete", handleRouteChange);

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
      router.events.off("routeChangeComplete", handleRouteChange);
      clearTimeout(engageTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Admin pages opt out of the site shell
  if (Component.noLayout) {
    return (
      <div className={`${inter.variable} ${courierPrime.variable}`}>
        <Component {...pageProps} />
      </div>
    );
  }

  return (
    <CartProvider>
      <div className={`${inter.variable} ${courierPrime.variable}`}>
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
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <Script
            id="fb-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
                n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window,document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init','${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                fbq('track','PageView');
              `,
            }}
          />
        )}
      </div>
    </CartProvider>
  );
}
