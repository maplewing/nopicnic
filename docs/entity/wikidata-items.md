# Wikidata items — submission payload

Two items to create: **Eli Altman** (person) and **A Hundred Monkeys** (organization).
They reference each other, so create A Hundred Monkeys first and paste its Q-number
into the person item.

## Why Wikidata rather than Wikipedia

Wikidata's inclusion policy (WD:N) is a genuinely different and lower bar than
Wikipedia's WP:NCORP. An item is permitted if it describes *a clearly identifiable
entity that can be described using serious, publicly available references* — it does
not require the multiple independent in-depth sources that NCORP demands. Published
books with ISBNs plus the 2015 Communication Arts feature clear that bar for both
items comfortably.

Wikidata also feeds knowledge panels and is ingested directly by language models,
so it does most of the AIO work a Wikipedia page would have done.

## Before you submit

Wikidata is far more tolerant of self-description than Wikipedia, but it is not
exempt. Disclose the connection on your user page — one line is enough ("I am Eli
Altman and I have created/edited items relating to myself and A Hundred Monkeys").
Undisclosed self-editing is what turns a routine item into a deletion discussion.

Cite a source for every statement you can. Unsourced items about living people are
the ones that get challenged.

---

## Item 1 — A Hundred Monkeys

| Field | Value |
|---|---|
| Label (en) | A Hundred Monkeys |
| Description (en) | American naming and branding studio |
| Also known as | A Hundred Monkeys Inc. |

**Statements**

| Property | Value | Reference |
|---|---|---|
| instance of (P31) | business (Q4830453) | — |
| industry (P452) | marketing (Q39809) | — |
| inception (P571) | 1990 | Communication Arts, 2015 |
| founded by (P112) | Danny Altman *(string until an item exists)* | Communication Arts, 2015 |
| headquarters location (P159) | Berkeley (Q484678) — city only, no street line | official website |
| country (P17) | United States of America (Q30) | — |
| official website (P856) | https://www.ahundredmonkeys.com/ | — |
| chief executive officer (P169) | Eli Altman (link once created) | official website |
| described by source (P1343) | *see reference below* | — |

**Reference to attach to inception, founded by, and headquarters:**

- Title: A Rose Is a Rose Is a Rose
- Author: Sara Breselor
- Published in: Communication Arts
- Publication date: 4 February 2015
- URL: https://www.commarts.com/columns/a-rose-is-a-rose-is-a-rose

> Note: **inception is 1990, not 1995.** Bloomberg's company profile carries 1995 and
> several aggregators have copied it. Stating 1990 here with the Communication Arts
> reference attached is the highest-leverage correction in this whole document —
> Wikidata is what most downstream consumers reconcile against.

---

## Item 2 — Eli Altman

| Field | Value |
|---|---|
| Label (en) | Eli Altman |
| Description (en) | American naming strategist and author |

**Statements**

| Property | Value | Reference |
|---|---|---|
| instance of (P31) | human (Q5) | — |
| occupation (P106) | writer (Q36180) | book ISBNs |
| occupation (P106) | businessperson (Q43845) | official website |
| employer (P108) | A Hundred Monkeys (Q-number from item 1) | official website |
| position held (P39) | *managing director* — qualify with start time (P580) 2022 | official website |
| notable work (P800) | Don't Call It That | ISBN 9781734248302 |
| notable work (P800) | Run Studio Run | — |
| official website (P856) | https://nopicnicpress.com/about | — |
| residence (P551) | Berkeley (Q484678) | official website |

**Deliberately omitted — do not fill these in by guessing:**

- **country of citizenship (P27)** — being based in Berkeley is not evidence of
  citizenship. Leave blank unless you want it stated.
- **sex or gender (P21)** — Wikidata prompts for it; supply it yourself or leave it.
- **date of birth (P569)** — only add if you're comfortable with it being public.
  It is permanent and widely syndicated.

**After creating the items**, add both URIs to the `sameAs` arrays in
`lib/entity.js` (there is a comment marking the spot). That closes the loop: our
site asserts the identity, Wikidata asserts it back, and the two reconcile.

---

## Item 3 — the books (optional, do later)

Separate items for *Don't Call It That* (ISBN 9781734248302) and *Go Name Yourself*
(ISBN 9781734248319) are straightforward — `instance of: book (Q571)`,
`author: <Eli's Q-number>`, `ISBN-13 (P212)`. Worth doing once the two items above
are stable, because `notable work` resolving to a real item is stronger than a
bare string.

ISBNs for all three titles:

| Title | ISBN-13 |
|---|---|
| Don't Call It That (3rd ed.) | 9781734248302 |
| Go Name Yourself | 9781734248319 |
| Run Studio Run (2nd ed.) | 9780989832038 |

Run Studio Run is on a different publisher prefix from the other two, so it is not
part of that block — worth knowing if you ever register further titles.
