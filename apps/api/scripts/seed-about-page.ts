/**
 * Writes the About page: the words from `about-page-content.ts`, and two
 * photographs of Melbourne plus a title image found on Wikimedia Commons and
 * put through the same upload pipeline as any other picture on the site.
 *
 * The pictures are real photographs of the city under a licence that allows
 * this (the shared Commons allowlist), credited in the media library. Nothing
 * here is generated or stock: an About page that opens with a picture of
 * somewhere else would be the first thing on the site that is not true.
 *
 * Re-running is safe and does not overwrite an editor: the page is written only
 * when its body is still the seeded text or empty. `--refresh` writes the
 * current wording over whatever is there, for when the copy in the repository
 * is the thing being changed.
 *
 *   pnpm --filter api exec tsx --env-file=.env scripts/seed-about-page.ts [--refresh]
 */
import { renderSanitisedBody, toPlainText } from '../src/blog/sanitise.js';
import { staticPageBlockers } from '../src/settings/static-pages.js';
import { databaseName, db, searchCommons, sleep, uploadImage, waitUntilReady } from './seed-commons.js';
import { ABOUT_BODY, ABOUT_IMAGES, ABOUT_TITLE } from './about-page-content.js';

const publicBaseUrl = (process.env.MEDIA_PUBLIC_BASE_URL ?? `${process.env.MEDIA_ENDPOINT ?? ''}/${process.env.MEDIA_PUBLIC_BUCKET ?? ''}`).replace(/\/+$/, '');

/** Finds one usable photograph for each placeholder, uploading it if it is not already there. */
async function findPictures(): Promise<Map<string, { id: string; alt: string; credit: string }>> {
  const found = new Map<string, { id: string; alt: string; credit: string }>();
  const used = new Set<string>();
  for (const image of ABOUT_IMAGES) {
    const sourceName = `about-${image.name}.jpg`;
    const existing = await db.mediaAsset.findFirst({ where: { sourceName, status: { in: ['ready', 'quarantined'] } }, select: { id: true, altText: true, credit: true } });
    if (existing) {
      found.set(image.name, { id: existing.id, alt: existing.altText ?? image.alt, credit: existing.credit ?? '' });
      console.log(`  ${image.name}: already uploaded`);
      continue;
    }
    let file;
    for (const query of image.queries) {
      [file] = await searchCommons(query, 1, used);
      if (file) break;
      await sleep(600);
    }
    if (!file) {
      console.log(`  ${image.name}: nothing usable on Commons yet — the section will be written without a picture`);
      continue;
    }
    used.add(file.title);
    const id = await uploadImage({
      file,
      sourceName,
      // Our own description, not the file's: these three have a job on the page
      // and the alt text has to say what the reader is looking at.
      alt: image.alt,
      credit: file.artist ? `${file.artist} via Wikimedia Commons` : 'Wikimedia Commons',
      rightsNote: `${file.licence} — ${file.pageUrl}`,
    });
    found.set(image.name, { id, alt: image.alt, credit: file.artist ? `${file.artist} via Wikimedia Commons` : 'Wikimedia Commons' });
    await sleep(800);
  }
  return found;
}

/** The public address of an asset's largest processed variant. */
async function pictureUrl(id: string): Promise<string | null> {
  const asset = await db.mediaAsset.findUnique({ where: { id }, include: { variants: true } });
  if (!asset || asset.status !== 'ready') return null;
  const variant = asset.variants.find((row) => row.kind === 'hero') ?? asset.variants.at(-1);
  return variant ? `${publicBaseUrl}/${variant.objectKey}` : null;
}

async function main(): Promise<void> {
  console.log(`Writing the About page in ${databaseName}\n`);
  const refresh = process.argv.includes('--refresh');

  const existing = await db.staticPage.findUnique({ where: { slug: 'about' }, select: { id: true, version: true, sanitizedBody: true, status: true, bodySource: true } });
  const untouched = !existing || existing.sanitizedBody.trim().length === 0 || existing.bodySource === ABOUT_BODY || existing.bodySource.includes('{{image:');
  if (existing && !untouched && !refresh) {
    console.log('An editor has written this page; leaving it alone. Use --refresh to overwrite it.');
    return;
  }

  const pictures = await findPictures();
  const pending = [...pictures.values()].map((picture) => picture.id);
  if (pending.length > 0) await waitUntilReady(pending);

  let body = ABOUT_BODY;
  for (const image of ABOUT_IMAGES) {
    const picture = pictures.get(image.name);
    const url = picture ? await pictureUrl(picture.id) : null;
    // A placeholder with no picture behind it leaves the section as words
    // alone, which the public template already handles.
    // The credit travels with the picture: CC BY asks for attribution wherever
    // the photograph is shown, so it is written into the page rather than left
    // in the media library where a reader never sees it.
    const caption = picture?.credit ? `<figcaption>Photograph: ${picture.credit}</figcaption>` : '';
    body = body.replace(`{{image:${image.name}}}`, url ? `<figure><img src="${url}" alt="${picture?.alt ?? image.alt}" />${caption}</figure>` : '');
  }
  body = body.replace(/\n{3,}/g, '\n\n').trim();

  const sanitizedBody = renderSanitisedBody(body, 'markdown');
  const blockers = staticPageBlockers({ title: ABOUT_TITLE, plainBody: toPlainText(sanitizedBody) });
  if (blockers.length > 0) {
    console.log(`Not publishable: ${blockers.join('; ')}`);
    return;
  }

  const hero = pictures.get('hero');
  const data = {
    title: ABOUT_TITLE,
    bodySource: body,
    bodyFormat: 'markdown' as const,
    sanitizedBody,
    // The page's own picture: the title band uses it, and so does a share card.
    ogImageMediaId: hero?.id ?? null,
    layout: 'fullWidth' as const,
    status: 'published' as const,
    publishedAt: existing?.status === 'published' ? undefined : new Date(),
  };
  if (existing) await db.staticPage.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } });
  else await db.staticPage.create({ data: { slug: 'about', ...data } });

  console.log(`\nDone. About published with ${pictures.size} photograph(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
