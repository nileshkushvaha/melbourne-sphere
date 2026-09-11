/**
 * Minimum public content for the browser suite.
 *
 * The suite runs against a database it creates for the run, which is empty. The
 * discovery and editorial journeys need one published business and one published
 * article to be journeys at all — without them they skip, and a skipped journey
 * is not evidence (audit F-09). This seeds exactly what those journeys read and
 * nothing else; the database is dropped when the run ends.
 */
import { createDatabaseClient } from '@melbourne-sphere/database';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const database = new URL(url.replace(/^mysql:/, 'http:')).pathname.replace(/^\//, '');
// The same guard the e2e provisioning uses: never seed something real.
if (!/(_dev|_test|_e2e)$/.test(database)) throw new Error(`Refusing to seed "${database}": the name must end in _dev, _test or _e2e`);

const db = createDatabaseClient({ url, allowPublicKeyRetrieval: process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true' });
const now = new Date();

try {
  const category = await db.category.create({ data: { name: 'Cafes', slug: 'cafes', description: 'Coffee and food.', sortOrder: 1, active: true } });
  const area = await db.localArea.create({ data: { name: 'Carlton', slug: 'carlton', active: true, sortOrder: 1, eligibilitySource: 'Browser suite fixture', eligibilityVerifiedAt: now } });

  const business = await db.business.create({
    data: {
      name: 'Fixture Coffee House',
      normalizedName: 'fixture coffee house',
      slug: 'fixture-coffee-house',
      description: 'A fixture listing used by the browser suite. It exists so the discovery journey has something real to reach, and it is removed with the database at the end of the run.',
      status: 'published',
      primaryCategoryId: category.id,
      localAreaId: area.id,
      publicPhone: '03 9000 0000',
      addressVisibility: 'full',
      hoursMode: 'unknown',
      eligibilityVerifiedAt: now,
      eligibilitySource: 'Browser suite fixture',
      firstPublishedAt: now,
      publishedAt: now,
    },
  });
  await db.businessCategory.create({ data: { businessId: business.id, categoryId: category.id } });

  const author = await db.author.create({ data: { displayName: 'Fixture Author', slug: 'fixture-author', role: 'Editor', shortBio: 'Writes the fixture article.' } });
  const blogCategory = await db.blogCategory.create({ data: { name: 'City life', slug: 'city-life', active: true, sortOrder: 1 } });
  await db.post.create({
    data: {
      title: 'A fixture article for the browser suite',
      slug: 'fixture-article',
      excerpt: 'Published so the editorial journey has an article to open.',
      bodyMarkdown: '# A fixture article\n\nPublished so the editorial journey has an article to open, a byline to read and an author card to render.',
      sanitizedBody: '<h1>A fixture article</h1><p>Published so the editorial journey has an article to open, a byline to read and an author card to render.</p>',
      status: 'published',
      authorId: author.id,
      categoryId: blogCategory.id,
      commentsEnabled: true,
      firstPublishedAt: now,
      publishedAt: now,
    },
  });
  console.log('[browser] seeded one published business and one published article');
} finally {
  await db.$disconnect();
}
