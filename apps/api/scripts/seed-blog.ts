/**
 * Loads the six demonstration articles in `blog-seed-content.ts` into a
 * development database, with their photographs.
 *
 * Why this exists: the blog is hard to judge — and hard to review at all —
 * with one fixture article and no images. This puts real, readable content
 * behind the public blog and the admin editor so both can be looked at.
 *
 * Two rules it follows:
 *
 *  * It refuses any database whose name does not end in `_dev`, `_test` or
 *    `_e2e`, the same guard the browser-suite seeder uses. The SRS forbids
 *    sample content in production (CFG 002), and this is sample content.
 *  * It does not process images itself. The original is uploaded to the
 *    quarantine bucket and an outbox event is written, exactly as the upload
 *    endpoint does; the API's dispatcher and the worker then do the rest. One
 *    media pipeline, not two.
 *
 * Re-running it is safe: everything is matched on its slug and skipped if it
 * is already there.
 *
 *   pnpm --filter api exec tsx scripts/seed-blog.ts
 */
import { createHash, randomBytes } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createDatabaseClient } from '@melbourne-sphere/database';
import { objectKeyFor } from '@melbourne-sphere/domain';
import { renderSanitisedBody } from '../src/blog/sanitise.js';
import { SEED_CATEGORIES, SEED_POSTS, SEED_TAGS, type SeedImage } from './blog-seed-content.js';

