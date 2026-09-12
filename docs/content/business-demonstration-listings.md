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
