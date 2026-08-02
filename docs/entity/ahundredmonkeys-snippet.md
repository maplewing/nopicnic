# A Hundred Monkeys — structured data

**Status: wired in.** This lives in the ahundredmonkeys.com repo
(`/Users/eli/Documents/ahundredmonkeys`) as `src/lib/entity.ts`, rendered site-wide
from `src/app/layout.tsx`. This page documents the arrangement and why it is shaped
the way it is; the code is the source of truth.

## Why the two sites share an identifier

`lib/entity.js` on this site describes A Hundred Monkeys under the identifier
`https://www.ahundredmonkeys.com/#organization`. The AHM site publishes its own
node under that same `@id`. When both sites use one IRI, a crawler merges the two
descriptions into a single entity. When they don't, it sees two similarly-named
companies and trusts neither.

Two details that are easy to get wrong:

- **Use `www`.** `ahundredmonkeys.com` 301-redirects to `www.ahundredmonkeys.com`,
  so `www` is canonical and the `@id` must match it exactly.
- **Keep the `@id` forever.** Renaming it later orphans every reference, including
  third-party caches that have already ingested it.

## The two copies need not be identical

They must not *contradict* each other, which is a weaker requirement. The AHM copy
is typed `ProfessionalService` (a subtype of `Organization`) and carries the phone
number and PO box; this site's copy is typed `Organization` and gives city only.
Both state Berkeley, CA, US and a 1990 founding, so they agree everywhere they
overlap and the AHM copy is simply a superset.

## Where the node lives

Deliberately not reproduced here. A second copy of the JSON in a document nobody
runs is exactly the drift this whole arrangement exists to prevent — it would go
stale the first time the real node changed, and then contradict it.

Read it at `src/lib/entity.ts` in the AHM repo. The commentary there covers the
`@id` contract, why the type is `ProfessionalService`, and why the email is
omitted.

## On the address

The AHM site publishes the PO box (2905, Berkeley CA 94702), which was already
there and is a real mailing address — reasonable for a node typed
`ProfessionalService` that also carries a phone number. This site gives city only.
The two agree on Berkeley, CA, US; one simply says more.

No street address is published anywhere, on purpose. The studio takes no walk-in
trade, so a street line buys nothing that `Berkeley, CA` doesn't already give you
for disambiguation, and it invites map and directory listings that then need
maintaining.

For the record, since it is wrong in the places that get scraped: the address Yelp
carries (2604 9th St) is **not** the studio's. The physical address is 1715 9th
Street. If a street address is ever genuinely needed — a Google Business Profile,
say — use that one, and add it in both places at once so the two sites don't
start disagreeing.