const need = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const databaseUrl = need('DATABASE_URL');
const databaseName = new URL(databaseUrl.replace(/^mysql:/, 'http:')).pathname.replace(/^\//, '');
if (!/(_dev|_test|_e2e)$/.test(databaseName)) {
  throw new Error(`Refusing to seed "${databaseName}": demonstration content belongs only in a database named *_dev, *_test or *_e2e`);
}

const db = createDatabaseClient({ url: databaseUrl, allowPublicKeyRetrieval: process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true' });
const s3 = new S3Client({
  region: process.env.MEDIA_S3_REGION ?? 'us-east-1',
  endpoint: need('MEDIA_S3_ENDPOINT'),
  forcePathStyle: true,
  credentials: { accessKeyId: need('MEDIA_S3_ACCESS_KEY_ID'), secretAccessKey: need('MEDIA_S3_SECRET_ACCESS_KEY') },
});
const quarantineBucket = process.env.MEDIA_QUARANTINE_BUCKET ?? 'melbourne-sphere-quarantine';

/** Licences this seeder will use: attribution only, never share-alike, matching
 *  the policy recorded for the hero photography. */
const PERMITTED_LICENCE = /^(cc0|cc by 2\.0|cc by 3\.0|cc by 4\.0|public domain)/i;

const COMMONS_AGENT = 'MelbourneSphere-dev-seed/1.0 (development content seeding)';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Commons rate-limits anonymous downloads, and answers 429 when a handful of
 * originals are pulled in quick succession. Backing off and retrying is the
 * documented way to behave; failing the whole seed on the third file is not.
 */
async function fetchWithBackoff(url: string, attempts = 4): Promise<Response> {
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(url, { headers: { 'User-Agent': COMMONS_AGENT } });
    if (response.ok) return response;
    if (response.status !== 429 || attempt === attempts) return response;
    const wait = 2000 * attempt;
    console.log(`    rate limited; waiting ${wait / 1000}s`);
    await sleep(wait);
  }
}

/**
 * Resolves a Commons file to its download address, and refuses it unless the
 * licence recorded on Commons is one we may use. The note in the content file
 * is documentation; this is the check.
 */
async function resolveCommonsFile(file: string): Promise<{ url: string; licence: string }> {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  // A scaled rendition, not the original: the largest variant we publish is
  // 1600px wide, so pulling a 20 MB original would be wasteful and is what
  // Commons throttles.
  api.search = new URLSearchParams({ action: 'query', format: 'json', titles: file, prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '2400' }).toString();
  const response = await fetchWithBackoff(api.toString());
  if (!response.ok) throw new Error(`Commons lookup failed for ${file}: ${response.status}`);
  const body = (await response.json()) as { query?: { pages?: Record<string, { imageinfo?: { url: string; thumburl?: string; extmetadata?: Record<string, { value?: string }> }[] }> } };
  const info = Object.values(body.query?.pages ?? {})[0]?.imageinfo?.[0];
  if (!info?.url) throw new Error(`Commons has no file named ${file}`);
  // The tracking parameters Commons appends are dropped: they belong to its
  // analytics, not to the file.
  const download = new URL(info.thumburl ?? info.url);
  download.search = '';
  const licence = (info.extmetadata?.LicenseShortName?.value ?? '').replace(/<[^>]*>/g, '').trim();
  if (!PERMITTED_LICENCE.test(licence)) throw new Error(`${file} is licensed "${licence}", which this seeder will not use`);
  return { url: download.toString(), licence };
}

/** Uploads one photograph and asks the worker to process it, as the API does. */
async function uploadImage(image: SeedImage, sourceName: string): Promise<string> {
  const already = await db.mediaAsset.findFirst({ where: { sourceName, status: { in: ['ready', 'quarantined'] } }, select: { id: true } });
  if (already) {
    console.log(`  reusing        ${sourceName}`);
    return already.id;
  }
  const { url, licence } = await resolveCommonsFile(image.file);
  console.log(`  ${licence.padEnd(14)} ${image.file}`);
  const response = await fetchWithBackoff(url);
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
  const objectKey = objectKeyFor('quarantine', randomBytes(8).toString('hex'), 'jpg', randomBytes(12).toString('hex'));

  await s3.send(new PutObjectCommand({ Bucket: quarantineBucket, Key: objectKey, Body: bytes, ContentType: mimeType }));

  const asset = await db.$transaction(async (tx) => {
    const row = await tx.mediaAsset.create({
      data: {
        sourceName,
        mimeType,
        bytes: bytes.byteLength,
        checksum: createHash('sha256').update(bytes).digest('hex'),
        objectKey,
        status: 'quarantined',
        altText: image.alt,
        credit: image.credit,
        rightsNote: image.rightsNote,
      },
      select: { id: true, version: true },
    });
    // The same event the upload endpoint writes; the dispatcher turns it into
    // the worker's media job.
    await tx.outboxEvent.create({
      data: { type: 'media.uploaded', resourceType: 'media_asset', resourceId: row.id, resourceVersion: row.version, payload: { mediaId: row.id } },
    });
    return row;
  });
  return asset.id;
}

/** Waits for the worker to publish the renditions, so posts never reference an unprocessed image. */
async function waitUntilReady(ids: string[], timeoutMs = 120_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const rows = await db.mediaAsset.findMany({ where: { id: { in: ids } }, select: { id: true, status: true, rejectionReason: true } });
    const rejected = rows.filter((row) => row.status === 'rejected');
    if (rejected.length > 0) throw new Error(`Image processing refused ${rejected.length} file(s): ${rejected.map((r) => r.rejectionReason).join('; ')}`);
    const ready = rows.filter((row) => row.status === 'ready').length;
    process.stdout.write(`\r  processed ${ready}/${ids.length}`);
    if (ready === ids.length) return void process.stdout.write('\n');
    if (Date.now() > deadline) {
      throw new Error('\nImage processing did not finish. Is the worker running? Start it with: pnpm dev:worker');
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

async function main(): Promise<void> {
  console.log(`Seeding demonstration blog content into ${databaseName}\n`);

  const author =
    (await db.author.findUnique({ where: { slug: 'melbourne-sphere-editors' } })) ??
    (await db.author.create({
      data: {
        displayName: 'Melbourne Sphere editors',
        slug: 'melbourne-sphere-editors',
        role: 'Editorial team',
        shortBio: 'The editors who check listings and write the guides.',
        bio: 'Melbourne Sphere is written and checked by a small editorial team based in Melbourne. We visit what we write about.',
        active: true,
      },
    }));

  for (const category of SEED_CATEGORIES) {
    await db.blogCategory.upsert({ where: { slug: category.slug }, update: {}, create: { name: category.name, slug: category.slug, landingContent: null, active: true } });
  }
  for (const tag of SEED_TAGS) {
    await db.blogTag.upsert({ where: { slug: tag }, update: {}, create: { name: tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), slug: tag, active: true } });
  }
  console.log(`  ${SEED_CATEGORIES.length} categories, ${SEED_TAGS.length} tags, author "${author.displayName}"`);

  const existing = new Set((await db.post.findMany({ where: { slug: { in: SEED_POSTS.map((p) => p.slug) } }, select: { slug: true } })).map((p) => p.slug));
  const wanted = SEED_POSTS.filter((post) => !existing.has(post.slug));
  if (wanted.length === 0) {
    console.log('\nEvery article is already present; nothing to do.');
    return;
  }

  console.log(`\nDownloading and uploading ${wanted.length} photograph(s)…`);
  const covers = new Map<string, string>();
  for (const post of wanted) {
    covers.set(post.slug, await uploadImage(post.image, `${post.slug}.jpg`));
    // Polite pacing: six originals in a row is what triggers the rate limit.
    await sleep(800);
  }

  console.log('Waiting for the worker to produce the renditions…');
  await waitUntilReady([...covers.values()]);

  const now = new Date();
  for (const [index, post] of wanted.entries()) {
    const category = await db.blogCategory.findUniqueOrThrow({ where: { slug: post.category } });
    const tags = await db.blogTag.findMany({ where: { slug: { in: post.tags } }, select: { id: true } });
    // Published a few days apart, so the index is not six identical dates.
    const publishedAt = new Date(now.getTime() - (wanted.length - index) * 36 * 60 * 60 * 1000);
    await db.post.create({
      data: {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        bodyFormat: 'markdown',
        bodyMarkdown: post.body,
        // The same renderer the API uses, so nothing reaches the database that
        // would not have survived the editor.
        sanitizedBody: renderSanitisedBody(post.body, 'markdown'),
        status: 'published',
        authorId: author.id,
        categoryId: category.id,
        coverMediaId: covers.get(post.slug) ?? null,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        seoKeywords: post.seoKeywords,
        commentsEnabled: true,
        firstPublishedAt: publishedAt,
        publishedAt,
        createdAt: publishedAt,
        tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
      },
    });
    console.log(`  published  ${post.slug}`);
  }

  console.log(`\nDone. ${wanted.length} article(s) published. Open http://127.0.0.1:3000/blog`);
}

main()
  .catch((error: unknown) => {
    console.error('\n' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
