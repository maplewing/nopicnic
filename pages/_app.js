import "../styles/globals.css";
import { Raleway } from "next/font/google";
import { CartProvider } from "../components/CartContext";
import Nav from "../components/Nav";
import CartDrawer from "../components/CartDrawer";
import Footer from "../components/Footer";

const raleway = Raleway({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
  variable: "--font-sans",
});

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <div className={raleway.variable} style={{ fontFamily: "var(--font-sans)" }}>
        <Nav />
        <CartDrawer />
        <main>
          <Component {...pageProps} />
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}
