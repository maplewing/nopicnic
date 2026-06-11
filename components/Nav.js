import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCart } from "./CartContext";

export default function Nav() {
  const { count, setIsOpen } = useCart();
  const { pathname } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const close = () => setMenuOpen(false);

  return (
    <>
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-logo" onClick={close}>
            <img src="/images/npp-logo.png" alt="No Picnic Press" />
          </Link>
          <ul className="nav-links">
            <li><Link href="/" style={{ fontWeight: pathname === "/" || pathname.startsWith("/shop") ? 700 : undefined }}>Shop</Link></li>
            <li><Link href="/stockists" style={{ fontWeight: pathname === "/stockists" ? 700 : undefined }}>Stockists</Link></li>
            <li><Link href="/about" style={{ fontWeight: pathname === "/about" ? 700 : undefined }}>Eli</Link></li>
            <li><Link href="/studio-sessions" style={{ fontWeight: pathname === "/studio-sessions" ? 700 : undefined }}>Studio Sessions</Link></li>
            <li><a href="https://www.ahundredmonkeys.com/?s=Eli+Altman&post_type=post" target="_blank" rel="noopener">Blog</a></li>
          </ul>
          <button className="nav-cart nav-cart-desktop" onClick={() => setIsOpen(true)}>
            Cart {count > 0 && `(${count})`}
          </button>
          <div className="nav-mobile-controls">
            <button className="nav-cart" onClick={() => { setIsOpen(true); close(); }}>
              Cart {count > 0 && `(${count})`}
            </button>
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <span className={menuOpen ? "open" : ""}></span>
              <span className={menuOpen ? "open" : ""}></span>
              <span className={menuOpen ? "open" : ""}></span>
            </button>
          </div>
        </div>
      </nav>
      {menuOpen && (
        <div className="nav-mobile-menu">
          <ul>
            <li><Link href="/" onClick={close} style={{ fontWeight: pathname === "/" || pathname.startsWith("/shop") ? 700 : undefined }}>Shop</Link></li>
            <li><Link href="/stockists" onClick={close} style={{ fontWeight: pathname === "/stockists" ? 700 : undefined }}>Stockists</Link></li>
            <li><Link href="/about" onClick={close} style={{ fontWeight: pathname === "/about" ? 700 : undefined }}>Eli</Link></li>
            <li><Link href="/studio-sessions" onClick={close} style={{ fontWeight: pathname === "/studio-sessions" ? 700 : undefined }}>Studio Sessions</Link></li>
            <li><a href="https://www.ahundredmonkeys.com/?s=Eli+Altman&post_type=post" target="_blank" rel="noopener" onClick={close}>Blog</a></li>
          </ul>
        </div>
      )}
    </>
  );
}
