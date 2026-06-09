import "../styles/globals.css";
import { Work_Sans, Courier_Prime } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { CartProvider } from "../components/CartContext";
import Nav from "../components/Nav";
import CartDrawer from "../components/CartDrawer";
import Footer from "../components/Footer";

const workSans = Work_Sans({
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

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <div className={`${workSans.variable} ${courierPrime.variable}`}>
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
      </div>
    </CartProvider>
  );
}
