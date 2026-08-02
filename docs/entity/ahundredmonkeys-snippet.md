# A Hundred Monkeys — structured data drop-in

This belongs in the **ahundredmonkeys.com** codebase (`/Users/eli/Documents/ahundredmonkeys`),
not this one. It is documented here because it is the other half of the entity layer
in `lib/entity.js` and the two have to agree.

## Why this matters

`lib/entity.js` on this site describes A Hundred Monkeys under the identifier
`https://www.ahundredmonkeys.com/#organization`. That identifier only does its job
if the AHM site *also* publishes a node under the same `@id`. When both sites use
one IRI, a crawler merges the two descriptions into a single entity. When they
don't, it sees two similarly-named companies and trusts neither.

Two details that are easy to get wrong:

- **Use `www`.** `ahundredmonkeys.com` 301-redirects to `www.ahundredmonkeys.com`,
  so `www` is canonical and the `@id` must match it exactly.
- **Keep the `@id` forever.** Renaming it later orphans every reference, including
  third-party caches that have already ingested it.

## The node

Emit this on the AHM homepage (and ideally the About page):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.ahundredmonkeys.com/#organization",
      "name": "A Hundred Monkeys",
      "url": "https://www.ahundredmonkeys.com/",
      "foundingDate": "1990",
      "founder": {
        "@type": "Person",
        "@id": "https://www.ahundredmonkeys.com/#danny-altman",
        "name": "Danny Altman"
      },
      "description": "A Hundred Monkeys is a naming and writing studio in Berkeley, California. Founded in 1990 by Danny Altman, it names companies and products and develops brand language for clients across technology, consumer goods, food, and healthcare.",
      "disambiguatingDescription": "Naming and branding studio in Berkeley, California, founded 1990. Not to be confused with the hundredth monkey effect, the folk-science claim from which the studio takes its name.",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Berkeley",
        "addressRegion": "CA",
        "addressCountry": "US"
      },
      "employee": {
        "@type": "Person",
        "@id": "https://nopicnicpress.com/about#eli",
        "name": "Eli Altman",
        "jobTitle": "Managing Director",
        "url": "https://nopicnicpress.com/about"
      },
      "subjectOf": {
        "@type": "Article",
        "@id": "https://nopicnicpress.com/about#commarts-2015",
        "headline": "A Rose Is a Rose Is a Rose",
        "author": { "@type": "Person", "name": "Sara Breselor" },
        "publisher": { "@type": "Organization", "name": "Communication Arts" },
        "datePublished": "2015-02-04",
        "url": "https://www.commarts.com/columns/a-rose-is-a-rose-is-a-rose"
      },
      "sameAs": [
        "https://www.linkedin.com/company/a-hundred-monkeys",
        "https://www.instagram.com/ahundredmonkeys",
        "https://medium.com/field-notes-from-a-hundred-monkeys"
      ]
    }
  ]
}
</script>
```

Add the Wikidata URI to `sameAs` on both sites once the item exists.

## On the address

City only, on purpose. The studio takes no walk-in trade, so a street line buys
nothing that `Berkeley, CA` doesn't already give you for disambiguation — and it
invites map and directory listings that then need maintaining. Note that the
address Yelp carries (2604 9th St) is **wrong**; the physical address is 1715 9th
Street and the mailing address is a PO box. Neither is published here.

If a street address is ever needed — a Google Business Profile, say — use the
physical one, and add it in both places at once so the two sites don't disagree.
