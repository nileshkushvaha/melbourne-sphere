import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SESSION_COOKIE_NAME } from '../src/auth/session.service.js';
import { ScheduledPublishingService } from '../src/blog/scheduled-publishing.service.js';
import { ORIGIN, TEST_ADMIN, clearThrottleKeys, seedSuperAdmin } from './integration/auth-fixtures.js';
import { closeTestDatabase, createIntegrationApp, testDatabase, truncateApplicationTables } from './integration/harness.js';

describe('Blog editorial core (integration)', () => {
  let app: INestApplication;
  let scheduler: ScheduledPublishingService;
  let cookie: string;
  let writerCookie: string;
  let authorId: string;
  let categoryId: string;
  let tagId: string;
  const agent = () => request(app.getHttpServer());
  const admin = (req: request.Test, c = cookie) => req.set('Origin', ORIGIN).set('Cookie', c);
  const body = 'Melbourne laneways are full of small operators. '.repeat(8);
  const login = async (email: string, password: string, ip: string) => {
    const res = await agent().post('/api/v1/admin/auth/login').set('Origin', ORIGIN).set('X-Forwarded-For', ip).send({ email, password }).expect(200);
    return ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(';')[0]!;
  };

  beforeAll(async () => {
    await truncateApplicationTables();
    app = await createIntegrationApp();
    scheduler = app.get(ScheduledPublishingService);
    await clearThrottleKeys(app);
    await seedSuperAdmin(app);
    cookie = await login(TEST_ADMIN.email, TEST_ADMIN.password, '203.0.113.190');
    const db = testDatabase();
    const role = await db.role.create({ data: { key: 'post_writer', name: 'Writer', description: 'test' } });
    const perm = await db.permission.findUniqueOrThrow({ where: { key: 'posts.write' } });
    await db.rolePermission.create({ data: { roleId: role.id, permissionId: perm.id } });
    await seedSuperAdmin(app, { email: 'writer@example.com', password: 'writer-password-12345', displayName: 'Writer' });
    const writer = await db.adminUser.findUniqueOrThrow({ where: { email: 'writer@example.com' } });
    await db.adminRole.deleteMany({ where: { adminId: writer.id } });
    await db.adminRole.create({ data: { adminId: writer.id, roleId: role.id } });
    writerCookie = await login('writer@example.com', 'writer-password-12345', '203.0.113.191');

    authorId = (await admin(agent().post('/api/v1/admin/authors')).send({ displayName: 'Alex Editor', bio: 'Writes about Melbourne.' }).expect(201)).body.data.id;
    categoryId = (await admin(agent().post('/api/v1/admin/blog-categories')).send({ name: 'City guides', landingContent: '## City guides\n\nOur guides to Melbourne.' }).expect(201)).body.data.id;
    tagId = (await admin(agent().post('/api/v1/admin/blog-tags')).send({ name: 'Coffee' }).expect(201)).body.data.id;
  });

  afterAll(async () => {
    await clearThrottleKeys(app);
    await app.close();
    await closeTestDatabase();
  });

  let postId: string;
  let version: number;

  it('creates authors and taxonomy with generated slugs and sanitised landing content', async () => {
    const author = (await admin(agent().get('/api/v1/admin/authors')).expect(200)).body.data[0];
    expect(author).toMatchObject({ displayName: 'Alex Editor', slug: 'alex-editor', active: true, postCount: 0 });
    const category = (await admin(agent().get('/api/v1/admin/blog-categories')).expect(200)).body.data[0];
    expect(category.slug).toBe('city-guides');
    expect(category.landingContent).toContain('<h2>City guides</h2>');
    const injected = await admin(agent().post('/api/v1/admin/blog-tags')).send({ name: 'Nightlife', landingContent: '<script>alert(1)</script>Nightlife in Melbourne.' }).expect(201);
    expect(injected.body.data.landingContent).not.toContain('<script');
    expect(injected.body.data.landingContent).toContain('Nightlife in Melbourne.');
    await agent().get('/api/v1/admin/authors').expect(401);
  });

  it('creates a draft, sanitises the body and never publishes automatically', async () => {
    const created = await admin(agent().post('/api/v1/admin/posts'))
      .send({ title: 'Best laneway coffee in Melbourne', excerpt: 'Where to find the best coffee in the laneways.', bodyMarkdown: `${body}\n\n<script>alert(1)</script>\n\nRead more at [example](https://example.com).`, authorId, categoryId, tagIds: [tagId] })
      .expect(201);
    postId = created.body.data.id;
    version = created.body.data.version;
    expect(created.body.data).toMatchObject({ slug: 'best-laneway-coffee-in-melbourne', status: 'draft', commentsEnabled: true, publicationBlockers: [] });
    expect(created.body.data.sanitizedBody).not.toContain('<script');
    expect(created.body.data.sanitizedBody).toContain('rel="noopener noreferrer nofollow"');
    expect(created.body.data.bodyMarkdown).toContain('<script>'); // the source is preserved verbatim
    await admin(agent().post('/api/v1/admin/posts')).send({ title: 'Duplicate slug test', slug: 'best-laneway-coffee-in-melbourne', authorId, categoryId }).expect(409);
    await admin(agent().post('/api/v1/admin/posts')).send({ title: 'Unknown author', authorId: 'nope', categoryId }).expect(400);
  });

  it('blocks publication until every requirement is met and locks the slug afterwards', async () => {
    const thin = (await admin(agent().post('/api/v1/admin/posts')).send({ title: 'Thin article', excerpt: 'short', bodyMarkdown: 'tiny', authorId, categoryId }).expect(201)).body.data;
    const blocked = await admin(agent().post(`/api/v1/admin/posts/${thin.id}/publish`)).send({ expectedVersion: thin.version }).expect(409);
    expect(blocked.body.error.code).toBe('PUBLICATION_BLOCKED');
    expect(blocked.body.error.fields.publication).toEqual(expect.arrayContaining(['Excerpt must be at least 20 characters', 'Article body must be at least 200 characters']));

    await admin(agent().post(`/api/v1/admin/posts/${postId}/publish`), writerCookie).send({ expectedVersion: version }).expect(403);
    const published = await admin(agent().post(`/api/v1/admin/posts/${postId}/publish`)).send({ expectedVersion: version }).expect(200);
    expect(published.body.data).toMatchObject({ status: 'published' });
    expect(published.body.data.firstPublishedAt).not.toBeNull();
    version = published.body.data.version;
    const db = testDatabase();
    expect(await db.outboxEvent.count({ where: { resourceId: postId, type: 'post.published' } })).toBe(1);
    const locked = await admin(agent().patch(`/api/v1/admin/posts/${postId}`)).send({ expectedVersion: version, slug: 'new-slug' }).expect(409);
    expect(locked.body.error.code).toBe('SLUG_LOCKED');
  });

  it('records a revision when a published article changes and keeps the first publication date', async () => {
    const db = testDatabase();
    const before = await db.post.findUniqueOrThrow({ where: { id: postId } });
    const updated = await admin(agent().patch(`/api/v1/admin/posts/${postId}`))
      .send({ expectedVersion: version, bodyMarkdown: `${body}\n\nUpdated with a new closing paragraph.`, revisionReason: 'Added closing paragraph' })
      .expect(200);
    version = updated.body.data.version;
    expect(updated.body.data.sanitizedBody).toContain('Updated with a new closing paragraph.');
    const revisions = (await admin(agent().get(`/api/v1/admin/posts/${postId}/revisions`)).expect(200)).body.data;
    expect(revisions[0]).toMatchObject({ version: before.version, reason: 'Added closing paragraph' });
    const after = await db.post.findUniqueOrThrow({ where: { id: postId } });
    expect(after.firstPublishedAt?.toISOString()).toBe(before.firstPublishedAt?.toISOString());
    const snapshot = await db.contentRevision.findFirstOrThrow({ where: { resourceId: postId } });
    expect(snapshot.sanitizedSnapshot).toBe(before.sanitizedBody);
    expect(await db.outboxEvent.count({ where: { resourceId: postId, type: 'post.updated' } })).toBe(1);
  });

  it('previews only for authorised admins and never publicly', async () => {
    const preview = await admin(agent().get(`/api/v1/admin/posts/${postId}/preview`)).expect(200);
    expect(preview.body.data).toMatchObject({ noindex: true, authorName: 'Alex Editor' });
    expect(preview.headers['cache-control']).toContain('no-store');
    expect(preview.headers['x-robots-tag']).toContain('noindex');
    await agent().get(`/api/v1/admin/posts/${postId}/preview`).expect(401);
    await agent().get(`/api/v1/posts/${postId}`).expect(404); // no public blog route exists yet
  });

  it('schedules in UTC, refuses past times and publishes due posts idempotently on catch-up', async () => {
    const db = testDatabase();
    const draft = (await admin(agent().post('/api/v1/admin/posts')).send({ title: 'Spring festival guide', excerpt: 'What is on across the city this spring.', bodyMarkdown: body, authorId, categoryId }).expect(201)).body.data;
    const past = await admin(agent().post(`/api/v1/admin/posts/${draft.id}/schedule`)).send({ expectedVersion: draft.version, scheduledAt: '2020-01-01T00:00:00.000Z' }).expect(409);
    expect(past.body.error.fields.publication).toEqual(['The scheduled time must be in the future']);
    // 2026-10-04 is the AEDT transition; 10:00 Melbourne is 23:00Z on the 3rd.
    const scheduledAt = '2026-10-03T23:00:00.000Z';
    const scheduled = await admin(agent().post(`/api/v1/admin/posts/${draft.id}/schedule`)).send({ expectedVersion: draft.version, scheduledAt }).expect(200);
    expect(scheduled.body.data).toMatchObject({ status: 'scheduled', scheduledAt });

    expect(await scheduler.runOnce(new Date('2026-10-03T22:59:00Z'))).toBe(0); // not due yet
    expect((await db.post.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('scheduled');
    // A catch-up run long after the due time still publishes it exactly once.
    expect(await scheduler.runOnce(new Date('2026-10-04T06:00:00Z'))).toBe(1);
    const afterFirst = await db.post.findUniqueOrThrow({ where: { id: draft.id } });
    expect(afterFirst).toMatchObject({ status: 'published', scheduledAt: null });
    expect(await scheduler.runOnce(new Date('2026-10-04T06:05:00Z'))).toBe(0); // idempotent
    expect(await db.outboxEvent.count({ where: { resourceId: draft.id, type: 'post.published' } })).toBe(1);
  });

  it('leaves a permanent redirect behind when a category or tag moves address', async () => {
    const db = testDatabase();
    const tag = (await admin(agent().post('/api/v1/admin/blog-tags')).send({ name: 'Rooftop bars' }).expect(201)).body.data;
    expect(tag.slug).toBe('rooftop-bars');
    const moved = await admin(agent().patch(`/api/v1/admin/blog-tags/${tag.id}`))
      .send({ name: 'Rooftop bars', slug: 'rooftops', expectedVersion: tag.version })
      .expect(200);
    expect(moved.body.data.slug).toBe('rooftops');
    // A tag has a public landing page, so the address it used to live at must
    // keep working for anyone who saved or linked it (SRS SEO 004).
    const redirect = await db.redirect.findUniqueOrThrow({ where: { sourcePath: '/blog/tag/rooftop-bars' } });
    expect(redirect).toMatchObject({ targetPath: '/blog/tag/rooftops', kind: 'permanent', resourceType: 'blog_tag', resourceId: tag.id });

    const category = (await admin(agent().post('/api/v1/admin/blog-categories')).send({ name: 'Day trips' }).expect(201)).body.data;
    await admin(agent().patch(`/api/v1/admin/blog-categories/${category.id}`)).send({ name: 'Day trips', slug: 'daytrips', expectedVersion: category.version }).expect(200);
    expect(await db.redirect.findUniqueOrThrow({ where: { sourcePath: '/blog/category/day-trips' } })).toMatchObject({ targetPath: '/blog/category/daytrips', resourceType: 'blog_category' });

    // Renaming without moving leaves no rule: there is nothing to redirect.
    const after = (await admin(agent().get('/api/v1/admin/blog-tags')).expect(200)).body.data.find((row: { id: string }) => row.id === tag.id);
    await admin(agent().patch(`/api/v1/admin/blog-tags/${tag.id}`)).send({ name: 'Rooftop drinking', expectedVersion: after.version }).expect(200);
    expect(await db.redirect.count({ where: { resourceId: tag.id } })).toBe(1);
  });

  it('prevents deactivating an author or category still used by a live article', async () => {
    const db = testDatabase();
    const author = await db.author.findUniqueOrThrow({ where: { id: authorId } });
    const blockedAuthor = await admin(agent().post(`/api/v1/admin/authors/${authorId}/deactivate`)).send({ expectedVersion: author.version }).expect(409);
    expect(blockedAuthor.body.error.code).toBe('TERM_IN_USE');
    const category = await db.blogCategory.findUniqueOrThrow({ where: { id: categoryId } });
    await admin(agent().post(`/api/v1/admin/blog-categories/${categoryId}/deactivate`)).send({ expectedVersion: category.version }).expect(409);
    const tag = await db.blogTag.findUniqueOrThrow({ where: { id: tagId } });
    await admin(agent().post(`/api/v1/admin/blog-tags/${tagId}/deactivate`)).send({ expectedVersion: tag.version }).expect(409);
  });

  it('archives and restores with the documented transitions and filters the list', async () => {
    const db = testDatabase();
    const current = await db.post.findUniqueOrThrow({ where: { id: postId } });
    await admin(agent().post(`/api/v1/admin/posts/${postId}/restore`)).send({ expectedVersion: current.version }).expect(409); // not archived
    const archived = await admin(agent().post(`/api/v1/admin/posts/${postId}/archive`)).send({ expectedVersion: current.version, reason: 'Superseded' }).expect(200);
    expect(archived.body.data.status).toBe('archived');
    await admin(agent().patch(`/api/v1/admin/posts/${postId}`)).send({ expectedVersion: archived.body.data.version, title: 'Edited while archived' }).expect(409);
    const restored = await admin(agent().post(`/api/v1/admin/posts/${postId}/restore`)).send({ expectedVersion: archived.body.data.version }).expect(200);
    expect(restored.body.data).toMatchObject({ status: 'draft', publishedAt: null });
    const list = await admin(agent().get('/api/v1/admin/posts?status=published&sort=publishedAt&order=desc')).expect(200);
    expect(list.body.data.every((p: { status: string }) => p.status === 'published')).toBe(true);
    const byTag = await admin(agent().get(`/api/v1/admin/posts?tagId=${tagId}`)).expect(200);
    expect(byTag.body.meta.total).toBe(1);
    const actions = (await db.auditLog.findMany({ where: { targetId: postId }, orderBy: { createdAt: 'asc' } })).map((a) => a.action);
    expect(actions).toEqual(['blog.post.create', 'blog.post.publish', 'blog.post.update', 'blog.post.archive', 'blog.post.restore']);
  });
});
