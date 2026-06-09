import Head from "next/head";

export default function About() {
  return (
    <>
      <Head>
        <title>Eli — No Picnic Press</title>
      </Head>
      <div className="about-page">
        <h1>Eli Altman</h1>
        <img
          src="/images/eli-altman.jpg"
          alt="Eli Altman"
          style={{ width: "100%", marginBottom: 32, display: "block" }}
        />
        <p>
          No Picnic Press is the Berkeley, California-based publishing imprint of Eli Altman.
          Eli is the Managing Director at the naming studio{" "}
          <a href="https://ahundredmonkeys.com" target="_blank" rel="noopener">A Hundred Monkeys</a>.
        </p>
        <p>
          He is the author of{" "}
          <a href="/shop/dont-call-it-that">Don't Call It That</a>, the naming workbook,
          now in its third edition.{" "}
          <a href="/shop/run-studio-run">Run Studio Run</a> is the go-to guide for running
          small creative studios.{" "}
          <a href="/shop/go-name-yourself">Go Name Yourself</a> is the deck of cards for
          name generation.{" "}
          <a href="/shop/assorted-characters">Assorted Characters</a> is a three-volume zine
          dedicated to the names that naming professionals find interesting.
        </p>
        <p>
          As seen in the Boston Globe, The Guardian, New York Times, NPR, and the Harvard Law Review.
        </p>
        <p>
          <a href="mailto:hi@elialtman.com">hi@elialtman.com</a>
        </p>
      </div>
    </>
  );
}
