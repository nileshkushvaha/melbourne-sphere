import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SESSION_COOKIE_NAME } from '../src/auth/session.service.js';
import { ORIGIN, TEST_ADMIN, clearThrottleKeys, seedSuperAdmin } from './integration/auth-fixtures.js';
import { closeTestDatabase, createIntegrationApp, truncateApplicationTables } from './integration/harness.js';

/** Manual featured placements (SRS DIR 007). */
describe('Featured placements (integration)', () => {
  let app: INestApplication;
  let cookie: string;
  let ids: { cafes: string; shopping: string; cbd: string; carlton: string };
  const businesses: Record<string, { id: string; version: number }> = {};
  const agent = () => request(app.getHttpServer());
  const post = (path: string) => agent().post(path).set('Origin', ORIGIN).set('Cookie', cookie);
  const del = (path: string) => agent().delete(path).set('Origin', ORIGIN).set('Cookie', cookie);

  const listing = (name: string, categoryId: string, areaId: string) => ({
    name,
    description: `${name} is a Melbourne business used by the featured placement integration test suite.`,
    primaryCategoryId: categoryId,
    localAreaId: areaId,
    publicPhone: '+61 3 9000 1234',
    address: { line1: '1 Test St', suburb: 'Melbourne', postcode: '3000', latitude: -37.8136, longitude: 144.9631 },
    eligibilitySource: 'City of Melbourne suburb list',
    contentRightsReviewed: true,
  });

  beforeAll(async () => {
    await truncateApplicationTables();
    app = await createIntegrationApp();
    await clearThrottleKeys(app);
    await seedSuperAdmin(app);
    const login = await agent().post('/api/v1/admin/auth/login').set('Origin', ORIGIN).set('X-Forwarded-For', '203.0.113.230').send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password }).expect(200);
    cookie = ([] as string[]).concat(login.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(';')[0]!;

    const mk = async (path: string, body: object) => (await post(path).send(body).expect(201)).body.data.id as string;
    ids = {
      cafes: await mk('/api/v1/admin/categories', { name: 'Cafes' }),
      shopping: await mk('/api/v1/admin/categories', { name: 'Shopping' }),
      cbd: await mk('/api/v1/admin/areas', { name: 'Melbourne CBD', eligibilitySource: 'council list' }),
      carlton: await mk('/api/v1/admin/areas', { name: 'Carlton', eligibilitySource: 'council list' }),
    };

    for (const [name, categoryId, areaId] of [
      ['Featured Cafe One', ids.cafes, ids.cbd],
      ['Featured Cafe Two', ids.cafes, ids.cbd],
      ['Featured Cafe Three', ids.cafes, ids.cbd],
      ['Featured Cafe Four', ids.cafes, ids.cbd],
      ['Ordinary Cafe', ids.cafes, ids.cbd],
      ['Carlton Shop', ids.shopping, ids.carlton],
      ['Draft Cafe', ids.cafes, ids.cbd],
    ] as const) {
      const created = await post('/api/v1/admin/businesses').send(listing(name, categoryId, areaId)).expect(201);
      businesses[name] = { id: created.body.data.id, version: created.body.data.version };
      if (name !== 'Draft Cafe') {
        const published = await post(`/api/v1/admin/businesses/${created.body.data.id}/publish`).send({ expectedVersion: created.body.data.version }).expect(200);
        businesses[name] = { id: created.body.data.id, version: published.body.data.version };
      }
    }
  });

  afterAll(async () => {
    await clearThrottleKeys(app);
    await app.close();
    await closeTestDatabase();
  });

  const feature = (name: string, position: number, extra: Record<string, unknown> = {}) =>
    post('/api/v1/admin/featured').send({ businessId: businesses[name]!.id, position, startsAt: new Date(Date.now() - 3_600_000).toISOString(), ...extra });

  it('shows at most three matching featured listings, excluded from the organic results and counts', async () => {
    const before = await agent().get('/api/v1/businesses?pageSize=50').expect(200);
    const totalBefore = before.body.meta.total;
    expect(before.body.meta.featured).toEqual([]);

    await feature('Featured Cafe One', 0).expect(201);
    await feature('Featured Cafe Two', 1).expect(201);
    await feature('Featured Cafe Three', 2).expect(201);
    await feature('Featured Cafe Four', 3).expect(201);

    const res = await agent().get('/api/v1/businesses?pageSize=50').expect(200);
    const featuredNames = res.body.meta.featured.map((card: { name: string }) => card.name);
    expect(featuredNames).toEqual(['Featured Cafe One', 'Featured Cafe Two', 'Featured Cafe Three']);
    // Excluded from the organic list, its total and therefore its pagination.
    expect(res.body.data.map((card: { name: string }) => card.name)).not.toEqual(expect.arrayContaining(featuredNames));
    expect(res.body.meta.total).toBe(totalBefore - 3);
  });

  it('keeps the same featured set across pages of one query and resets it when filters change', async () => {
    const pageOne = await agent().get('/api/v1/businesses?pageSize=1&page=1').expect(200);
    const pageTwo = await agent().get('/api/v1/businesses?pageSize=1&page=2').expect(200);
    expect(pageTwo.body.meta.featured.map((c: { id: string }) => c.id)).toEqual(pageOne.body.meta.featured.map((c: { id: string }) => c.id));

    // A filter that no featured listing matches leaves the block empty rather than padding it.
    const shopping = await agent().get('/api/v1/businesses?category=shopping').expect(200);
    expect(shopping.body.meta.featured).toEqual([]);
    expect(shopping.body.data.map((card: { name: string }) => card.name)).toEqual(['Carlton Shop']);

    // Featuring never bypasses the keyword match either.
    const keyword = await agent().get('/api/v1/businesses?q=Ordinary').expect(200);
    expect(keyword.body.meta.featured).toEqual([]);
  });

  it('never features an unpublished listing, and drops a placement whose window has closed', async () => {
    const draft = await feature('Draft Cafe', 0).expect(201);
    expect(draft.body.data.state).toBe('not-published');
    const res = await agent().get('/api/v1/businesses?pageSize=50').expect(200);
    expect(res.body.meta.featured.map((card: { name: string }) => card.name)).not.toContain('Draft Cafe');

    const expired = await post('/api/v1/admin/featured')
      .send({ businessId: businesses['Ordinary Cafe']!.id, position: 0, startsAt: new Date(Date.now() - 7_200_000).toISOString(), endsAt: new Date(Date.now() - 3_600_000).toISOString() })
      .expect(201);
    expect(expired.body.data.state).toBe('ended');
    const after = await agent().get('/api/v1/businesses?pageSize=50').expect(200);
    expect(after.body.meta.featured.map((card: { name: string }) => card.name)).not.toContain('Ordinary Cafe');
    await del(`/api/v1/admin/featured/${expired.body.data.id}`).expect(204);
  });

  it('validates the interval, refuses overlaps and unknown listings, and audits the change', async () => {
    const bad = await post('/api/v1/admin/featured')
      .send({ businessId: businesses['Carlton Shop']!.id, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() - 1000).toISOString() })
      .expect(400);
    expect(bad.body.error.fields.endsAt).toBeTruthy();

    const unknown = await post('/api/v1/admin/featured').send({ businessId: 'does-not-exist', startsAt: new Date().toISOString() }).expect(400);
    expect(unknown.body.error.fields.businessId).toBeTruthy();

    const overlap = await feature('Featured Cafe One', 0).expect(409);
    expect(overlap.body.error.code).toBe('PLACEMENT_OVERLAP');

    const list = await agent().get('/api/v1/admin/featured').set('Cookie', cookie).expect(200);
    expect(list.body.data.length).toBeGreaterThan(0);
    await agent().get('/api/v1/admin/featured').expect(401);
  });
});
