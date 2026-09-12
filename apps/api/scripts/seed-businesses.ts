/**
 * Loads the demonstration listings in `business-seed-content.ts` into a
 * development database — twenty fictional Melbourne businesses with their
 * services, hours, addresses, contact routes, social links, photographs and
 * approved reviews — and fills in the listings that were already there with
 * little more than a name.
 *
 * It follows the same rules as the blog seeder: it refuses any database not
 * named *_dev, *_test or *_e2e, and it does not process images itself. Each
 * photograph is uploaded to quarantine with an outbox event, exactly as the
 * upload endpoint does, and the worker publishes the renditions.
 *
 * Reviews are written the way the API writes them — the address encrypted
 * with the business id as associated data, the keyed hash the API would
 * compute, the terms version acknowledged — and then approved, with the
 * rating aggregate the public card reads updated to match.
 *
 * Re-running it is safe: businesses are matched on slug, images on their
 * stored name, and a listing that already has photographs, hours, links or
 * reviews keeps them.
 *
 *   pnpm --filter api exec tsx --env-file=.env scripts/seed-businesses.ts
 */
import { createHmac } from 'node:crypto';
import { FieldEncryptionService } from '../src/common/field-encryption.service.js';
import { normaliseBusinessName, normalisePhone } from '../src/directory/business-rules.js';
import { SEED_BUSINESSES, SEED_ENRICHMENT, SEED_SERVICES, type HoursRule, type SeedBusiness, type SeedReview } from './business-seed-content.js';
import { databaseName, db, need, searchCommons, sleep, uploadImage, waitUntilReady, type CommonsFile } from './seed-commons.js';

/** The API's own encryption, given the one value it reads from configuration. */
const encryption = new FieldEncryptionService({ get: () => need('FIELD_ENCRYPTION_KEY') } as never);
const appSecret = need('APP_SECRET_KEY');
const termsVersion = process.env.SUBMISSION_TERMS_VERSION ?? '2026-09-01';
const hash = (value: string) => createHmac('sha256', appSecret).update(value).digest('hex');

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** The (fictional) inbox enquiries go to: on the listing's own domain. */
const enquiryAddress = (website: string) => `enquiries@${new URL(website).hostname.replace(/^www\./, '')}`;

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h! * 60 + m!;
};

/** "Seeded" is the source: an editor reading the record should know it was not checked by hand. */
const ELIGIBILITY_SOURCE = 'Demonstration listing: a City of Melbourne suburb, seeded for development';
const RIGHTS_NOTE = 'Demonstration listing; photographs are attribution-licensed files from Wikimedia Commons, credited on each asset';

const SEED_IMAGES_PER_BUSINESS = 4;

/** Titles already used, so two listings never carry the same photograph. */
const usedTitles = new Set<string>();

async function ensureServices(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const names of Object.values(SEED_SERVICES)) {
    for (const name of names) {
      const slug = slugify(name);
      const row = await db.service.upsert({ where: { slug }, update: {}, create: { name, slug, active: true }, select: { id: true } });
      ids.set(name, row.id);
    }
  }
  // Anything already in the table under another name is still usable.
  for (const row of await db.service.findMany({ where: { active: true }, select: { id: true, name: true } })) ids.set(row.name, row.id);
  return ids;
}

/**
 * Finds and uploads the photographs for one listing. Each query yields at most
 * one picture, so a gallery is four different subjects rather than four shots
 * of the first; a query with nothing usable is reported and skipped, and the
 * listing keeps whatever was found. Alt text comes from the file's own
 * description on Commons — it describes the picture that was actually chosen,
 * which a sentence written here in advance could not.
 */
async function findImages(slug: string, queries: string[]): Promise<{ id: string; sourceName: string }[]> {
  const uploaded: { id: string; sourceName: string }[] = [];
  for (const [index, query] of queries.slice(0, SEED_IMAGES_PER_BUSINESS).entries()) {
    const sourceName = `${slug}-${index + 1}.jpg`;
    const existing = await db.mediaAsset.findFirst({ where: { sourceName, status: { in: ['ready', 'quarantined'] } }, select: { id: true } });
    if (existing) {
      uploaded.push({ id: existing.id, sourceName });
      continue;
    }
    // A specific query first, then the same query with its last word dropped,
    // down to two words: "cocktail bar counter bartender" finds nothing usable,
    // "cocktail bar" finds plenty, and the result is still on subject.
    let file: CommonsFile | undefined;
    const words = query.split(' ');
    for (let length = words.length; length >= 2 && !file; length -= 1) {
      [file] = await searchCommons(words.slice(0, length).join(' '), 1, usedTitles);
      if (!file) await sleep(400);
    }
    if (!file) {
      console.log(`  nothing usable for "${query}"`);
      continue;
    }
    usedTitles.add(file.title);
    const alt = (file.description || query).slice(0, 240);
    const id = await uploadImage({
      file,
      sourceName,
      alt,
      credit: file.artist ? `${file.artist} via Wikimedia Commons` : 'Wikimedia Commons',
      rightsNote: `${file.licence} — ${file.pageUrl}`,
    });
    uploaded.push({ id, sourceName });
    // Polite pacing: a run of originals in quick succession is what triggers the rate limit.
    await sleep(800);
  }
  return uploaded;
}

