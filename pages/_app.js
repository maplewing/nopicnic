import "../styles/globals.css";
import { CartProvider } from "../components/CartContext";
import Nav from "../components/Nav";
import CartDrawer from "../components/CartDrawer";
import Footer from "../components/Footer";

export default function App({ Component, pageProps }) {
  return (
    <CartProvider>
      <Nav />
      <CartDrawer />
      <main>
        <Component {...pageProps} />
      </main>
      <Footer />
    </CartProvider>
  );
}
