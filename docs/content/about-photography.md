# About page photography — sources, licences and attribution

`/about` is a product route (client instruction, 13 September 2026), so its
photographs are project files rather than media-library assets: they are
stored in `apps/web/public/about/`, served locally and never hot-linked (SRS
ABT 006). They are the same three images the editable About page carried
before the change, copied from the media library's processed `hero` renditions
(WebP, EXIF already stripped). The credit for each is printed beside it on the
page, in `apps/web/src/app/about/page.tsx` (`PHOTOS`).

| File | Subject | Author | Licence | Source |
| --- | --- | --- | --- | --- |
| `melbourne-skyline-yarra.webp` (1599×349) | The Melbourne CBD skyline along the Yarra River | Jorge Láscar | [CC BY 2.0](https://creativecommons.org/licenses/by/2.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Melbourne_CBD_skyline_and_the_Yarra_river_as_seen_from_Southbank_(iPhone)_(29845387643).jpg) |
| `degraves-street-laneway.webp` (1600×1200) | Cafés along Degraves Street | -wuppertaler | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0) | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:AUS_Melbourne,_Central_Business_District,_Degraves_Street_001.jpg) |
| `queen-victoria-market-street.webp` (1600×1200) | Shed B at Queen Victoria Market | S3074865 | Public domain | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Queen_Victoria_Market,_Melbourne_shed_B.jpg) |

Replacing a photograph means replacing the file and its `PHOTOS` entry
(alternative text, credit and dimensions). The client's commissioned Melbourne
photography remains outstanding content (D10).
