/**
 * Seeds the website surfaces that ship empty: the FAQ page, the testimonials
 * on the home page, the clients-and-partners strip, and the comments under the
 * seeded articles.
 *
 * Everything is written in `website-seed-content.ts` and written here the way
 * the API writes it — answers rendered through the same sanitiser an editor's
 * would go through, comment addresses encrypted and hashed exactly as a
 * submission would be, publication times recorded.
 *
 * Partner logos are **drawn here** rather than found: a partner's logo is its
 * own mark, and passing a stock photograph off as one would be a lie on the
 * page. Each is a plain wordmark built from the organisation's initials, put
 * through the same upload pipeline as any other image, so the media library
 * treats it like anything else.
 *
 * Re-running is safe: every record is matched on something stable and skipped
 * when it is already there.
 *
 *   pnpm --filter api exec tsx --env-file=.env scripts/seed-website-content.ts
 */
import { createRequire } from 'node:module';
import { renderSanitisedBody } from '../src/blog/sanitise.js';
import { databaseName, db, uploadBytes, waitUntilReady } from './seed-commons.js';
import { encryption, hash, termsVersion } from './seed-business-writer.js';
import { SEED_COMMENTS, SEED_FAQS, SEED_PARTNERS, SEED_TESTIMONIALS } from './website-seed-content.js';

/**
 * Sharp lives in the worker, which is the application that processes images;
 * the API has no need of it and should not grow one for a seeder. Resolving it
 * from there keeps the dependency where it belongs.
 */
const require = createRequire(`${process.cwd()}/apps/worker/`);
type Sharp = (input: Buffer) => { png: () => { toBuffer: () => Promise<Buffer> } };
const sharp = require('sharp') as Sharp;

const LOGO_WIDTH = 640;
const LOGO_HEIGHT = 240;

/** A plain wordmark: the initials in a rounded square, the name beside them. */
function logoSvg(name: string, initials: string, colour: string): string {
  const escaped = name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Two lines where the name is long, so it never runs off the mark.
  const words = escaped.split(' ');
  const half = Math.ceil(words.length / 2);
  const lines = escaped.length > 22 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [escaped];
  const text = lines
    .map((line, index) => `<text x="232" y="${LOGO_HEIGHT / 2 + (lines.length === 1 ? 12 : index * 44 - 10)}" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="600" fill="#0F172A">${line}</text>`)
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" viewBox="0 0 ${LOGO_WIDTH} ${LOGO_HEIGHT}">
    <rect width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" fill="#FFFFFF"/>
    <rect x="48" y="60" width="120" height="120" rx="28" fill="${colour}"/>
    <text x="108" y="140" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="52" font-weight="700" fill="#FFFFFF">${initials}</text>
    ${text}
  </svg>`;
}

async function seedFaqs(): Promise<void> {
  let added = 0;
  for (const [index, faq] of SEED_FAQS.entries()) {
    const existing = await db.faq.findFirst({ where: { question: faq.question }, select: { id: true } });
    if (existing) continue;
    const published = faq.published !== false;
    await db.faq.create({
      data: {
        question: faq.question,
        answerSource: faq.answer,
        // The same renderer the API uses, so nothing reaches the database that
        // would not have survived the editor.
        answerHtml: renderSanitisedBody(faq.answer, 'markdown'),
        answerFormat: 'markdown',
        groupName: faq.group,
        displayOrder: index,
        status: published ? 'published' : 'draft',
        publishedAt: published ? new Date() : null,
      },
    });
    added += 1;
  }
  console.log(`FAQs: ${added} added, ${SEED_FAQS.length - added} already there`);
}

async function seedTestimonials(): Promise<void> {
  let added = 0;
  for (const [index, item] of SEED_TESTIMONIALS.entries()) {
    const existing = await db.testimonial.findFirst({ where: { displayName: item.name }, select: { id: true } });
    if (existing) continue;
    const business = item.business ? await db.business.findUnique({ where: { slug: item.business }, select: { id: true } }) : null;
    const published = item.published !== false;
    await db.testimonial.create({
      data: {
        displayName: item.name,
        relationship: item.relationship,
        quote: item.quote,
        businessId: business?.id ?? null,
        displayOrder: index,
        status: published ? 'published' : 'draft',
        publishedAt: published ? new Date() : null,
      },
    });
    added += 1;
  }
  console.log(`Testimonials: ${added} added, ${SEED_TESTIMONIALS.length - added} already there`);
}

async function seedPartners(): Promise<void> {
  let added = 0;
  for (const [index, partner] of SEED_PARTNERS.entries()) {
    const existing = await db.partnerOrganisation.findFirst({ where: { name: partner.name }, select: { id: true } });
    if (existing) continue;

    const png = await sharp(Buffer.from(logoSvg(partner.name, partner.initials, partner.colour))).png().toBuffer();
    const mediaId = await uploadBytes({
      bytes: png,
      mimeType: 'image/png',
      extension: 'png',
      sourceName: `partner-${partner.initials.toLowerCase()}-logo.png`,
      // The mark names the organisation, which is what the strip needs read out.
      alt: `${partner.name} logo`,
      credit: partner.name,
      rightsNote: `Demonstration wordmark drawn for the seeded partner "${partner.name}"; not a real organisation's mark.`,
    });
    await waitUntilReady([mediaId]);

    const published = partner.published !== false;
    await db.partnerOrganisation.create({
      data: {
        name: partner.name,
        relationshipLabel: partner.relationship,
        mediaId,
        logoAlt: `${partner.name} logo`,
        websiteUrl: partner.website,
        // Permission is evidence, recorded with the record (SRS 1.2 CLI 002).
        authorisedAt: new Date(),
        authorisationNote: partner.note,
        displayOrder: index,
        status: published ? 'published' : 'draft',
        publishedAt: published ? new Date() : null,
      },
    });
    added += 1;
    console.log(`  ${partner.name}`);
  }
  console.log(`Clients and partners: ${added} added, ${SEED_PARTNERS.length - added} already there`);
}

