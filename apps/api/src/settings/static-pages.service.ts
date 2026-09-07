import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, StaticPage } from '@melbourne-sphere/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../auth/auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { renderSanitisedBody, toPlainText } from '../blog/sanitise.js';
import { CacheService } from '../cache/cache.service.js';
import { CACHE_TAGS } from '@melbourne-sphere/domain';
import { STATIC_PAGES, staticPageBlockers, staticPageDefinition, type StaticPageSlug } from './static-pages.js';
import type { PublicStaticPageDto, PublicStaticPageSummaryDto, StaticPageDto, StaticPageStateDto, UpdateStaticPageDto } from './dto/static-page.dto.js';

const notFound = () => new NotFoundException({ code: 'NOT_FOUND', message: 'Page not found' });
const stale = () => new ConflictException({ code: 'STALE_VERSION', message: 'This page was changed by someone else. Reload and try again.' });

/**
 * Editable information pages (SRS CFG 002): fixed slugs, sanitised rich
 * content, revisions on every change to published text, and a publication gate
 * that refuses stub or placeholder copy and unvalidated contact routing.
 */
@Injectable()
export class StaticPagesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  /** Every page in the fixed set, including ones never edited yet. */
  async list(): Promise<StaticPageDto[]> {
    const db = await this.database.client();
    const rows = await db.staticPage.findMany();
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    return STATIC_PAGES.map((definition) => this.toDto(definition.slug, bySlug.get(definition.slug)));
  }

  async get(slug: string): Promise<StaticPageDto> {
    const definition = staticPageDefinition(slug);
    if (!definition) throw notFound();
    const db = await this.database.client();
    const row = await db.staticPage.findUnique({ where: { slug } });
    return this.toDto(definition.slug, row ?? undefined);
  }

  /** Published page for the public site; drafts are invisible (404). */
  async publicPage(slug: string): Promise<PublicStaticPageDto> {
    const definition = staticPageDefinition(slug);
    if (!definition) throw notFound();
    const db = await this.database.client();
    const row = await db.staticPage.findFirst({ where: { slug, status: 'published' } });
    if (!row) throw notFound();
    return {
      slug: row.slug,
      title: row.title,
      body: row.sanitizedBody,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      contactEmail: definition.routesContact ? row.contactEmail : null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Published pages only, for the footer; nothing that would link to a 404. */
  async publicList(): Promise<PublicStaticPageSummaryDto[]> {
    const db = await this.database.client();
    const rows = await db.staticPage.findMany({ where: { status: 'published' }, select: { slug: true, title: true } });
    const order = STATIC_PAGES.map((page) => page.slug as string);
    return rows.sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  }

  async update(slug: string, input: UpdateStaticPageDto, actor: AdminPrincipal, ctx: RequestContext): Promise<StaticPageDto> {
    const definition = staticPageDefinition(slug);
    if (!definition) throw notFound();
    const db = await this.database.client();
    const current = await db.staticPage.findUnique({ where: { slug } });
    if ((current?.version ?? 0) !== input.expectedVersion) throw stale();

    const bodyFormat = input.bodyFormat ?? current?.bodyFormat ?? 'html';
    const sanitizedBody = renderSanitisedBody(input.body, bodyFormat);
    const data = {
      title: input.title,
      bodySource: input.body,
      bodyFormat,
      sanitizedBody,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      contactEmail: definition.routesContact ? (input.contactEmail ?? null) : null,
      updatedByAdminId: actor.id,
    };

    const row = await db.$transaction(async (tx) => {
      if (!current) return tx.staticPage.create({ data: { slug, ...data } });
      const updated = await tx.staticPage.updateMany({ where: { slug, version: input.expectedVersion }, data: { ...data, version: { increment: 1 } } });
      if (updated.count !== 1) throw stale();
      // Editing a live page keeps the previous published text (SRS CFG 002 revisions).
      if (current.status === 'published') {
        await tx.contentRevision.create({
          data: { resourceType: 'static_page', resourceId: current.id, version: current.version, sanitizedSnapshot: current.sanitizedBody, title: current.title, reason: input.revisionReason ?? null, actorAdminId: actor.id },
        });
      }
      if (current.status === 'published') {
        await this.cache.recordInvalidation(tx, { resourceType: 'static_page', resourceId: current.id, correlationId: ctx.requestId, tags: [CACHE_TAGS.pages, CACHE_TAGS.page(slug)] });
      }
      return tx.staticPage.findUniqueOrThrow({ where: { slug } });
    });
    await this.cache.bumpNamespace();

    await this.audit.record({ action: 'settings.page.update', actorAdminId: actor.id, targetType: 'static_page', targetId: row.id, reason: input.revisionReason ?? null, metadata: { slug }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toDto(definition.slug, row);
  }

  async setStatus(slug: string, status: 'published' | 'draft', input: StaticPageStateDto, actor: AdminPrincipal, ctx: RequestContext): Promise<StaticPageDto> {
    const definition = staticPageDefinition(slug);
    if (!definition) throw notFound();
    const db = await this.database.client();
    const current = await db.staticPage.findUnique({ where: { slug } });
    if (!current) throw notFound();
    if (current.version !== input.expectedVersion) throw stale();
    if (status === 'published') {
      const blockers = this.blockersFor(current, definition.routesContact);
      if (blockers.length > 0) {
        throw new HttpException({ code: 'PUBLICATION_BLOCKED', message: 'This page is not ready to publish', fields: { publication: blockers } }, HttpStatus.CONFLICT);
      }
    }
    await db.$transaction(async (tx) => {
      const updated = await tx.staticPage.updateMany({
        where: { slug, version: input.expectedVersion },
        data: { status, publishedAt: status === 'published' ? new Date() : null, updatedByAdminId: actor.id, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw stale();
      await this.cache.recordInvalidation(tx, {
        resourceType: 'static_page',
        resourceId: current.id,
        urgent: status !== 'published',
        correlationId: ctx.requestId,
        tags: [CACHE_TAGS.pages, CACHE_TAGS.page(slug)],
      });
    });
    await this.cache.bumpNamespace();
    await this.audit.record({ action: status === 'published' ? 'settings.page.publish' : 'settings.page.unpublish', actorAdminId: actor.id, targetType: 'static_page', targetId: current.id, reason: input.reason ?? null, metadata: { slug }, requestId: ctx.requestId, ipAddress: ctx.ip });
    const row = await db.staticPage.findUniqueOrThrow({ where: { slug } });
    return this.toDto(definition.slug, row);
  }

  private blockersFor(row: StaticPage, routesContact?: boolean): string[] {
    return staticPageBlockers({ title: row.title, plainBody: toPlainText(row.sanitizedBody), contactEmail: row.contactEmail, routesContact });
  }

  private toDto(slug: StaticPageSlug, row?: StaticPage): StaticPageDto {
    const definition = staticPageDefinition(slug)!;
    if (!row) {
      return {
        slug,
        title: definition.defaultTitle,
        sanitizedBody: '',
        bodySource: '',
        bodyFormat: 'html',
        seoTitle: null,
        seoDescription: null,
        status: 'draft',
        contactEmail: null,
        publishedAt: null,
        publicationBlockers: staticPageBlockers({ title: definition.defaultTitle, plainBody: '', routesContact: definition.routesContact }),
        purpose: definition.purpose,
        version: 0,
        updatedAt: new Date(0).toISOString(),
        updatedByAdminId: null,
      };
    }
    return {
      slug: row.slug,
      title: row.title,
      sanitizedBody: row.sanitizedBody,
      bodySource: row.bodySource,
      bodyFormat: row.bodyFormat,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      status: row.status,
      contactEmail: row.contactEmail,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publicationBlockers: this.blockersFor(row, definition.routesContact),
      purpose: definition.purpose,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      updatedByAdminId: row.updatedByAdminId,
    };
  }
}
