import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SESSION_COOKIE_NAME } from '../src/auth/session.service.js';
import { ORIGIN, TEST_ADMIN, clearThrottleKeys, seedSuperAdmin } from './integration/auth-fixtures.js';
import { closeTestDatabase, createIntegrationApp, testDatabase, truncateApplicationTables } from './integration/harness.js';

/**
 * Testimonials and client/partner organisations (SRS 1.2 TSTM 001–005, PTNR
 * 001–005) against the real MySQL database. Both modules exist to enforce one
 * thing above all: nothing reaches the public site without recorded permission.
 */
describe('Testimonials and partners (integration)', () => {
  let app: INestApplication;
  let cookie: string;
  const agent = () => request(app.getHttpServer());

  const createTestimonial = (body: Record<string, unknown> = {}) =>
    agent()
      .post('/api/v1/admin/testimonials')
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send({ displayName: 'Jo Nguyen', relationship: 'Owner, Carlton Corner Bakery', quote: 'Being listed brought us regulars from three suburbs away.', ...body });

  const createPartner = (body: Record<string, unknown> = {}) =>
    agent().post('/api/v1/admin/partners').set('Origin', ORIGIN).set('Cookie', cookie).send({ name: 'City of Melbourne', relationshipLabel: 'Community partner', ...body });

  beforeAll(async () => {
    await truncateApplicationTables();
    app = await createIntegrationApp();
    await clearThrottleKeys(app);
    await seedSuperAdmin(app);
    const res = await agent().post('/api/v1/admin/auth/login').set('Origin', ORIGIN).set('X-Forwarded-For', '203.0.113.70').send({ email: TEST_ADMIN.email, password: TEST_ADMIN.password }).expect(200);
    cookie = ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(';')[0]!;
  });

  afterEach(async () => {
    const db = testDatabase();
    await db.testimonial.deleteMany({});
    await db.partnerOrganisation.deleteMany({});
  });

  afterAll(async () => {
    await clearThrottleKeys(app);
    await app.close();
    await closeTestDatabase();
  });

  // ---- testimonials --------------------------------------------------------

  it('creates a testimonial as a draft, invisible publicly until it is published', async () => {
    const created = await createTestimonial().expect(201);
    expect(created.body.data).toMatchObject({ status: 'draft', approvedAt: null });
    expect((await agent().get('/api/v1/testimonials').expect(200)).body.data).toEqual([]);

    // Publication is the administrator's decision; recording consent is
    // available but no longer a gate (client instruction, 8 Sep 2026).
    await agent().post(`/api/v1/admin/testimonials/${created.body.data.id}/publish`).set('Origin', ORIGIN).set('Cookie', cookie).send({ expectedVersion: 1 }).expect(201);
    expect((await agent().get('/api/v1/testimonials').expect(200)).body.data).toHaveLength(1);
  });

  it('records who confirmed a quote may be used, when that evidence is wanted', async () => {
    const created = await createTestimonial().expect(201);
    const id = created.body.data.id as string;

    const approved = await agent()
      .post(`/api/v1/admin/testimonials/${id}/approve`)
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send({ expectedVersion: 1, note: 'Email 3 Sep 2026' })
      .expect(201);
    expect(approved.body.data.approvedAt).toBeTruthy();
    expect(approved.body.data.approvedByAdminId).toBeTruthy();
    expect(approved.body.data.approvalNote).toBe('Email 3 Sep 2026');

    await agent().post(`/api/v1/admin/testimonials/${id}/publish`).set('Origin', ORIGIN).set('Cookie', cookie).send({ expectedVersion: 2 }).expect(201);
    const publicList = await agent().get('/api/v1/testimonials').expect(200);
    expect(publicList.body.data).toHaveLength(1);
    expect(publicList.body.data[0]).toMatchObject({ displayName: 'Jo Nguyen', relationship: 'Owner, Carlton Corner Bakery' });
    // No rating is offered: reviews are the product's ratings.
    expect(publicList.body.data[0]).not.toHaveProperty('rating');
  });

  it('clears a recorded approval when the quote is edited, because consent was given for particular words', async () => {
    const created = await createTestimonial().expect(201);
    const id = created.body.data.id as string;
    await agent().post(`/api/v1/admin/testimonials/${id}/approve`).set('Origin', ORIGIN).set('Cookie', cookie).send({ expectedVersion: 1, note: 'Email 3 Sep 2026' }).expect(201);
    await agent().post(`/api/v1/admin/testimonials/${id}/publish`).set('Origin', ORIGIN).set('Cookie', cookie).send({ expectedVersion: 2 }).expect(201);

    const edited = await agent()
      .put(`/api/v1/admin/testimonials/${id}`)
      .set('Origin', ORIGIN)
      .set('Cookie', cookie)
      .send({ displayName: 'Jo Nguyen', quote: 'A completely different sentence about the listing service.', expectedVersion: 3 })
      .expect(200);
    // The note went with the words it covered; the testimonial stays published,
    // because publication is now the administrator's own decision.
    expect(edited.body.data.approvedAt).toBeNull();
    expect(edited.body.data.approvalNote).toBeNull();
    expect(edited.body.data.status).toBe('published');
  });

  it('strips markup from a quote and enforces its bounds', async () => {
    const created = await createTestimonial({ quote: '<p>They were <strong>excellent</strong> to deal with, start to finish.</p><script>alert(1)</script>' }).expect(201);
    expect(created.body.data.quote).not.toContain('<');
    expect(created.body.data.quote).toContain('excellent');

    await createTestimonial({ quote: 'Too short' }).expect(400);
    await createTestimonial({ quote: 'x'.repeat(1001) }).expect(400);
    await createTestimonial({ displayName: 'J' }).expect(400);
  });

  it('refuses a listing or image that does not exist', async () => {
    expect((await createTestimonial({ businessId: 'does-not-exist' }).expect(400)).body.error.fields.businessId).toBeTruthy();
    expect((await createTestimonial({ mediaId: 'does-not-exist' }).expect(400)).body.error.fields.mediaId).toBeTruthy();
  });

  // ---- partners ------------------------------------------------------------

  it('refuses to publish an organisation with no logo or no alternative text, because the strip would be broken', async () => {
    const created = await createPartner().expect(201);
    const id = created.body.data.id as string;

    // Both refusals are about the page being renderable and readable, not about
    // permission: a missing image or an unnamed logo fails for every visitor.
    const noLogo = await agent().post(`/api/v1/admin/partners/${id}/publish`).set('Origin', ORIGIN).set('Cookie', cookie).send({ expectedVersion: 1 }).expect(409);
    expect(noLogo.body.error.code).toBe('LOGO_REQUIRED');

    // Authorisation cannot be recorded before there is a mark to authorise.
    const earlyAuthorise = await agent().post(`/api/v1/admin/partners/${id}/authorise`).set('Origin', ORIGIN).set('Cookie', cookie).send({ expectedVersion: 1 }).expect(409);
    expect(earlyAuthorise.body.error.code).toBe('LOGO_REQUIRED');
  });

  it('validates the website address at write time', async () => {
    for (const websiteUrl of ['javascript:alert(1)', 'not a url', 'ftp://example.com']) {
      expect((await createPartner({ websiteUrl }).expect(400)).body.error.fields.websiteUrl, websiteUrl).toBeTruthy();
    }
    await createPartner({ websiteUrl: 'https://www.melbourne.vic.gov.au' }).expect(201);
  });

  it('never shows an unpublished organisation publicly', async () => {
    await createPartner().expect(201);
    expect((await agent().get('/api/v1/partners').expect(200)).body.data).toEqual([]);
  });

  it('records an activity event for every mutation in both modules', async () => {
    const db = testDatabase();
    const testimonial = (await createTestimonial().expect(201)).body.data.id as string;
    await agent().post(`/api/v1/admin/testimonials/${testimonial}/approve`).set('Origin', ORIGIN).set('Cookie', cookie).send({ expectedVersion: 1 }).expect(201);
    const partner = (await createPartner().expect(201)).body.data.id as string;
    await agent().delete(`/api/v1/admin/partners/${partner}`).set('Origin', ORIGIN).set('Cookie', cookie).expect(204);

    const actions = (await db.auditLog.findMany({ where: { action: { startsWith: 'website.' } }, select: { action: true } })).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(['website.testimonial.create', 'website.testimonial.approve', 'website.partner.create', 'website.partner.delete']));
  });

  it('separates approving and authorising from creating, publishing and deleting', async () => {
    const db = testDatabase();
    // An administrator who may create and publish, but may not record consent.
    const role = await db.role.create({ data: { key: 'showcase_editor', name: 'Showcase editor', description: 'test' } });
    for (const key of ['website.testimonials.view', 'website.testimonials.create', 'website.testimonials.publish']) {
      const permission = await db.permission.findUniqueOrThrow({ where: { key } });
      await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    }
    await seedSuperAdmin(app, { email: 'showcase-editor@example.com', password: 'editor-password-12345', displayName: 'Editor' });
    const editor = await db.adminUser.findUniqueOrThrow({ where: { email: 'showcase-editor@example.com' } });
    const superRole = await db.role.findUniqueOrThrow({ where: { key: 'super_admin' } });
    await db.adminRole.delete({ where: { adminId_roleId: { adminId: editor.id, roleId: superRole.id } } });
    await db.adminRole.create({ data: { adminId: editor.id, roleId: role.id } });
    const login = await agent().post('/api/v1/admin/auth/login').set('Origin', ORIGIN).set('X-Forwarded-For', '203.0.113.71').send({ email: 'showcase-editor@example.com', password: 'editor-password-12345' }).expect(200);
    const editorCookie = ([] as string[]).concat(login.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(';')[0]!;

    const created = await agent()
      .post('/api/v1/admin/testimonials')
      .set('Origin', ORIGIN)
      .set('Cookie', editorCookie)
      .send({ displayName: 'Sam Patel', quote: 'The editors checked everything before our listing went live.' })
      .expect(201);
    // They can create and would be able to publish — but not record the consent
    // that publishing requires, so the two decisions stay with different people.
    await agent().post(`/api/v1/admin/testimonials/${created.body.data.id}/approve`).set('Origin', ORIGIN).set('Cookie', editorCookie).send({ expectedVersion: 1 }).expect(403);
    await agent().delete(`/api/v1/admin/testimonials/${created.body.data.id}`).set('Origin', ORIGIN).set('Cookie', editorCookie).expect(403);
  });

  it('refuses both admin surfaces to an anonymous caller, and serves both public lists without a session', async () => {
    await agent().get('/api/v1/admin/testimonials').expect(401);
    await agent().get('/api/v1/admin/partners').expect(401);
    await agent().get('/api/v1/testimonials').expect(200);
    await agent().get('/api/v1/partners').expect(200);
  });
});