async function seedComments(): Promise<void> {
  const now = Date.now();
  let added = 0;
  let skippedPosts = 0;
  for (const comment of SEED_COMMENTS) {
    const post = await db.post.findUnique({ where: { slug: comment.post }, select: { id: true } });
    if (!post) {
      skippedPosts += 1;
      continue;
    }
    const existing = await db.comment.findFirst({ where: { postId: post.id, displayName: comment.name }, select: { id: true } });
    if (existing) continue;

    const email = `${comment.name.toLowerCase().replace(/[^a-z]+/g, '.')}@readers.example`;
    const createdAt = new Date(now - comment.daysAgo * 86_400_000);
    await db.comment.create({
      data: {
        postId: post.id,
        displayName: comment.name,
        // Written exactly as a submission would be: encrypted with the same
        // associated data the API uses, and hashed with the same key.
        privateEmailEncrypted: encryption.encrypt(email, 'comment'),
        emailHash: hash(email),
        originalText: comment.text,
        publicText: comment.redactedTo ?? null,
        redactionReason: comment.redactionReason ?? null,
        status: comment.status,
        moderationReason: comment.moderationReason ?? null,
        decidedAt: comment.status === 'pending' ? null : new Date(createdAt.getTime() + 5 * 3_600_000),
        acknowledgedVersion: termsVersion,
        acknowledgedAt: createdAt,
        submitterIpHash: hash('203.0.113.42'),
        createdAt,
      },
    });
    added += 1;
  }
  const counts = await db.comment.groupBy({ by: ['status'], _count: { _all: true } });
  console.log(`Comments: ${added} added${skippedPosts > 0 ? `, ${skippedPosts} skipped (their article is not seeded)` : ''}`);
  console.log(`  now: ${counts.map((row) => `${row._count._all} ${row.status}`).join(', ')}`);
}

async function main(): Promise<void> {
  console.log(`Seeding website content into ${databaseName}\n`);
  await seedFaqs();
  await seedTestimonials();
  await seedPartners();
  await seedComments();
  console.log('\nDone. The FAQ page, home-page testimonials, partners strip and article comments all have content.');
}

main()
  .catch((error: unknown) => {
    console.error('\n' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  })
  .finally(() => void db.$disconnect());
