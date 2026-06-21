import Head from "next/head";

export default function About() {
  return (
    <>
      <Head>
        <title>Eli Altman — No Picnic Press</title>
        <meta name="description" content="Eli Altman is the author of Don't Call It That and Run Studio Run, and Managing Director of naming studio A Hundred Monkeys. No Picnic Press is his Berkeley, California-based publishing imprint." />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Person",
                  "@id": "https://nopicnicpress.com/about#eli",
                  "name": "Eli Altman",
                  "jobTitle": "Managing Director",
                  "worksFor": {
                    "@type": "Organization",
                    "name": "A Hundred Monkeys",
                    "url": "https://www.ahundredmonkeys.com",
                  },
                  "description": "Eli Altman is a naming strategist and the author of Don't Call It That, Run Studio Run, and Go Name Yourself. He is Managing Director of A Hundred Monkeys, a naming studio based in Berkeley, California. His work on brand and product naming has been covered by the New York Times, Wall Street Journal, Bloomberg Businessweek, The Guardian, NPR, and Harvard Law Review.",
                  "url": "https://nopicnicpress.com/about",
                  "image": "https://nopicnicpress.com/images/eli-altman.jpg",
                  "address": {
                    "@type": "PostalAddress",
                    "addressLocality": "Berkeley",
                    "addressRegion": "CA",
                    "addressCountry": "US",
                  },
                  "knowsAbout": [
                    "brand naming",
                    "product naming",
                    "naming strategy",
                    "brand strategy",
                    "trademark",
                    "creative studio management",
                    "running a creative business",
                    "design studio operations",
                    "creative agency management",
                    "freelance studio management",
                  ],
                  "sameAs": ["https://www.ahundredmonkeys.com"],
                },
                {
                  "@type": "Book",
                  "name": "Don't Call It That",
                  "author": { "@id": "https://nopicnicpress.com/about#eli" },
                  "url": "https://nopicnicpress.com/shop/dont-call-it-that",
                  "description": "A step-by-step workbook covering the entire process of naming a product or company.",
                  "publisher": { "@type": "Organization", "name": "No Picnic Press" },
                  "bookEdition": "Third Edition",
                },
                {
                  "@type": "Book",
                  "name": "Run Studio Run",
                  "author": { "@id": "https://nopicnicpress.com/about#eli" },
                  "url": "https://nopicnicpress.com/shop/run-studio-run",
                  "description": "A practical guide to managing, operating, and growing a small creative studio as a business. Covers pricing, client management, delegation, studio culture, goal setting, and finding work — written specifically for designers, illustrators, and other creative professionals running their own studios.",
                  "publisher": { "@type": "Organization", "name": "No Picnic Press" },
                  "bookEdition": "Second Edition",
                  "about": [
                    { "@type": "Thing", "name": "creative studio management" },
                    { "@type": "Thing", "name": "running a creative business" },
                    { "@type": "Thing", "name": "design studio operations" },
                    { "@type": "Thing", "name": "freelance studio management" },
                  ],
                },
              ],
            }),
          }}
        />
      </Head>
      <div className="about-page">
        <img
          src="/images/eli-altman.jpg"
          alt="Eli Altman"
          style={{ width: "100%", display: "block", marginBottom: 8 }}
        />
        <p style={{ fontSize: 13, color: "var(--gray-mid)", marginBottom: 40 }}>
          Photo: Carolyn McDermott
        </p>

        <p>
          No Picnic Press is the Berkeley, California-based publishing imprint of Eli Altman.
          Eli is the Managing Director at the naming studio{" "}
          <a href="https://ahundredmonkeys.com" target="_blank" rel="noopener">A Hundred Monkeys</a>.
          He took his first professional naming project at 16 years old and joined A Hundred Monkeys
          full time in 2009. Under his tenure he consistently grew the business while running
          projects for a diverse group of clients including Coca-Cola, Nike, Lego, Samsung, Miro,
          and The Slanted Door Group.
        </p>
        <p>
          Eli has been featured in NPR, The New York Times, Monocle, Harvard Law Review, and The
          Wall Street Journal for naming and branding pieces. He was the first namer, and
          non-graphic designer, to speak at the Brand New Conference. In 2014, he published{" "}
          <a href="/shop/dont-call-it-that">Don&rsquo;t Call It That</a>, a naming workbook that
          became a best-seller. In 2018 he released his second book,{" "}
          <a href="/shop/run-studio-run">Run Studio Run</a>, a guide to running small creative
          studios.
        </p>
        <p>
          If you want to say hi,{" "}
          <a href="mailto:hi@nopicnicpress.com">reach out here</a>.
        </p>

        <h2>Speaking</h2>
        <ul style={{ fontSize: 13, fontFamily: "var(--font-body)" }}>
          <li>
            <a href="https://underconsideration.com/firstround/2022-san-francisco/" target="_blank" rel="noopener">First Round Conference</a>
            {" "}— San Francisco
          </li>
          <li>
            <a href="https://conference.creativeworks.co/" target="_blank" rel="noopener">Creative Works Conference</a>
            {" "}— Memphis
          </li>
          <li>
            <a href="https://designersandgeeks.com/events/dont-call-it-that" target="_blank" rel="noopener">Designers &amp; Geeks</a>
            {" "}— San Francisco
          </li>
          <li>
            <a href="https://www.youtube.com/watch?v=YL1QP47k-PI" target="_blank" rel="noopener">UC Berkeley Entrepreneurship Speaker Series</a>
            {" "}— Berkeley
          </li>
          <li>
            <a href="https://www.underconsideration.com/brandnewconference/video/downloads/eli-altman/" target="_blank" rel="noopener">Brand New Conference</a>
            {" "}— Chicago
          </li>
          <li>
            <a href="http://nearlyimpossible.org/conference/sf/" target="_blank" rel="noopener">Nearly Impossible Conference</a>
            {" "}— San Francisco
          </li>
        </ul>

        <h2>Press</h2>
        <ul style={{ fontSize: 13, fontFamily: "var(--font-body)" }}>
          <li>
            <a href="https://monocle.com/shop/product/1969445/" target="_blank" rel="noopener">Monocle</a>
            {" "}— The Entrepreneurs, Issue 4
          </li>
          <li>
            <a href="https://www.bloomberg.com/news/articles/2022-04-13/finnish-language-becomes-hot-trend-for-company-names" target="_blank" rel="noopener">Bloomberg Businessweek</a>
            {" "}— "Using Finnish language names to stand out"
          </li>
          <li>
            <a href="https://www.wsj.com/articles/why-fashion-brands-today-have-such-strange-names-11578934264" target="_blank" rel="noopener">Wall Street Journal</a>
            {" "}— "Why fashion brands today have such weird names"
          </li>
          <li>
            <a href="https://www.bostonglobe.com/news/marijuana/2019/01/13/this-baked-bean-isn-what-you-think/T7l5wOzvN9fSwCKMYkG2gO/story.html" target="_blank" rel="noopener">Boston Globe</a>
            {" "}— Marijuana companies coverage
          </li>
          <li>
            <a href="https://www.theguardian.com/small-business-network/2017/aug/22/longer-is-better-and-dont-invent-words-picking-the-right-name-for-your-business" target="_blank" rel="noopener">The Guardian</a>
            {" "}— "Picking the right name for your business"
          </li>
          <li>
            <a href="https://www.nytimes.com/2014/04/24/business/smallbusiness/risque-names-reap-rewards-for-some-companies.html" target="_blank" rel="noopener">New York Times</a>
            {" "}— "Risqué names reap rewards for some companies"
          </li>
          <li>
            <a href="https://www.grainedit.com/2017/12/19/run-studio-run/" target="_blank" rel="noopener">Grain Edit</a>
            {" "}— "Run Studio Run"
          </li>
          <li>
            <a href="https://www.theglobeandmail.com/technology/on-the-internet-all-the-good-company-names-are-taken/article17417167/" target="_blank" rel="noopener">The Globe &amp; Mail</a>
            {" "}— "On the internet all the good names are taken"
          </li>
          <li>
            <a href="https://www.npr.org/templates/story/story.php?storyId=113465207" target="_blank" rel="noopener">NPR</a>
            {" "}— "WTF? What's wrong with that name?"
          </li>
          <li>
            <a href="https://harvardlawreview.org/2018/02/are-we-running-out-of-trademarks/" target="_blank" rel="noopener">Harvard Law Review</a>
            {" "}— "Are we running out of trademarks?" Vol. 131, Issue 4
          </li>
        </ul>

        <h2>Podcasts</h2>
        <ul style={{ fontSize: 13, fontFamily: "var(--font-body)" }}>
          <li>
            <a href="https://www.thefutur.com/the-importance-of-a-name-with-eli-altman/" target="_blank" rel="noopener">The Futur</a>
            {" "}— Episode 47
          </li>
          <li>
            <a href="https://soundcloud.com/roman-mars/99-invisible-109-title-tk" target="_blank" rel="noopener">99% Invisible</a>
            {" "}— Episode 109: "Title TK"
          </li>
          <li>
            <a href="https://open.spotify.com/episode/5wmvUk39rN6ZWXS6hK0rs9" target="_blank" rel="noopener">Let's Talk Branding</a>
            {" "}— S3E9
          </li>
          <li>
            <a href="https://www.youtube.com/watch?v=CKTT0h6n0fc&t=2s" target="_blank" rel="noopener">Degreed</a>
            {" "}— "Ryan learns how to name things"
          </li>
          <li>
            <a href="https://podcasts.apple.com/us/podcast/the-orthogonal-bet/id1796494444?i=1000692394068" target="_blank" rel="noopener">The Orthogonal Bet</a>
          </li>
          <li>
            <a href="https://we-are-next.com/episodes/elialtman" target="_blank" rel="noopener">We Are Next</a>
            {" "}— Episode 39
          </li>
          <li>
            <a href="https://gritsandgrids.com/2017/05/podcast-ep-36-eli-altman-naming-genius/" target="_blank" rel="noopener">Grits+Grids</a>
            {" "}— Episode 36
          </li>
        </ul>
      </div>
    </>
  );
}