function intervals(rules: HoursRule[]) {
  return rules.flatMap(([days, open, close]) => days.map((weekday) => ({ weekday, allDay: false, startMinute: minutes(open), endMinute: minutes(close), endNextDay: minutes(close) <= minutes(open) })));
}

async function writeReviews(businessId: string, reviews: SeedReview[]): Promise<void> {
  const now = Date.now();
  let count = 0;
  let sum = 0;
  for (const [index, review] of reviews.entries()) {
    const email = `${slugify(review.name)}.${index}@reviewers.example`;
    const createdAt = new Date(now - review.daysAgo * 86_400_000);
    await db.review.create({
      data: {
        businessId,
        displayName: review.name,
        privateEmailEncrypted: encryption.encrypt(email, businessId),
        emailHash: hash(email),
        rating: review.rating,
        originalText: review.text,
        status: 'approved',
        decidedAt: new Date(createdAt.getTime() + 6 * 3_600_000),
        acknowledgedVersion: termsVersion,
        acknowledgedAt: createdAt,
        submitterIpHash: hash('203.0.113.10'),
        createdAt,
      },
    });
    count += 1;
    sum += review.rating;
  }
  await db.businessRating.upsert({
    where: { businessId },
    create: { businessId, approvedCount: count, ratingSum: sum },
    update: { approvedCount: { increment: count }, ratingSum: { increment: sum } },
  });
}

async function attachMedia(businessId: string, images: { id: string }[]): Promise<void> {
  for (const [index, image] of images.entries()) {
    await db.businessMedia.upsert({
      where: { businessId_mediaId: { businessId, mediaId: image.id } },
      update: {},
      create: { businessId, mediaId: image.id, sortOrder: index, isCover: index === 0 },
    });
  }
}

async function createBusiness(seed: SeedBusiness, services: Map<string, string>, categories: Map<string, string>, areas: Map<string, string>): Promise<void> {
  const primaryCategoryId = categories.get(seed.category);
  const localAreaId = areas.get(seed.area);
  if (!primaryCategoryId) throw new Error(`${seed.slug}: no category "${seed.category}"`);
  if (!localAreaId) throw new Error(`${seed.slug}: no local area "${seed.area}"`);
  const serviceIds = seed.services.map((name) => {
    const id = services.get(name);
    if (!id) throw new Error(`${seed.slug}: no service "${name}"`);
    return id;
  });
  const secondary = (seed.alsoIn ?? []).map((slug) => {
    const id = categories.get(slug);
    if (!id) throw new Error(`${seed.slug}: no category "${slug}"`);
    return id;
  });

  console.log(`\n${seed.name}`);
  const images = await findImages(seed.slug, seed.images);
  if (images.length > 0) await waitUntilReady(images.map((image) => image.id));

  const publishedAt = new Date(Date.now() - (30 + Math.floor(Math.random() * 300)) * 86_400_000);
  const business = await db.business.create({
    data: {
      name: seed.name,
      normalizedName: normaliseBusinessName(seed.name),
      slug: seed.slug,
      description: seed.description,
      establishedYear: seed.established,
      status: 'published',
      primaryCategoryId,
      localAreaId,
      publicPhone: seed.phone,
      normalizedPhone: normalisePhone(seed.phone),
      publicEmail: seed.email,
      publicUrl: seed.website,
      addressVisibility: 'full',
      hoursMode: 'scheduled',
      eligibilityVerifiedAt: publishedAt,
      eligibilitySource: ELIGIBILITY_SOURCE,
      contentRightsReviewedAt: publishedAt,
      contentRightsNote: RIGHTS_NOTE,
      firstPublishedAt: publishedAt,
      publishedAt,
      createdAt: publishedAt,
      address: { create: { line1: seed.address.line1, line2: seed.address.line2 ?? null, suburb: seed.address.suburb, postcode: seed.address.postcode, latitude: seed.address.lat, longitude: seed.address.lng } },
      categories: { create: secondary.map((categoryId) => ({ categoryId })) },
      services: { create: serviceIds.map((serviceId) => ({ serviceId })) },
      openingHours: { create: intervals(seed.hours) },
      links: { create: seed.links.map((link, sortOrder) => ({ kind: link.kind, url: link.url, sortOrder })) },
    },
    select: { id: true },
  });
  // The enquiry form delivers to this address and never shows it; it is
  // encrypted with the business id, which is why it is written after create.
  await db.business.update({ where: { id: business.id }, data: { privateEnquiryEmailEncrypted: encryption.encrypt(enquiryAddress(seed.website), business.id) } });
  await attachMedia(business.id, images);
  await writeReviews(business.id, seed.reviews);
  console.log(`  published with ${images.length} photograph(s), ${seed.services.length} service(s), ${seed.reviews.length} review(s)`);
}

