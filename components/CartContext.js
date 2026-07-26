import { createContext, useContext, useState, useEffect } from "react";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // The cart can't be read during render: the server has no localStorage, so a
  // first client render holding items wouldn't match the HTML it's hydrating.
  // It's restored on mount instead, and `hydrated` gates the save below.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("npp-cart"));
      if (Array.isArray(saved) && saved.length) setItems(saved);
    } catch {
      // A cart we can't parse is a cart we don't have.
    }
    setHydrated(true);
  }, []);

  // Without the gate this fires once on mount with the empty initial state and
  // writes [] over the saved cart before the effect above has restored it. In
  // production the next render puts it back within a frame; in development
  // StrictMode re-runs the restore, which then reads back the [] it just wrote
  // and the cart is gone for real.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("npp-cart", JSON.stringify(items));
  }, [items, hydrated]);

  function addItem(product) {
    if (typeof window.fbq === "function") {
      window.fbq("track", "AddToCart", {
        content_ids: [product.id],
        content_type: "product",
        content_name: product.name,
        value: product.price,
        currency: "USD",
      });
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQty(id, qty) {
    if (qty < 1) return removeItem(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty } : i)));
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clearCart, total, count, isOpen, setIsOpen, hydrated }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
