import type { INestApplication } from '@nestjs/common';
import { createDatabaseClient, type DatabaseClient } from '@melbourne-sphere/database';
import { createTestApp, type TestAppOptions } from '../create-test-app.js';
import { resolveTestDatabaseUrl } from './test-database-url.js';

/** Tables owned by the application (never `_prisma_migrations`). Extend as the schema grows. */
export const APPLICATION_TABLES = [
  'system_probes',
  'featured_placements',
  'static_pages',
  'idempotency_records',
  'redirects',
  'comments',
  'content_revisions',
  'post_tags',
  'posts',
  'blog_tags',
  'blog_categories',
  'author_links',
  'authors',
  'provider_message_events',
  'outbox_events',
  'enquiries',
  'abuse_reports',
  'reviews',
  'business_media',
  'media_variants',
  'media_assets',
  'business_ratings',
  'business_links',
  'hours_exceptions',
  'opening_intervals',
  'business_services',
  'business_categories',
  'business_addresses',
  'businesses',
  'service_synonyms',
  'services',
  'categories',
  'local_areas',
  'site_settings',
  'audit_logs',
  'admin_login_challenges',
  'admin_recovery_codes',
  'password_reset_tokens',
  'admin_sessions',
  'admin_roles',
  'role_permissions',
  'admin_users',
  'roles',
  'permissions',
] as const;

let client: DatabaseClient | undefined;

/** Direct database access for fixtures/assertions, separate from the app's own connection. */
export function testDatabase(): DatabaseClient {
  client ??= createDatabaseClient({ url: resolveTestDatabaseUrl(), connectionLimit: 2, allowPublicKeyRetrieval: true });
  return client;
}

/** Empties application tables between tests (test database only, guarded by name). */
export async function truncateApplicationTables(): Promise<void> {
  const db = testDatabase();
  // An interactive transaction pins one pooled connection, so the session-level
  // FOREIGN_KEY_CHECKS toggle applies to the TRUNCATE statements that follow.
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0');
    try {
      for (const table of APPLICATION_TABLES) {
        await tx.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\``);
      }
    } finally {
      await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1');
    }
  });
}

export async function closeTestDatabase(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}

/** The real application (same module and configureApp as main.ts) bound to the test database. */
export async function createIntegrationApp(options: TestAppOptions = {}): Promise<INestApplication> {
  return createTestApp(options);
}
