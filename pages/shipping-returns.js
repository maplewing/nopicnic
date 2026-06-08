import Head from "next/head";

export default function ShippingReturns() {
  return (
    <>
      <Head>
        <title>Shipping + Returns — No Picnic Press</title>
      </Head>
      <div className="about-page">
        <h1>Shipping + Returns</h1>
        <p>
          Orders ship from Berkeley, CA via USPS. Standard shipping takes 5–10 business days
          within the US. International orders may take longer.
        </p>
        <p>
          Free shipping on orders over $50.
        </p>
        <p>
          If something arrives damaged or there's an issue with your order, email us at{" "}
          <a href="mailto:hi@elialtman.com">hi@elialtman.com</a> and we'll make it right.
        </p>
        <p>
          Digital products are delivered via email and are non-refundable.
        </p>
      </div>
    </>
  );
}
