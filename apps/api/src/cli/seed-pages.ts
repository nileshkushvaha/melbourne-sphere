/**
 * Idempotent baseline content for the About page (SRS CFG 002).
 *
 * The row is created with the shipped copy only when it does not exist, and
 * published only when this run created it: an editor's later changes — and an
 * editor's decision to unpublish — are never overwritten by re-running the
 * seed. Nothing else is written; the policy pages carry the client's own
 * approved wording, which no script may invent.
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { CACHE_TAGS } from '@melbourne-sphere/domain';
import { AuditService } from '../audit/audit.service.js';
import { CacheService } from '../cache/cache.service.js';
import { DatabaseService } from '../database/database.service.js';
import { renderSanitisedBody, toPlainText } from '../blog/sanitise.js';
import { ABOUT_SEED } from '../settings/page-seed-content.js';
import { staticPageBlockers } from '../settings/static-pages.js';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'], abortOnError: false });
  try {
    const db = await app.get(DatabaseService).client();
    const existing = await db.staticPage.findUnique({ where: { slug: 'about' } });
    if (existing) {
      console.log(`[pages:seed] about already exists (status=${existing.status}, version=${existing.version}); nothing written`);
      return;
    }

    const sanitizedBody = renderSanitisedBody(ABOUT_SEED.body, 'html');
    const blockers = staticPageBlockers({ title: ABOUT_SEED.title, plainBody: toPlainText(sanitizedBody) });
    if (blockers.length > 0) {
      // The seed is held to the same publication gate as an editor.
      console.error(`[pages:seed] refusing to seed about: ${blockers.join('; ')}`);
      process.exitCode = 1;
      return;
    }

    const cache = app.get(CacheService);
    const row = await db.$transaction(async (tx) => {
      const created = await tx.staticPage.create({
        data: {
          slug: 'about',
          title: ABOUT_SEED.title,
          bodySource: ABOUT_SEED.body,
          bodyFormat: 'html',
          sanitizedBody,
          seoTitle: ABOUT_SEED.seoTitle,
          seoDescription: ABOUT_SEED.seoDescription,
          status: 'published',
          publishedAt: new Date(),
        },
      });
      // Publishing through the same invalidation pipeline an editor uses, so
      // the web tier drops its cached navigation instead of hiding the new page
      // for the rest of its revalidation window (SRS CACHE 001).
      await cache.recordInvalidation(tx, { resourceType: 'static_page', resourceId: created.id, tags: [CACHE_TAGS.pages, CACHE_TAGS.page('about')] });
      return created;
    });
    await cache.bumpNamespace();
    await app.get(AuditService).recordOrThrow({ action: 'settings.page.publish', targetType: 'static_page', targetId: row.id, metadata: { slug: 'about', source: 'pages:seed' } });
    console.log('[pages:seed] created and published the About page with the shipped baseline copy');
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(`[pages:seed] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
