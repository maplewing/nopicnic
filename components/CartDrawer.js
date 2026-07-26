import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "./CartContext";
import { FREE_SHIPPING_MINIMUM_USD } from "../data/products";

export default function CartDrawer() {
  const { items, removeItem, updateQty, total, isOpen, setIsOpen } = useCart();
  const router = useRouter();

  if (!isOpen) return null;

  // Digital-only carts never ship, so the threshold is noise for them.
  const shipsPhysical = items.some((i) => !i.isDigital && !i.isService);
  const remaining = FREE_SHIPPING_MINIMUM_USD - total;
  const progress = Math.min(total / FREE_SHIPPING_MINIMUM_USD, 1);

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
              <Link
                href={`/shop/${item.slug}`}
                className="cart-item-image"
                onClick={() => setIsOpen(false)}
                aria-label={`View ${item.name}`}
              >
                {item.images?.[0] && (
                  <Image
                    src={item.images[0]}
                    alt={item.name}
                    fill
                    sizes="80px"
                    style={{ objectFit: "cover" }}
                  />
                )}
              </Link>
              <div className="cart-item-details">
                <Link
                  href={`/shop/${item.slug}`}
                  className="cart-item-name"
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
                <p className="cart-item-price">${item.price.toFixed(2)}</p>
                {/* Physical lines get both: stepping down to zero also removes,
                    but that isn't a thing anyone expects to have to discover. */}
                {item.isDigital || item.isService ? (
                  <button className="cart-item-remove" onClick={() => removeItem(item.id)}>Remove</button>
                ) : (
                  <div className="cart-item-controls">
                    <div className="cart-item-qty">
                      <button onClick={() => updateQty(item.id, item.qty - 1)} aria-label={`Decrease quantity of ${item.name}`}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} aria-label={`Increase quantity of ${item.name}`}>+</button>
                    </div>
                    <button className="cart-item-remove" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="cart-footer">
            {shipsPhysical && (
              <div className="cart-shipping-meter">
                <p className={remaining > 0 ? "cart-shipping-note" : "cart-shipping-note earned"}>
                  {remaining > 0
                    ? `Add $${remaining.toFixed(2)} for free U.S. shipping`
                    : "Free U.S. shipping unlocked"}
                </p>
                <div className="cart-shipping-track" aria-hidden>
                  <div
                    className={progress >= 1 ? "cart-shipping-fill earned" : "cart-shipping-fill"}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
            )}
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
