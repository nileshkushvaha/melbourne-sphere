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

These two files are the **fallback only**: the site shows them when no Home
banner slide is configured. They are not in the media library.

## The configured banner (database)

The banner the home page shows comes from the Home banner slides in
Configuration → Home page settings, stored in the `website/home` settings
document and managed there (reorder, focal point, caption, remove, replace). Five
Melbourne photographs were added to the media library as those slides by
`apps/api/scripts/seed-hero-slides.ts` on 13 September 2026. Credits are kept on
each media asset.

| Media asset | Caption | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `home-hero-princes-bridge-night.jpg` | Princes Bridge and the Yarra | Commons artist on the asset | CC BY 2.0 | [Melbourne CBD and Princes Bridge at night (2013)](https://commons.wikimedia.org/wiki/File:Melbourne_CBD_and_Princes_Bridge_at_night_(2013).jpg) |
| `home-hero-southbank-bolte-bridge.jpg` | Southbank at night | Commons artist on the asset | CC BY 2.0 | [Southbank and the Bolte Bridge at night](https://commons.wikimedia.org/wiki/File:Southbank_and_the_Bolte_Bridge_at_night_(11866185983).jpg) |
| `home-hero-federation-square.jpg` | Federation Square | Commons artist on the asset | CC BY 2.0 | [Federation Square Melbourne](https://commons.wikimedia.org/wiki/File:Federation_Square_Melbourne_(6768126635).jpg) |
| `home-hero-hosier-lane.jpg` | Hosier Lane | Commons artist on the asset | CC0 | [Hosier Lane Melbourne](https://commons.wikimedia.org/wiki/File:Hosier_Lane_Melbourne._(21380271866).jpg) |
| `home-hero-docklands-skyline.jpg` | The city from Docklands | Commons artist on the asset | CC0 | [City of Melbourne Skyline From Docklands](https://commons.wikimedia.org/wiki/File:City_of_Melbourne_Skyline_From_Docklands.JPG) |

A sixth candidate, `home-hero-royal-exhibition-building.jpg` (public domain), was
uploaded but left out because it is portrait; nothing uses it, so the media
retention task removes it after its recoverable period.

| File | Subject | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `flinders-street-evening.webp` | A tram passing Flinders Street Station at night | Caroline Jones | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Wikimedia Commons: "Melbourne in the early evening (50883666706).jpg"](https://commons.wikimedia.org/wiki/File:Melbourne_in_the_early_evening_(50883666706).jpg) |
| `degraves-street-laneway.webp` | Cafés and hanging signs along Degraves Street | -wuppertaler | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Wikimedia Commons: "AUS Melbourne, Central Business District, Degraves Street 001.jpg"](https://commons.wikimedia.org/wiki/File:AUS_Melbourne,_Central_Business_District,_Degraves_Street_001.jpg) |

## Where else these images are used

Nowhere else. The About page carries its own photographs, recorded in
`about-photography.md`.

## When the client supplies its own photography

1. Upload the images through the admin media library and configure them as hero
   slides with per-image focal points and alt text — no code change is needed.
2. Once the client's set is complete, delete the two files above and the
   `DEFAULT_HERO_SLIDES` entries, or leave them as the fallback if the client is
   happy for them to appear when no slide is configured.

Brand assets (logotype, wordmark, favicon set) and approved hero photography
remain open client-supplied content; they are listed in
`docs/pre-audit-report.md` §4.
