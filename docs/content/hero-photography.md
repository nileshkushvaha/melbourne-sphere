# Hero photography — sources, licences and attribution

The homepage banner (SRS HERO 001) shows Melbourne photography. Administrators can
configure the banner in site settings; whatever they configure replaces this set.
Until the client supplies its own commissioned or licensed photography, the site
ships the two images below so the hero is a real destination banner rather than a
flat colour panel.

Both are **Creative Commons Attribution** images — attribution is required, but
there is no share-alike obligation on the site or on derived crops, which is why
BY‑SA and non-commercial candidates were rejected. Files are stored locally in
`apps/web/public/hero/` (never hot-linked), cropped to 2560×1440, re-encoded as
WebP at quality 76 with EXIF removed, and served through the Next.js image
optimiser with responsive `sizes`.

The credit below is rendered with the banner (`caption` in
`apps/web/src/lib/hero-assets.ts`), which is where the licence's attribution
requirement is satisfied.

| File | Subject | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `flinders-street-evening.webp` | A tram passing Flinders Street Station at night | Caroline Jones | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Wikimedia Commons: "Melbourne in the early evening (50883666706).jpg"](https://commons.wikimedia.org/wiki/File:Melbourne_in_the_early_evening_(50883666706).jpg) |
| `degraves-street-laneway.webp` | Cafés and hanging signs along Degraves Street | -wuppertaler | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Wikimedia Commons: "AUS Melbourne, Central Business District, Degraves Street 001.jpg"](https://commons.wikimedia.org/wiki/File:AUS_Melbourne,_Central_Business_District,_Degraves_Street_001.jpg) |

## When the client supplies its own photography

1. Upload the images through the admin media library and configure them as hero
   slides with per-image focal points and alt text — no code change is needed.
2. Once the client's set is complete, delete the two files above and the
   `DEFAULT_HERO_SLIDES` entries, or leave them as the fallback if the client is
   happy for them to appear when no slide is configured.

Brand assets (logotype, wordmark, favicon set) and approved hero photography
remain open client-supplied content; they are listed in
`docs/pre-audit-report.md` §4.
