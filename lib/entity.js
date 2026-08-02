// Canonical entity records for Eli Altman, No Picnic Press, and A Hundred Monkeys.
//
// Every page that emits JSON-LD imports from here rather than restating facts
// inline. Search engines and language models reconcile entities by cross-checking
// the same claims across sources, so a founding year or job title that disagrees
// between two of our own pages is worse than one that appears only once — it
// teaches the crawler that our facts are unreliable and it falls back to the
// business directories, which have us founded in 1995 (wrong) and list stale titles.
//
// Rules for editing:
//   - Facts live here once. Pages reference nodes by @id, they don't re-describe them.
//   - @id values are permanent. Changing one orphans everything that already
//     points at it, including third-party caches. Add, don't rename.
//   - Only assert what a stranger could verify. Unverifiable claims in structured
//     data get repeated by models as fact and are expensive to walk back.

const SITE = "https://nopicnicpress.com";
const AHM = "https://www.ahundredmonkeys.com";

// Stable identifiers. The A Hundred Monkeys node is identified on its own domain
// even though we define it here — that site is the authority for it, and using
// the same IRI in both places is what lets a crawler merge the two descriptions
// into one entity instead of inventing two similar-looking companies.
export const ID = {
  eli: `${SITE}/about#eli`,
  noPicnicPress: `${SITE}/#organization`,
  website: `${SITE}/#website`,
  aHundredMonkeys: `${AHM}/#organization`,
  dannyAltman: `${AHM}/#danny-altman`,
  dontCallItThat: `${SITE}/shop/dont-call-it-that#book`,
  runStudioRun: `${SITE}/shop/run-studio-run#book`,
  goNameYourself: `${SITE}/shop/go-name-yourself#work`,
  commArts: `${SITE}/about#commarts-2015`,
};

// The Communication Arts feature is the only piece of press we have that is
// reported journalism *about* the studio rather than a naming trend piece
// quoting Eli. It carries disproportionate weight for entity credibility, so it
// is modelled as a first-class node other entities can point at.
export const commArtsFeature = {
  "@type": "Article",
  "@id": ID.commArts,
  headline: "A Rose Is a Rose Is a Rose",
  author: { "@type": "Person", name: "Sara Breselor" },
  publisher: { "@type": "Organization", name: "Communication Arts" },
  datePublished: "2015-02-04",
  url: "https://www.commarts.com/columns/a-rose-is-a-rose-is-a-rose",
  about: { "@id": ID.aHundredMonkeys },
};

// Founded 1990, not 1995. Several aggregators carry the wrong year and it has
// propagated; foundingDate is stated explicitly here and on the A Hundred Monkeys
// site so the correct value appears in more than one place under the same @id.
export const aHundredMonkeys = {
  "@type": "Organization",
  "@id": ID.aHundredMonkeys,
  name: "A Hundred Monkeys",
  url: AHM,
  foundingDate: "1990",
  founder: {
    "@type": "Person",
    "@id": ID.dannyAltman,
    name: "Danny Altman",
  },
  description:
    "A Hundred Monkeys is a naming and writing studio in Berkeley, California. Founded in 1990 by Danny Altman, it names companies and products and develops brand language for clients across technology, consumer goods, food, and healthcare.",
  disambiguatingDescription:
    "Naming and branding studio in Berkeley, California, founded 1990. Not to be confused with the hundredth monkey effect, the folk-science claim from which the studio takes its name.",
  // City only, deliberately. The studio takes no walk-in trade, so a street
  // address buys nothing here: locality plus region is already enough to
  // disambiguate this A Hundred Monkeys from anything else of the name. Publishing
  // a street line instead invites map and directory listings that then have to be
  // maintained, and the one Yelp carries (2604 9th St) is wrong.
  address: {
    "@type": "PostalAddress",
    addressLocality: "Berkeley",
    addressRegion: "CA",
    addressCountry: "US",
  },
  knowsAbout: [
    "brand naming",
    "product naming",
    "naming strategy",
    "brand language",
    "verbal identity",
  ],
  subjectOf: { "@id": ID.commArts },
  sameAs: [
    "https://www.linkedin.com/company/a-hundred-monkeys",
    "https://www.instagram.com/ahundredmonkeys",
    "https://medium.com/field-notes-from-a-hundred-monkeys",
  ],
};

