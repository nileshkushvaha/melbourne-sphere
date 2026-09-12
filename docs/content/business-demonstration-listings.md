# Business demonstration listings — content, photography and licences

`apps/api/scripts/seed-businesses.ts` loads twenty fictional Melbourne
businesses into a **development** database — each with a description,
services, opening hours, an address, contact routes, social links, four
photographs and two to four approved reviews — and fills in the listings that
were already there with little more than a name. Like the blog seeder it
refuses any database whose name does not end in `_dev`, `_test` or `_e2e`
(SRS CFG 002).

Run it with the API and the worker running; the API's outbox dispatcher turns
each upload into a worker job, and the worker produces the renditions:

```bash
pnpm dev:api
pnpm dev:worker
pnpm --filter api exec tsx --env-file=.env scripts/seed-businesses.ts
```

Re-running is safe. Businesses are matched on slug, images on their stored
name, and a listing that already has photographs, hours, links or reviews keeps
them. Public pages are cached for up to a minute; the admin shows the new
records immediately.

Each listing also records the year it began trading (shown as "n years in
business") and a private enquiry inbox on its own invented domain, so the
enquiry form is offered rather than hidden.

To choose a listing's photographs again — when a search picked something on
subject but wrong — forget them and search afresh for just those listings:

```bash
pnpm --filter api exec tsx --env-file=.env scripts/seed-businesses.ts --reimage lygon-lane-espresso,harbour-kitchen-docklands
```

## The businesses are fictional

Every business in `apps/api/scripts/business-seed-content.ts` is invented. The
suburbs, streets and postcodes are real — the directory is scoped to the City
of Melbourne's local areas (SRS SCP 001–005) — but the names, the reviewers and
every contact route are not:

* phone numbers are in the `(03) 5550 xxxx` range that ACMA reserves for
  fiction, so none of them rings a real person;
* email and web addresses are on `.com.au` domains that match the invented
  names and are registered to nobody;
* social links are handles on the real platforms in the same invented names;
* reviewers have first names and initials, addresses on `reviewers.example`,
  and are written into the database the way the API writes a real review —
  encrypted, hashed, terms acknowledged — then approved, with the rating
  aggregate updated to match.

Nothing here describes a real trader, so nothing here can misdescribe one. The
eligibility and content-rights fields on each record say plainly that the
listing was seeded for development rather than checked by hand.

## Filling out the directory

`apps/api/scripts/seed-trades.ts` is the second half of the demonstration
content: forty-odd trade categories — plumbers, electricians, roofing,
dentists, removalists and the rest — each with at least four published
listings and a photograph of its own.

```bash
pnpm --filter api exec tsx --env-file=.env scripts/seed-trades.ts
```

A directory of twenty listings cannot be judged: search returns everything,
pagination never appears, a category page is a short list and every facet
count is one. This creates enough of a tail for those screens to behave the
way they will in use.

Where the twenty hand-written listings in `business-seed-content.ts` are
composed one by one, these are built from a vocabulary per trade in
`trade-seed-content.ts` — what the trade does, how it works, what its
customers say — and the composer gives each business a different name,
suburb, street, year, hours, services and reviews, chosen by its position
rather than at random, so a re-run produces the same twenty-second listing it
produced before. Both paths write the record through
`seed-business-writer.ts`, so there is one answer to "how is a listing
created" rather than two that drift.

The categories are nested two levels, which is the most the model allows:
Home Services, Auto & Transport, Health & Wellness, Personal Care, Food &
Drink, Professional Services, Shopping and Pets & Vets hold the trades. A
parent category's page already includes its children's listings, so filling
the children fills the parents.

Photographs come from one pool per category rather than a search per listing.
Where Commons has fewer permissively-licensed pictures of a trade than the
category needs — it often does, for towing or upholstery — the listings that
miss out show the site's own branded panel, which is exactly what a real
listing without a photograph shows.

## Category pictures

The same run gives every active category a picture, where it has none: the
subject searched for is in `CATEGORY_IMAGE_QUERIES` (keyed by slug, because
"Shopping" and "Home Services" find nothing useful on their own), and a
category an editor has already illustrated is left alone. The picture appears
on the home-page tile and at the top of the category page.

## The photographs

Photographs are found on Wikimedia Commons **at seed time**, from short subject
queries in the content file ("barista latte art espresso", "veterinarian
examining dog clinic"). A file is used only if it is a JPEG at least 1200 px
wide under CC0, CC BY 2.0/3.0/4.0 or public domain — share-alike and
non-commercial files are refused, the policy recorded in
`docs/content/hero-photography.md` — and only if its title or description
actually names one of the subjects asked for, because Commons' full-text search
ranks loosely. Two listings never share a picture.

Each asset records the file's own description as its alt text (so the text
describes the picture that was chosen, not one imagined in advance), the
author as its credit, and the licence with a link to the file page as its
rights note. Those are the attribution the licences require, and they are
shown wherever the media library shows an image's rights.

Because the pictures are stock rather than photographs of the (fictional)
premises, they are illustrative: a bakery's gallery shows bread, ovens and
pastries, not that bakery.

## Service synonyms

`apps/api/scripts/seed-service-synonyms.ts` gives every service its search
synonyms, adding to whatever an editor has already written and never replacing
it.

```bash
pnpm --filter api exec tsx --env-file=.env scripts/seed-service-synonyms.ts --dry-run
pnpm --filter api exec tsx --env-file=.env scripts/seed-service-synonyms.ts
```

Search matches `name LIKE %term%` OR `synonym LIKE %term%`, so a synonym is
only worth storing when it holds a word the name does not: "sparkie" for
Electrical, "bond clean" for an end-of-lease clean, "aircon" for a split
system. `service-synonyms.ts` is therefore in two halves — a written list for
the trades where the customer's word differs from ours, and rules that derive
the honest variants of any name (singular and plural, the head noun alone,
hyphens as spaces, an apostrophe dropped, each half of "X and Y").

Anything still under five synonyms is **reported, not padded**: a term nobody
types makes search worse, so the dry run prints the list to be written by hand.
That is how the eighty-three written entries at the end of the file were
chosen.
