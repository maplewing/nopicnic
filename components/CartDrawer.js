import { useRouter } from "next/router";
import { useCart } from "./CartContext";

export default function CartDrawer() {
  const { items, removeItem, updateQty, total, isOpen, setIsOpen } = useCart();
  const router = useRouter();

  if (!isOpen) return null;

  function handleCheckout() {
    setIsOpen(false);
    router.push("/checkout");
  }

  return (
    <>
      <div className="cart-overlay" onClick={() => setIsOpen(false)} />
      <div className="cart-drawer">
        <div className="cart-header">
          <h2>Cart</h2>
          <button className="cart-close" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="cart-items">
          {items.length === 0 && (
            <p className="cart-empty">Your cart is empty.</p>
          )}
          {items.map((item) => (
            <div key={item.id} className="cart-item">
              <div className="cart-item-image">
                {item.images?.[0] && (
                  <img src={item.images[0]} alt={item.name} />
                )}
              </div>
              <div className="cart-item-details">
                <p className="cart-item-name">{item.name}</p>
                <p className="cart-item-price">${item.price.toFixed(2)}</p>
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
          ))}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            <div className="cart-subtotal">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button className="btn-primary" onClick={handleCheckout}>
              Checkout
            </button>
            <button className="btn-secondary" onClick={() => setIsOpen(false)}>
              Continue shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
