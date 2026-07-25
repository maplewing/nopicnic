import Head from "next/head";
import Link from "next/link";

const LAST_UPDATED = "July 25, 2026";

export default function Policies() {
  return (
    <>
      <Head>
        <title>Privacy Policy + Terms of Sale — No Picnic Press</title>
        <meta
          name="description"
          content="How No Picnic Press handles your information, and the terms that apply when you buy from us."
        />
      </Head>
      <div className="about-page legal-page">
        <h1>Privacy + Terms</h1>
        <p className="legal-updated">Last updated {LAST_UPDATED}</p>
        <p>
          Two documents on one page: our <a href="#privacy">Privacy Policy</a> and our{" "}
          <a href="#terms">Terms of Sale</a>. Both are written plainly on purpose. No Picnic
          Press is a sole proprietorship in Berkeley, California. If anything here is unclear,
          email <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a> and a person
          will answer you.
        </p>

        {/* ── Privacy ── */}

        <h2 id="privacy" className="legal-section-head">Privacy Policy</h2>

        <h3>What we collect</h3>
        <p>
          <strong>When you place an order:</strong> your name, email address, shipping address,
          billing address, and the contents of your order. Payment card details go directly to
          Stripe and are never sent to or stored on our servers.
        </p>
        <p>
          <strong>When you check shipping rates:</strong> the country and postal code you type
          into the checkout page, which we send to our shipping carriers to price your package.
        </p>
        <p>
          <strong>When you sign up for the newsletter:</strong> your email address.
        </p>
        <p>
          <strong>When you browse:</strong> pages visited, approximate location derived from
          your IP address, referring site, and device and browser type.
        </p>

        <h3>How we use it</h3>
        <p>
          To take payment, print a shipping label, send you order confirmations and tracking,
          answer your emails, deliver download links for digital purchases, keep our own books
          in order, and — only if you asked for it — send you the occasional newsletter.
        </p>
        <p>
          We do not sell your personal information. We do not share it with anyone except the
          service providers listed below, who process it on our behalf.
        </p>

        <h3>Who else sees it</h3>
        <ul>
          <li><strong>Stripe</strong> — payment processing, and the checkout form itself</li>
          <li><strong>Vercel</strong> — website hosting, plus privacy-friendly traffic analytics</li>
          <li><strong>Shippo and EasyPost</strong> — shipping rates and labels</li>
          <li><strong>Resend</strong> — order confirmation and shipping emails</li>
          <li><strong>Loops</strong> — newsletter and customer email</li>
          <li>
            <strong>Meta</strong> — advertising measurement, and not for visitors in the EEA,
            the UK, or Switzerland; see below
          </li>
        </ul>

        <h3>Advertising and tracking</h3>
        <p>
          <strong>
            If you are in the EEA, the UK, or Switzerland, we do not run any advertising
            tracking on you at all.
          </strong>{" "}
          The Meta pixel is never loaded, and we do not send Meta a server-side copy of your
          order. We could ask you for consent instead and show you a cookie banner, but we would
          rather not build one, so we simply do not track you. There is nothing for you to
          click and nothing for you to opt out of.
        </p>
        <p>
          Everywhere else, we run the Meta pixel and also send Meta a server-side copy of
          purchase events. That copy includes your email address and name in hashed form, which
          Meta uses to tell whether an ad it showed led to a sale. If you would rather not be
          included, you can opt out through{" "}
          <a href="https://www.facebook.com/adpreferences/ad_settings" target="_blank" rel="noopener noreferrer">
            Meta&rsquo;s ad settings
          </a>
          , use a browser that blocks trackers, or email us and we will exclude you.
        </p>
        <p>
          Where the pixel does run, it sets cookies in your browser. Stripe sets its own cookies
          to process your payment and prevent fraud, and those are required for the shop to work
          at all. We set one small cookie of our own recording only whether your country is one
          where we withhold tracking; it holds no identifier and nothing personal. We use no
          other advertising or tracking cookies.
        </p>

        <h3>How long we keep it</h3>
        <p>
          Order records are kept for seven years because tax law requires it. Newsletter
          subscriptions are kept until you unsubscribe. Analytics data is aggregated and
          retained by Vercel on a rolling basis.
        </p>

        <h3>Your rights</h3>
        <p>
          Wherever you live, you can ask us for a copy of what we hold about you, ask us to
          correct it, or ask us to delete it. If you are in the EU, UK, or California you have
          these rights by law; we extend them to everyone because maintaining two systems would
          be silly. Email <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a> and we
          will respond within 30 days.
        </p>
        <p>
          Every newsletter has an unsubscribe link at the bottom. Using it removes you
          immediately and we will not email you again unless you place another order, in which
          case you will still get transactional email about that order.
        </p>

        <h3>International transfers</h3>
        <p>
          We are based in the United States and our service providers store data in the United
          States. If you order from outside the US, your information will be transferred there.
        </p>

        <h3>Children</h3>
        <p>
          This shop is not directed at children under 13 and we do not knowingly collect their
          information.
        </p>

        {/* ── Terms ── */}

        <h2 id="terms" className="legal-section-head">Terms of Sale</h2>

        <h3>Orders</h3>
        <p>
          Placing an order is an offer to buy. We accept it when we send your confirmation
          email. If an item turns out to be unavailable, or a price or description was wrong,
          we may cancel the order and refund you in full — we will email you either way.
        </p>
        <p>
          Prices are in US dollars. Sales tax is calculated at checkout where we are required
          to collect it. Shipping is quoted at checkout based on the destination and weight of
          your order.
        </p>

        <h3>Payment</h3>
        <p>
          Payments are processed by Stripe. We never see or store your card number. You confirm
          that you are authorized to use the payment method you provide.
        </p>

        <h3>Shipping and delivery</h3>
        <p>
          We ship from Berkeley, typically within one to three business days. Delivery
          estimates shown at checkout are the carrier&rsquo;s estimates, not guarantees, except
          where a carrier explicitly guarantees a date. Risk of loss passes to you on delivery.
        </p>
        <p>
          For international orders, import duties and taxes are your responsibility and are not
          included in what you pay us. Full details are on our{" "}
          <Link href="/shipping-returns">Shipping + Returns</Link> page, which forms part of
          these terms.
        </p>

        <h3>Returns and refunds</h3>
        <p>
          Physical items may be returned within 14 days of receipt in new condition; return
          shipping is your responsibility. Digital purchases may be refunded within 48 hours of
          purchase. To start a return, email{" "}
          <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a>.
        </p>
        <p>
          If something arrives damaged or an order goes astray, tell us and we will make it
          right. That is not a legal formula, it is just how we would like to be treated.
        </p>

        <h3>Digital products</h3>
        <p>
          Digital purchases come with download links delivered by email. They are licensed to
          you for personal use. Please do not redistribute, resell, or post them publicly.
        </p>

        <h3>Studio sessions</h3>
        <p>
          Sessions are scheduled by arrangement after purchase. If you need to reschedule, give
          us as much notice as you can. Sessions not scheduled within twelve months of purchase
          may be refunded at our discretion.
        </p>

        <h3>Intellectual property</h3>
        <p>
          The books, card decks, zines, illustrations, and text on this site are our copyright
          or used with permission. Buying a copy buys you the copy, not the rights to it.
          Quoting a passage with attribution is welcome; reproducing chapters is not.
        </p>

        <h3>Wholesale</h3>
        <p>
          These terms cover retail purchases. Wholesale and stockist orders run on separate
          terms — email us.
        </p>

        <h3>Liability</h3>
        <p>
          These are books about naming. We stand behind the physical product and will refund or
          replace anything defective. Beyond that, and to the extent the law allows, our
          liability for any claim relating to an order is limited to what you paid for it. We
          are not liable for business decisions you make after reading them.
        </p>
        <p>
          Nothing here limits rights you have under consumer protection law in your country,
          which apply regardless of what this page says.
        </p>

        <h3>Governing law</h3>
        <p>
          These terms are governed by the laws of the State of California. If you are a
          consumer outside the US, you keep the protections of your local law.
        </p>

        <h3>Changes</h3>
        <p>
          We may update either document. The version in effect when you order is the one that
          applies to that order; material privacy changes will be announced to newsletter
          subscribers.
        </p>

        <h3>Contact</h3>
        <p>
          No Picnic Press, Berkeley, California.{" "}
          <a href="mailto:hi@nopicnicpress.com">hi@nopicnicpress.com</a>
        </p>
      </div>
    </>
  );
}
