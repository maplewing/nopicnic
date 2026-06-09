import Head from "next/head";

export default function ShippingReturns() {
  return (
    <>
      <Head>
        <title>Shipping + Returns — No Picnic Press</title>
      </Head>
      <div className="about-page">
        <h1>Shipping + Returns</h1>

        <h2>U.S. Shipping</h2>
        <p>
          All domestic packages are shipped via USPS Media Mail unless Priority Mail or FedEx
          Overnight is selected. Neither Media Mail nor Priority Mail offer guaranteed delivery
          dates, though FedEx Overnight shipments come with FedEx guarantees. We process orders
          Monday through Friday, typically shipping in the morning. We occasionally use UPS when
          delivery windows align similarly.
        </p>
        <p>
          Domestic shipping costs depend on package weight and are calculated individually per
          shipment.
        </p>

        <h2>International Shipping</h2>
        <p>
          Export fees and duties are paid by No Picnic Press. Import fees and duties are the
          responsibility of the buyer. International shipping doesn't include surcharges and we
          sometimes subsidize costs.
        </p>
        <p>
          If you're outside the U.S., check our{" "}
          <a href="/stockists">international stockists</a> before ordering directly — a local
          retailer may offer better pricing and faster delivery.
        </p>

        <h2>Returns</h2>
        <p>
          Returns are accepted within 14 days of receipt for physical products in new condition.
          Return shipping is the responsibility of the buyer.
        </p>
        <p>
          Digital purchases are eligible for a refund within 48 hours of purchase.
        </p>
        <p>
          To initiate a return or with any questions, email{" "}
          <a href="mailto:nopicnicpress@gmail.com">nopicnicpress@gmail.com</a>.
        </p>
      </div>
    </>
  );
}
