# Wikidata items

Five items exist. This records what they are, how they link together, and the
reasoning behind the choices — so the next person to touch them (probably you, in a
year) doesn't have to re-derive it.

| Item | Q-number |
|---|---|
| A Hundred Monkeys | `Q140820950` |
| Danny Altman | `Q140820955` |
| Eli Altman | `Q140821007` |
| Don't Call It That | `Q140821009` |
| Run Studio Run | `Q140821065` |

Editing account: `User:AbstractArtifact`, with the connection disclosed on its user
page. Keep that disclosure there. Undisclosed self-editing is what turns a routine
item into a deletion discussion, and the account name doesn't identify Eli on its own.

## Why Wikidata rather than Wikipedia

Wikidata's inclusion policy (WD:N) is a genuinely lower bar than Wikipedia's
WP:NCORP. An item is permitted if it describes a clearly identifiable entity that
can be described using serious, publicly available references — it does not require
the multiple independent in-depth sources NCORP demands. Two books with ISBNs plus
the 2015 Communication Arts feature clear that comfortably.

WD:N also admits items that fill a *structural need*: things required to make
statements on other items work. That is why Danny Altman has an item. He is not
independently famous, and doesn't need to be.

Wikidata feeds knowledge panels and is ingested directly by language models, so it
does most of the work a Wikipedia page would have done — see
`ahm-wikipedia-notability` in the assistant's memory for why that page is not
currently winnable.

## The thing that shapes the whole process

Wikidata properties have datatypes, and many of the useful ones are
`wikibase-item` — they accept **only a link to an existing item**, never typed text.
`founder` and `notable work` are both like this.

So you cannot create A Hundred Monkeys and type "Danny Altman" into `founder`. The
field will refuse it. The order has to be:

1. Create every item as a bare shell — label, description, `instance of` only.
2. Go back and add the statements that point them at each other.

Circular references are normal here and resolve themselves once the shells exist.

## Statements

**A Hundred Monkeys — Q140820950** · `instance of` business (Q4830453)

| Property | Value |
|---|---|
| industry (P452) | marketing (Q39809) |
| inception (P571) | 1990 |
| founder (P112) | Q140820955 |
| headquarters location (P159) | Berkeley (Q484678) |
| country (P17) | United States of America (Q30) |
| official website (P856) | `https://www.ahundredmonkeys.com/` |
| chief executive officer (P169) | Q140821007 |

> **inception is 1990, not 1995.** Bloomberg's company profile carries 1995 and other
> aggregators have copied it. Stating 1990 here, with the Communication Arts
> reference attached, is the single highest-leverage edit in this document —
> Wikidata is what most downstream consumers reconcile against.

**Eli Altman — Q140821007** · `instance of` human (Q5)

| Property | Value |
|---|---|
| occupation (P106) | writer (Q36180) |
| occupation (P106) | businessperson (Q43845) |
| occupation (P106) | publisher (Q2516866) |
| employer (P108) | Q140820950 |
| position held (P39) | managing director (Q19940089) + qualifier start time (P580) 2022 |
| notable work (P800) | Q140821009 |
| notable work (P800) | Q140821065 |
| residence (P551) | Berkeley (Q484678) |
| official website (P856) | `https://nopicnicpress.com/about` |

Optionally a second `position held`: creative director (Q667982), start time 2012,
end time (P582) 2022.

There is **no Wikidata item for "namer" or "naming consultant"**, so that term can
only live in the description, not in `occupation`. The description reads
`American namer, author, and publisher`.

**Danny Altman — Q140820955** · `instance of` human (Q5)

| Property | Value |
|---|---|
| occupation (P106) | businessperson (Q43845) |
| employer (P108) | Q140820950 |

Alias `Daniel Altman` is his legal name and is kept deliberately, despite colliding
with **Q5216400 — Daniel Altman, "Economist and writer"**, a different person. The
descriptions are distinct enough to tell them apart. If anyone ever proposes merging
the two items, that collision is the reason, and the answer is no.

**The books** — Q140821009 and Q140821065 · `instance of` book (Q571)

| Property | Don't Call It That | Run Studio Run |
|---|---|---|
| author (P50) | Q140821007 | Q140821007 |
| ISBN-13 (P212) | `9781734248302` | `9780989832038` |
| publication date (P577) | 2014 | 2018 |

Run Studio Run sits on publisher prefix `0-9898320` while the other titles are on
`1-7342483` — different blocks entirely, which is why its ISBN could not have been
inferred from the neighbouring numbers.

## References

An unsourced item is a deletion nomination waiting to happen, and references are
what satisfy WD:N. Living-person items are held to this most strictly.

Communication Arts has its own item — **Q5154089, "American trade journal"** — so it
can be cited properly rather than as a bare link. Attach this to `inception`,
`founder`, and `headquarters location` on A Hundred Monkeys:

| Field | Value |
|---|---|
| stated in (P248) | Q5154089 |
| reference URL (P854) | `https://www.commarts.com/columns/a-rose-is-a-rose-is-a-rose` |
| title (P1476) | A Rose Is a Rose Is a Rose |
| publication date (P577) | 4 February 2015 |

`title` is a *monolingualtext* field and will ask for a language alongside the text.

That piece is the right source to lean on precisely because it is reported
journalism about the studio — a writer visited and described the place — rather than
a naming trend piece quoting Eli. Everything else in the press list is the latter,
which is why none of it rescued the Wikipedia article.

## Deliberately left blank

- **country of citizenship (P27)** — living in Berkeley is not evidence of
  citizenship, and Wikidata will happily let you assert it unsourced.
- **date of birth (P569)** — permanent, and mirrored by every downstream scraper.
- **image (P18)** — requires the photo on Wikimedia Commons under a free licence.
  Carolyn McDermott holds that copyright, not us.

## Still to do

- **Add the Wikidata URIs to `sameAs`** in `lib/entity.js` here and
  `src/lib/entity.ts` in the AHM repo. Both files have a comment marking the spot.
  This is the step that closes the loop: our sites assert the identity, Wikidata
  asserts it back, and the two reconcile into one entity rather than a guess.
- **Consider an item for No Picnic Press**, typed `instance of` imprint (Q2608849).
  It would let both books carry `publisher (P123)` and give structural backing to
  the "publisher" in Eli's description. Not urgent.
- **Go Name Yourself** (ISBN `9781734248319`) has no item. It is a card deck rather
  than a book, so `instance of` would need thought — not simply Q571.