/** Fills in an existing listing; keeps anything an editor has already written. */
async function enrichBusiness(slug: string, seed: (typeof SEED_ENRICHMENT)[string], services: Map<string, string>): Promise<void> {
  const current = await db.business.findUnique({
    where: { slug },
    include: { address: true, _count: { select: { media: true, openingHours: true, links: true, reviews: true, services: true } } },
  });
  if (!current) {
    console.log(`\n${slug}: not in this database; skipped`);
    return;
  }
  console.log(`\n${current.name} (existing)`);
  const data: Record<string, unknown> = {};
  if (current.description.trim().length < 200) data.description = seed.description;
  if (current.establishedYear === null) data.establishedYear = seed.established;
  if (!current.publicPhone && seed.phone) {
    data.publicPhone = seed.phone;
    data.normalizedPhone = normalisePhone(seed.phone);
  }
  if (!current.publicEmail && seed.email) data.publicEmail = seed.email;
  if (!current.publicUrl && seed.website) data.publicUrl = seed.website;
  if (!current.privateEnquiryEmailEncrypted) data.privateEnquiryEmailEncrypted = encryption.encrypt(enquiryAddress(seed.website ?? current.publicUrl ?? `https://${slug}.com.au`), current.id);
  if (current._count.openingHours === 0) {
    data.hoursMode = 'scheduled';
    data.openingHours = { create: intervals(seed.hours) };
  }
  if (current._count.links === 0) data.links = { create: seed.links.map((link, sortOrder) => ({ kind: link.kind, url: link.url, sortOrder })) };
  if (!current.address && seed.address) {
    data.address = { create: { line1: seed.address.line1, line2: seed.address.line2 ?? null, suburb: seed.address.suburb, postcode: seed.address.postcode, latitude: seed.address.lat, longitude: seed.address.lng } };
  }
  if (!current.eligibilityVerifiedAt) {
    data.eligibilityVerifiedAt = new Date();
    data.eligibilitySource = ELIGIBILITY_SOURCE;
  }
  if (!current.contentRightsReviewedAt) {
    data.contentRightsReviewedAt = new Date();
    data.contentRightsNote = RIGHTS_NOTE;
  }
  if (current._count.services < seed.services.length) {
    const wanted = seed.services.map((name) => {
      const id = services.get(name);
      if (!id) throw new Error(`${slug}: no service "${name}"`);
      return id;
    });
    const held = new Set((await db.businessService.findMany({ where: { businessId: current.id }, select: { serviceId: true } })).map((row) => row.serviceId));
    data.services = { create: wanted.filter((id) => !held.has(id)).map((serviceId) => ({ serviceId })) };
  }
  if (Object.keys(data).length > 0) {
    await db.business.update({ where: { id: current.id }, data: { ...data, version: { increment: 1 } } });
  }

  if (current._count.media === 0) {
    const images = await findImages(slug, seed.images);
    if (images.length > 0) {
      await waitUntilReady(images.map((image) => image.id));
      await attachMedia(current.id, images);
    }
  }
  if (current._count.reviews === 0) await writeReviews(current.id, seed.reviews);
  console.log(`  filled in: ${Object.keys(data).join(', ') || 'nothing missing'}`);
}

/**
 * `--reimage slug,slug`: forget the photographs chosen for those listings and
 * choose again. For when a search picked something on subject but wrong —
 * the media rows go, the objects stay in the dev store for the retention task.
 */
