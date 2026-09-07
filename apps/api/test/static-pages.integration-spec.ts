import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SESSION_COOKIE_NAME } from '../src/auth/session.service.js';
import { ORIGIN, TEST_ADMIN, clearThrottleKeys, seedSuperAdmin } from './integration/auth-fixtures.js';
import { closeTestDatabase, createIntegrationApp, testDatabase, truncateApplicationTables } from './integration/harness.js';

const realCopy = '<h2>How we work</h2><p>Melbourne Sphere is an independent directory of businesses inside the City of Melbourne. Our editors verify every listing against the approved boundary before it is published, and we correct details when readers tell us something has changed.</p>';

/** Information pages (SRS CFG 002). */
describe('Static pages (integration)', () => {
  let app: INestApplication;
  let cookie: string;
  const agent = () => request(app.getHttpServer());
  const put = (path: string) => agent().put(path).set('Origin', ORIGIN).set('Cookie', cookie);
  const post = (path: string) => agent().post(path).set('Origin', ORIGIN).set('Cookie', cookie);

  beforeAll(async () => {
    await truncateApplicationTables();
    app = await createIntegrationApp();
    await clearThrottleKeys(app);
    await seedSuperAdmin(app);
    const login = await agent().post('/api/v1/admin/auth/login').set('Origin', ORIGIN).set('X-Forwarded-For', '203.0.113.220').send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password }).expect(200);
    cookie = ([] as string[]).concat(login.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(';')[0]!;
  });

  afterAll(async () => {
    await clearThrottleKeys(app);
    await app.close();
    await closeTestDatabase();
  });

  it('lists the fixed page set, including pages that have never been edited', async () => {
    const res = await agent().get('/api/v1/admin/pages').set('Cookie', cookie).expect(200);
    expect(res.body.data.map((page: { slug: string }) => page.slug)).toEqual(['about', 'contact', 'privacy', 'terms', 'review-guidelines']);
    expect(res.body.data[0]).toMatchObject({ status: 'draft', version: 0 });
    expect(res.body.data[0].publicationBlockers.length).toBeGreaterThan(0);
    await agent().get('/api/v1/admin/pages/not-a-page').set('Cookie', cookie).expect(404);
  });

  it('saves sanitised content, refuses placeholder copy at publish, then publishes and serves it publicly', async () => {
    const saved = await put('/api/v1/admin/pages/privacy')
      .send({ expectedVersion: 0, title: 'Privacy', body: `${realCopy}<script>alert(1)</script>`, bodyFormat: 'html' })
      .expect(200);
    expect(saved.body.data.sanitizedBody).toContain('<h2>How we work</h2>');
    expect(saved.body.data.sanitizedBody).not.toContain('script');
    expect(saved.body.data.status).toBe('draft');

    // Draft pages are invisible to the public site.
    await agent().get('/api/v1/pages/privacy').expect(404);

    const placeholder = await put('/api/v1/admin/pages/privacy')
      .send({ expectedVersion: saved.body.data.version, title: 'Privacy', body: '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, placeholder legal copy to be written later.</p>' })
      .expect(200);
    const blocked = await post('/api/v1/admin/pages/privacy/publish').send({ expectedVersion: placeholder.body.data.version }).expect(409);
    expect(blocked.body.error.code).toBe('PUBLICATION_BLOCKED');
    expect(blocked.body.error.fields.publication.join(' ')).toMatch(/placeholder/i);

    const fixed = await put('/api/v1/admin/pages/privacy').send({ expectedVersion: placeholder.body.data.version, title: 'Privacy', body: realCopy }).expect(200);
    const published = await post('/api/v1/admin/pages/privacy/publish').send({ expectedVersion: fixed.body.data.version }).expect(200);
    expect(published.body.data.status).toBe('published');

    const publicPage = await agent().get('/api/v1/pages/privacy').expect(200);
    expect(publicPage.body.data).toMatchObject({ slug: 'privacy', title: 'Privacy' });
    expect(publicPage.body.data.body).toContain('<h2>How we work</h2>');
    const list = await agent().get('/api/v1/pages').expect(200);
    expect(list.body.data).toEqual([{ slug: 'privacy', title: 'Privacy' }]);

    // Editing published text keeps a revision (CFG 002).
    const edited = await put('/api/v1/admin/pages/privacy').send({ expectedVersion: published.body.data.version, title: 'Privacy', body: `${realCopy}<p>We updated this page.</p>`, revisionReason: 'Clarified retention' }).expect(200);
    expect(edited.body.data.version).toBe(published.body.data.version + 1);
    const db = testDatabase();
    const revisions = await db.contentRevision.findMany({ where: { resourceType: 'static_page' } });
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.reason).toBe('Clarified retention');
  });

  it('validates contact routing before the contact page can go live', async () => {
    const saved = await put('/api/v1/admin/pages/contact').send({ expectedVersion: 0, title: 'Contact us', body: realCopy }).expect(200);
    const noEmail = await post('/api/v1/admin/pages/contact/publish').send({ expectedVersion: saved.body.data.version }).expect(409);
    expect(noEmail.body.error.fields.publication.join(' ')).toMatch(/contact address is required/i);

    const sample = await put('/api/v1/admin/pages/contact').send({ expectedVersion: saved.body.data.version, title: 'Contact us', body: realCopy, contactEmail: 'hello@example.com' }).expect(200);
    const sampleBlocked = await post('/api/v1/admin/pages/contact/publish').send({ expectedVersion: sample.body.data.version }).expect(409);
    expect(sampleBlocked.body.error.fields.publication.join(' ')).toMatch(/example domain/i);

    const real = await put('/api/v1/admin/pages/contact').send({ expectedVersion: sample.body.data.version, title: 'Contact us', body: realCopy, contactEmail: 'Editors@MelbourneSphere.au' }).expect(200);
    const live = await post('/api/v1/admin/pages/contact/publish').send({ expectedVersion: real.body.data.version }).expect(200);
    expect(live.body.data.status).toBe('published');
    const publicPage = await agent().get('/api/v1/pages/contact').expect(200);
    expect(publicPage.body.data.contactEmail).toBe('Editors@MelbourneSphere.au');
  });

  it('refuses stale saves and unauthenticated access', async () => {
    const stale = await put('/api/v1/admin/pages/terms').send({ expectedVersion: 9, title: 'Terms of use', body: realCopy }).expect(409);
    expect(stale.body.error.code).toBe('STALE_VERSION');
    await agent().get('/api/v1/admin/pages').expect(401);
    await agent().put('/api/v1/admin/pages/terms').set('Origin', ORIGIN).send({ expectedVersion: 0, title: 'Terms', body: realCopy }).expect(401);
  });
});
