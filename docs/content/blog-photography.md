# Blog demonstration content — articles, photography and licences

`apps/api/scripts/seed-blog.ts` loads six articles into a **development**
database so the blog can be reviewed as a real editorial surface rather than an
empty list. It refuses any database whose name does not end in `_dev`, `_test`
or `_e2e`: the SRS forbids sample content in production (CFG 002), and this is
sample content.

Run it with the API's environment loaded, and the worker running:

```bash
pnpm dev:worker                                   # produces the image renditions
pnpm --filter api exec tsx scripts/seed-blog.ts
```

Re-running is safe. Articles are matched on their slug and images on their
source name, so a run that failed part-way continues rather than duplicating.

## The articles

The copy in `apps/api/scripts/blog-seed-content.ts` is original, written for this
project. It is demonstration content: accurate as general orientation, but it
has not been fact-checked to publication standard and carries no byline beyond
the seeded "Melbourne Sphere editors" author.

## The photographs

All six are Creative Commons Zero or Creative Commons **Attribution** files from
Wikimedia Commons. Share-alike and non-commercial files were rejected, the same
policy recorded in `docs/content/hero-photography.md`.

The seeder does not trust this table: it resolves each file through the Commons
API at run time and **refuses any file whose recorded licence is not CC0, CC BY
2.0/3.0/4.0 or public domain**. It also requests a 2400px rendition rather than
the original, which is both lighter and kinder to Commons.

| Article | Commons file | Author | Licence |
| --- | --- | --- | --- |
| A first-timer's guide to Hosier Lane | `Hosier Lane Melbourne. (21380271866).jpg` | Bernard Spragg. NZ | CC0 1.0 |
| Queen Victoria Market, without the queue | `Queen Victoria Market from above. December 2022.jpg` | Bob Tan | CC BY 4.0 |
| Using Melbourne's trams without thinking about it | `AUS Melbourne, Central Business District, Bourke Street 001.jpg` | -wuppertaler | CC BY 4.0 |
| An afternoon in the Royal Botanic Gardens | `Lake in Melbourne Botanic Gardens 20180726-016.jpg` | Gary Houston | CC0 1.0 |
| Lygon Street after dark | `Lygon Street, Carlton at night.jpg` | Nathan Jones | CC BY 2.0 |
| Fitzroy on foot | `Fitzroy Melbourne.jpg` | Marcus Bichel Lindegaard | CC BY 2.0 |

## Where attribution is satisfied

Each credit is stored on the media asset itself (`credit`, with the licence in
`rightsNote`), so it travels with the image rather than with one article. The
public article page renders it under the cover image, which is what the
Attribution licences require. Because it lives on the asset, an image reused on
another article stays credited.

## Replacing this with the client's own content

Delete the six articles from the admin and upload the client's photography
through the media library. Nothing in the application depends on this content;
it exists so the blog, the editor and the share previews can be judged with
something real in them.
