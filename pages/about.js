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
          style={{ width: "100%", display: "block", marginBottom: 8 }}
        />
        <p style={{ fontSize: 11, color: "var(--gray-mid)", marginBottom: 40 }}>
          Photo: Carolyn McDermott
        </p>

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
          <a href="mailto:hi@elialtman.com">hi@elialtman.com</a>
        </p>

        <h2>Speaking</h2>
        <ul>
          <li>First Round Conference — San Francisco</li>
          <li>Creative Works Conference — Memphis</li>
          <li>Designers &amp; Geeks — San Francisco</li>
          <li>UC Berkeley Entrepreneurship Speaker Series — Berkeley</li>
          <li>Brand New Conference — Chicago</li>
          <li>Nearly Impossible Conference — San Francisco</li>
        </ul>

        <h2>Press</h2>
        <ul>
          <li>Monocle — The Entrepreneurs, Issue 4</li>
          <li>Bloomberg Businessweek — "Using Finnish language names to stand out"</li>
          <li>Wall Street Journal — "Why fashion brands today have such weird names"</li>
          <li>Boston Globe — Marijuana companies coverage</li>
          <li>The Guardian — "Picking the right name for your business"</li>
          <li>New York Times — "Risqué names reap rewards for some companies"</li>
          <li>Grain Edit — "Run Studio Run"</li>
          <li>The Globe &amp; Mail — "On the internet all the good names are taken"</li>
          <li>NPR — "WTF? What's wrong with that name?"</li>
          <li>Harvard Law Review — "Are we running out of trademarks?" Vol. 131, Issue 4</li>
        </ul>

        <h2>Podcasts</h2>
        <ul>
          <li>The Futur — Episode 47</li>
          <li>99% Invisible — Episode 109: "Title TK"</li>
          <li>Let's Talk Branding — S3E9</li>
          <li>Degreed — "Ryan learns how to name things"</li>
          <li>The Orthogonal Bet</li>
          <li>We Are Next — Episode 39</li>
          <li>Grits+Grids — Episode 36</li>
        </ul>
      </div>
    </>
  );
}