async function forgetImages(slugs: string[]): Promise<void> {
  for (const slug of slugs) {
    const assets = await db.mediaAsset.findMany({ where: { sourceName: { startsWith: `${slug}-` } }, select: { id: true } });
    await db.businessMedia.deleteMany({ where: { mediaId: { in: assets.map((a) => a.id) } } });
    await db.mediaAsset.deleteMany({ where: { id: { in: assets.map((a) => a.id) } } });
    console.log(`forgot ${assets.length} photograph(s) for ${slug}`);
  }
}

async function reimage(slugs: string[]): Promise<void> {
  const known = new Map([...SEED_BUSINESSES.map((b) => [b.slug, b.images] as const), ...Object.entries(SEED_ENRICHMENT).map(([slug, seed]) => [slug, seed.images] as const)]);
  await forgetImages(slugs);
  for (const slug of slugs) {
    const business = await db.business.findUnique({ where: { slug }, select: { id: true, name: true } });
    const queries = known.get(slug);
    if (!business || !queries) throw new Error(`${slug}: not a seeded listing`);
    console.log(`\n${business.name}`);
    const images = await findImages(slug, queries);
    if (images.length > 0) {
      await waitUntilReady(images.map((image) => image.id));
      await attachMedia(business.id, images);
    }
  }
}

async function main(): Promise<void> {
  console.log(`Seeding demonstration listings into ${databaseName}\n`);

  const flag = process.argv.indexOf('--reimage');
  if (flag !== -1) {
    const slugs = (process.argv[flag + 1] ?? '').split(',').filter(Boolean);
    if (slugs.length === 0) throw new Error('--reimage needs a comma-separated list of slugs');
    // Titles in use by every other listing stay excluded.
    for (const row of await db.mediaAsset.findMany({ where: { rightsNote: { contains: 'commons.wikimedia.org' } }, select: { rightsNote: true } })) {
      const match = /wiki\/(File:[^ ]+)$/.exec(row.rightsNote ?? '');
      if (match) usedTitles.add(decodeURIComponent(match[1]!));
    }
    await reimage(slugs);
    return;
  }

  const services = await ensureServices();
  const categories = new Map((await db.category.findMany({ where: { active: true }, select: { id: true, slug: true } })).map((row) => [row.slug, row.id]));
  const areas = new Map((await db.localArea.findMany({ where: { active: true }, select: { id: true, slug: true } })).map((row) => [row.slug, row.id]));
  console.log(`${services.size} services, ${categories.size} categories, ${areas.size} local areas`);

  // Titles already used by earlier runs, so a re-run does not hand a second
  // listing a picture the first one has.
  for (const row of await db.mediaAsset.findMany({ where: { rightsNote: { contains: 'commons.wikimedia.org' } }, select: { rightsNote: true } })) {
    const match = /wiki\/(File:[^ ]+)$/.exec(row.rightsNote ?? '');
    if (match) usedTitles.add(decodeURIComponent(match[1]!));
  }

  for (const [slug, seed] of Object.entries(SEED_ENRICHMENT)) await enrichBusiness(slug, seed, services);

  const existing = new Set((await db.business.findMany({ where: { slug: { in: SEED_BUSINESSES.map((b) => b.slug) } }, select: { slug: true } })).map((b) => b.slug));
  const wanted = SEED_BUSINESSES.filter((seed) => !existing.has(seed.slug));
  console.log(`\n${wanted.length} new listing(s) to create; ${existing.size} already present`);
  for (const seed of wanted) await createBusiness(seed, services, categories, areas);

  // Listings created by an earlier version of this script have every other
  // detail but no enquiry inbox or establishment year; fill those in.
  for (const seed of SEED_BUSINESSES) {
    const row = await db.business.findUnique({ where: { slug: seed.slug }, select: { id: true, privateEnquiryEmailEncrypted: true, establishedYear: true } });
    if (!row) continue;
    const data: { privateEnquiryEmailEncrypted?: string; establishedYear?: number } = {};
    if (!row.privateEnquiryEmailEncrypted) data.privateEnquiryEmailEncrypted = encryption.encrypt(enquiryAddress(seed.website), row.id);
    if (row.establishedYear === null) data.establishedYear = seed.established;
    if (Object.keys(data).length > 0) {
      await db.business.update({ where: { id: row.id }, data });
      console.log(`  filled in ${Object.keys(data).join(', ')} for ${seed.slug}`);
    }
  }

  const published = await db.business.count({ where: { status: 'published' } });
  console.log(`\nDone. ${published} listings published. Open http://127.0.0.1:3000/business — cached pages refresh within a minute.`);
}

main()
  .catch((error: unknown) => {
    console.error('\n' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
