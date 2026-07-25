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

export default function App({ Component, pageProps }) {
  const router = useRouter();

  useEffect(() => {
    // Page views come from Vercel Analytics below; this only mirrors them to the
    // Meta Pixel, which doesn't see client-side route changes on its own.
    function handleRouteChange() {
      if (typeof window.fbq === "function") {
        window.fbq("track", "PageView");
      }
    }
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => router.events.off("routeChangeComplete", handleRouteChange);
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
          Free domestic shipping on orders of $50 or more — use code MOREBETTER at checkout
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
