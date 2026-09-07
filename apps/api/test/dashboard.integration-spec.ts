import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SESSION_COOKIE_NAME } from '../src/auth/session.service.js';
import { SUPER_ADMIN_ROLE } from '../src/identity/permissions.js';
import { ORIGIN, TEST_ADMIN, clearThrottleKeys, seedSuperAdmin } from './integration/auth-fixtures.js';
import { closeTestDatabase, createIntegrationApp, testDatabase, truncateApplicationTables } from './integration/harness.js';

/** Dashboard aggregates (SRS ADM 003): permission-scoped counts, no private text. */
describe('Dashboard (integration)', () => {
  let app: INestApplication;
  let cookie: string;
  let limitedCookie: string;
  const agent = () => request(app.getHttpServer());
  const loginAs = async (email: string, password: string, ip: string) => {
    const res = await agent().post('/api/v1/admin/auth/login').set('Origin', ORIGIN).set('X-Forwarded-For', ip).send({ email, password }).expect(200);
    return ([] as string[]).concat(res.headers['set-cookie'] ?? []).find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`))!.split(';')[0]!;
  };

  beforeAll(async () => {
    await truncateApplicationTables();
    app = await createIntegrationApp();
    await clearThrottleKeys(app);
    await seedSuperAdmin(app);
    cookie = await loginAs(TEST_ADMIN.email, TEST_ADMIN.password, '203.0.113.210');

    // An administrator with listings.read only: the dashboard must show that metric and nothing else.
    const db = testDatabase();
    const role = await db.role.create({ data: { key: 'dashboard_limited', name: 'Limited', description: 'test' } });
    const permission = await db.permission.findUniqueOrThrow({ where: { key: 'listings.read' } });
    await db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
    await seedSuperAdmin(app, { email: 'limited-dashboard@example.com', password: 'limited-password-12345', displayName: 'Limited' });
    const limited = await db.adminUser.findUniqueOrThrow({ where: { email: 'limited-dashboard@example.com' } });
    const superRole = await db.role.findUniqueOrThrow({ where: { key: SUPER_ADMIN_ROLE.key } });
    await db.adminRole.delete({ where: { adminId_roleId: { adminId: limited.id, roleId: superRole.id } } });
    await db.adminRole.create({ data: { adminId: limited.id, roleId: role.id } });
    limitedCookie = await loginAs('limited-dashboard@example.com', 'limited-password-12345', '203.0.113.211');
  });

  afterAll(async () => {
    await clearThrottleKeys(app);
    await app.close();
    await closeTestDatabase();
  });

  it('returns every metric a Super Admin may act on, plus recent audit activity', async () => {
    const res = await agent().get('/api/v1/admin/dashboard').set('Cookie', cookie).expect(200);
    const keys = res.body.data.metrics.map((metric: { key: string }) => metric.key);
    expect(keys).toEqual(expect.arrayContaining(['pendingReviews', 'pendingComments', 'openReports', 'failedEnquiries', 'draftListings', 'quarantinedMedia', 'duePosts']));
    expect(res.body.data.activity.length).toBeGreaterThan(0);
    // Audit entries carry an action and an actor, never message content.
    expect(Object.keys(res.body.data.activity[0])).toEqual(['id', 'action', 'actorName', 'targetType', 'createdAt']);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('hides metrics the caller has no permission for, and refuses anonymous callers', async () => {
    const res = await agent().get('/api/v1/admin/dashboard').set('Cookie', limitedCookie).expect(200);
    const keys = res.body.data.metrics.map((metric: { key: string }) => metric.key);
    expect(keys).toEqual(['draftListings']);
    expect(res.body.data.activity).toEqual([]);
    expect(res.body.data.scheduledPosts).toEqual([]);
    await agent().get('/api/v1/admin/dashboard').expect(401);
  });
});
