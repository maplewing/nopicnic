import Link from "next/link";
import { useCart } from "./CartContext";

export default function Nav() {
  const { count, setIsOpen } = useCart();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-logo">
          <img src="/images/npp-logo.png" alt="No Picnic Press" />
        </Link>
        <ul className="nav-links">
          <li><Link href="/">Shop</Link></li>
          <li><Link href="/stockists">Stockists</Link></li>
          <li><Link href="/about">Eli</Link></li>
          <li><Link href="/studio-sessions">Studio Sessions</Link></li>
          <li><a href="https://www.ahundredmonkeys.com/?s=Eli+Altman&post_type=post" target="_blank" rel="noopener">Blog</a></li>
        </ul>
        <button className="nav-cart" onClick={() => setIsOpen(true)}>
          Cart {count > 0 && `(${count})`}
        </button>
      </div>
    </nav>
  );
}