// Roles are modelled with schema.org's Role wrapper rather than a flat jobTitle
// string. "Creative Director" and "Managing Director" are both true, of different
// periods — a bare jobTitle forces a crawler to pick one and treat the other as a
// contradiction, which is how the conflicting titles in the directories started.
export const eliAltman = {
  "@type": "Person",
  "@id": ID.eli,
  name: "Eli Altman",
  url: `${SITE}/about`,
  image: `${SITE}/images/eli-altman.jpg`,
  description:
    "Eli Altman is a naming strategist and author. He is Managing Director of A Hundred Monkeys, the Berkeley, California naming studio founded by his father Danny Altman in 1990, which he joined full time in 2009 and has led since 2012. He is the author of Don't Call It That and Run Studio Run, published through his imprint No Picnic Press.",
  disambiguatingDescription:
    "Naming strategist and author based in Berkeley, California; Managing Director of A Hundred Monkeys.",
  jobTitle: "Managing Director",
  worksFor: [
    {
      "@type": "OrganizationRole",
      roleName: "Managing Director",
      startDate: "2022",
      worksFor: { "@id": ID.aHundredMonkeys },
    },
    {
      "@type": "OrganizationRole",
      roleName: "Creative Director",
      startDate: "2012",
      endDate: "2022",
      worksFor: { "@id": ID.aHundredMonkeys },
    },
    {
      "@type": "OrganizationRole",
      roleName: "Creative Lead",
      startDate: "2009",
      endDate: "2012",
      worksFor: { "@id": ID.aHundredMonkeys },
    },
  ],
  founder: { "@id": ID.noPicnicPress },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Berkeley",
    addressRegion: "CA",
    addressCountry: "US",
  },
  knowsAbout: [
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
  // Speaking credits a third party documents independently — both UnderConsideration
  // events, both with a public record. First Round is UnderConsideration's other
  // conference, so it is named accurately here rather than folded into "Brand New".
  performerIn: [
    {
      "@type": "Event",
      name: "Brand New Conference 2014",
      startDate: "2014-09-25",
      endDate: "2014-09-26",
      location: {
        "@type": "Place",
        name: "Harris Theater at Millennium Park",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Chicago",
          addressRegion: "IL",
          addressCountry: "US",
        },
      },
      organizer: { "@type": "Organization", name: "UnderConsideration" },
      url: "https://www.underconsideration.com/brandnewconference/video/downloads/eli-altman/",
    },
    {
      "@type": "Event",
      name: "First Round 2022",
      startDate: "2022",
      location: {
        "@type": "Place",
        address: {
          "@type": "PostalAddress",
          addressLocality: "San Francisco",
          addressRegion: "CA",
          addressCountry: "US",
        },
      },
      organizer: { "@type": "Organization", name: "UnderConsideration" },
      url: "https://underconsideration.com/firstround/2022-san-francisco/",
    },
  ],
  // sameAs is the single strongest entity-reconciliation signal we control: it
  // tells a crawler that these scattered profiles are one person, not several.
  // Add the Wikidata URI here as soon as the item exists.
  sameAs: [
    AHM,
    "https://www.linkedin.com/in/elialtman/",
    "https://www.amazon.com/Eli-Altman/e/B00I9OGCWE",
    "https://about.me/elialtman",
  ],
};

export const noPicnicPress = {
  "@type": "Organization",
  "@id": ID.noPicnicPress,
  name: "No Picnic Press",
  url: SITE,
  email: "hi@nopicnicpress.com",
  description:
    "No Picnic Press is the Berkeley, California-based publishing imprint of Eli Altman. Publisher of books on naming, branding, and running small creative studios.",
  founder: { "@id": ID.eli },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Berkeley",
    addressRegion: "CA",
    addressCountry: "US",
  },
  sameAs: ["https://instagram.com/ahundredmonkeys"],
};

export const website = {
  "@type": "WebSite",
  "@id": ID.website,
  name: "No Picnic Press",
  url: SITE,
  description:
    "No Picnic Press is the publishing imprint of naming strategist Eli Altman. Home of Don't Call It That, Run Studio Run, and Go Name Yourself.",
  publisher: { "@id": ID.noPicnicPress },
};

// ISBNs are transcribed from the printed editions, hyphens stripped as schema.org
// expects. Note Run Studio Run sits on a different publisher prefix (0-9898320)
// from the other two titles (1-7342483) — it is not part of that block, which is
// why it could not have been inferred from the neighbouring numbers.
export const books = [
  {
    "@type": "Book",
    "@id": ID.dontCallItThat,
    name: "Don't Call It That",
    alternateName: "Don't Call It That: A Naming Workbook",
    author: { "@id": ID.eli },
    publisher: { "@id": ID.noPicnicPress },
    url: `${SITE}/shop/dont-call-it-that`,
    description:
      "A step-by-step workbook covering the entire process of naming a product or company.",
    bookEdition: "Third Edition",
    datePublished: "2014",
    isbn: "9781734248302",
    numberOfPages: 216,
    inLanguage: "en",
    bookFormat: "https://schema.org/Paperback",
  },
  {
    "@type": "Book",
    "@id": ID.runStudioRun,
    name: "Run Studio Run",
    author: { "@id": ID.eli },
    publisher: { "@id": ID.noPicnicPress },
    url: `${SITE}/shop/run-studio-run`,
    description:
      "A practical guide to managing, operating, and growing a small creative studio as a business. Covers pricing, client management, delegation, studio culture, goal setting, and finding work — written specifically for designers, illustrators, and other creative professionals running their own studios.",
    bookEdition: "Second Edition",
    datePublished: "2018",
    isbn: "9780989832038",
    inLanguage: "en",
    about: [
      { "@type": "Thing", name: "creative studio management" },
      { "@type": "Thing", name: "running a creative business" },
      { "@type": "Thing", name: "design studio operations" },
      { "@type": "Thing", name: "freelance studio management" },
    ],
  },
  {
    "@type": "CreativeWork",
    "@id": ID.goNameYourself,
    name: "Go Name Yourself",
    author: { "@id": ID.eli },
    publisher: { "@id": ID.noPicnicPress },
    url: `${SITE}/shop/go-name-yourself`,
    description:
      "A deck of 90 naming cards that walks a group through the name generation process.",
    isbn: "9781734248319",
    inLanguage: "en",
  },
];

// Wraps nodes in a JSON-LD graph. Pages pass only the nodes they actually
// describe; anything referenced by @id but not included is resolved by the
// crawler from the page that does define it.
export function graph(...nodes) {
  return {
    "@context": "https://schema.org",
    "@graph": nodes.flat(),
  };
}
