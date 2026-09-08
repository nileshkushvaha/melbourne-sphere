import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { StaticPage } from '@melbourne-sphere/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../auth/auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { renderSanitisedBody, toPlainText } from '../blog/sanitise.js';
import { CacheService } from '../cache/cache.service.js';
import { CACHE_TAGS } from '@melbourne-sphere/domain';
import {
  CUSTOM_PAGE_PURPOSE,
  SYSTEM_PAGES,
  isSystemPage,
  normalisePageSlug,
  pageSlugProblem,
  staticPageBlockers,
  systemPageDefinition,
  type StaticPageDefinition,
} from './static-pages.js';
import type { CreateStaticPageDto, PublicStaticPageDto, PublicStaticPageSummaryDto, StaticPageDto, StaticPageStateDto, UpdateStaticPageDto } from './dto/static-page.dto.js';

const notFound = () => new NotFoundException({ code: 'NOT_FOUND', message: 'Page not found' });
const slugRejected = (message: string) =>
  new HttpException({ code: 'VALIDATION_ERROR', message: 'Some fields are invalid', fields: { slug: [message] } }, HttpStatus.BAD_REQUEST);
const stale = () => new ConflictException({ code: 'STALE_VERSION', message: 'This page was changed by someone else. Reload and try again.' });

/**
 * Editable information pages (SRS CFG 002, as amended in 1.7).
 *
 * System pages come from the registry and always appear, whether or not anyone
 * has written them yet; custom pages are rows an administrator created. Both
 * carry the same content rules — sanitised rich text, a revision of the
 * previous published text on every edit, and a publication gate that refuses
 * stub or placeholder copy — and differ only in what may be done to the record
 * itself: a system page cannot be created, renamed or deleted, because the
 * product links to it by address.
 */
@Injectable()
export class StaticPagesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  /**
   * The system pages first, in registry order and including ones never edited
   * yet, then the administrator's own pages, newest first.
   */
  async list(): Promise<StaticPageDto[]> {
    const db = await this.database.client();
    const rows = await db.staticPage.findMany({ orderBy: { updatedAt: 'desc' } });
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    return [
      ...SYSTEM_PAGES.map((definition) => this.toDto(definition.slug, bySlug.get(definition.slug))),
      ...rows.filter((row) => !isSystemPage(row.slug)).map((row) => this.toDto(row.slug, row)),
    ];
  }

  async get(slug: string): Promise<StaticPageDto> {
    const db = await this.database.client();
    const row = await db.staticPage.findUnique({ where: { slug } });
    // A system page exists as soon as the registry names it; a custom page
    // exists only once someone created it.
    if (!row && !isSystemPage(slug)) throw notFound();
    return this.toDto(slug, row ?? undefined);
  }

  /**
   * Creates a page at an address the administrator chose (CFG 002, SRS 1.7).
   *
   * The address is validated here rather than trusted: the pattern, the
   * reserved list and the uniqueness check together are what replaced the old
   * closed slug set. It is created as a draft, like every other page — nothing
   * reaches the public site without the publication gate.
   */
  async create(input: CreateStaticPageDto, actor: AdminPrincipal, ctx: RequestContext): Promise<StaticPageDto> {
    const slug = normalisePageSlug(input.slug);
    const problem = pageSlugProblem(slug);
    if (problem) throw slugRejected(problem);

    const db = await this.database.client();
    if (await db.staticPage.findUnique({ where: { slug }, select: { id: true } })) {
      throw slugRejected('A page already uses that address');
    }

    const bodyFormat = input.bodyFormat ?? 'html';
    const row = await db.staticPage.create({
      data: {
        slug,
        title: input.title,
        bodySource: input.body,
        bodyFormat,
        sanitizedBody: renderSanitisedBody(input.body, bodyFormat),
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        updatedByAdminId: actor.id,
      },
    });
    await this.audit.record({
      action: 'settings.page.create',
      actorAdminId: actor.id,
      targetType: 'static_page',
      targetId: row.id,
      metadata: { slug },
      requestId: ctx.requestId,
      ipAddress: ctx.ip,
    });
    return this.toDto(slug, row);
  }

  /**
   * Deletes a page an administrator created (SRS 1.7).
   *
   * Two refusals, for two different reasons: a system page is referred to by
   * the product itself, and a published page is an address somebody may have
   * linked to — unpublishing first turns that into a deliberate 404 the
   * administrator chose, rather than one they discovered later.
   */
  async remove(slug: string, actor: AdminPrincipal, ctx: RequestContext): Promise<void> {
    if (isSystemPage(slug)) {
      throw new ConflictException({ code: 'PAGE_IS_SYSTEM', message: 'This page is part of the product and cannot be deleted. Unpublish it instead.' });
    }
    const db = await this.database.client();
    const row = await db.staticPage.findUnique({ where: { slug } });
    if (!row) throw notFound();
    if (row.status === 'published') {
      throw new ConflictException({ code: 'PAGE_PUBLISHED', message: 'Unpublish this page first, so its address stops being served before the content goes.' });
    }

    await db.$transaction(async (tx) => {
      // Revisions are the record of what was published; they go with the page
      // they describe rather than being left pointing at nothing.
      await tx.contentRevision.deleteMany({ where: { resourceType: 'static_page', resourceId: row.id } });
      await tx.staticPage.delete({ where: { slug } });
    });
    await this.audit.record({
      action: 'settings.page.delete',
      actorAdminId: actor.id,
      targetType: 'static_page',
      targetId: row.id,
      metadata: { slug, title: row.title },
      requestId: ctx.requestId,
      ipAddress: ctx.ip,
    });
  }

  /** Published page for the public site; drafts are invisible (404). */
  async publicPage(slug: string): Promise<PublicStaticPageDto> {
    const db = await this.database.client();
    const row = await db.staticPage.findFirst({ where: { slug, status: 'published' } });
    if (!row) throw notFound();
    return {
      slug: row.slug,
      title: row.title,
      body: row.sanitizedBody,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** Published pages only, for the footer; nothing that would link to a 404. */
  async publicList(): Promise<PublicStaticPageSummaryDto[]> {
    const db = await this.database.client();
    const rows = await db.staticPage.findMany({ where: { status: 'published' }, select: { slug: true, title: true }, orderBy: { title: 'asc' } });
    // System pages in registry order first, then the administrator's own pages
    // alphabetically, so the footer has a stable shape as pages are added.
    const order = SYSTEM_PAGES.map((page) => page.slug);
    return [...rows.filter((row) => order.includes(row.slug)).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug)), ...rows.filter((row) => !order.includes(row.slug))];
  }

  async update(slug: string, input: UpdateStaticPageDto, actor: AdminPrincipal, ctx: RequestContext): Promise<StaticPageDto> {
    const db = await this.database.client();
    const current = await db.staticPage.findUnique({ where: { slug } });
    // Writing a system page for the first time creates it; writing an address
    // nobody created is a 404 rather than a second way to create a page.
    if (!current && !isSystemPage(slug)) throw notFound();
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
    return this.toDto(slug, row);
  }

  async setStatus(slug: string, status: 'published' | 'draft', input: StaticPageStateDto, actor: AdminPrincipal, ctx: RequestContext): Promise<StaticPageDto> {
    const db = await this.database.client();
    const current = await db.staticPage.findUnique({ where: { slug } });
    if (!current) throw notFound();
    if (current.version !== input.expectedVersion) throw stale();
    if (status === 'published') {
      const blockers = this.blockersFor(current);
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
    return this.toDto(slug, row);
  }

  private blockersFor(row: StaticPage): string[] {
    return staticPageBlockers({ title: row.title, plainBody: toPlainText(row.sanitizedBody) });
  }

  private toDto(slug: string, row?: StaticPage): StaticPageDto {
    const definition: StaticPageDefinition = systemPageDefinition(slug) ?? { slug, defaultTitle: slug, purpose: CUSTOM_PAGE_PURPOSE, template: 'generic' };
    const system = isSystemPage(slug);
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
        publishedAt: null,
        publicationBlockers: staticPageBlockers({ title: definition.defaultTitle, plainBody: '' }),
        purpose: definition.purpose,
        template: definition.template,
        isSystem: system,
        canDelete: false,
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
      publishedAt: row.publishedAt?.toISOString() ?? null,
      publicationBlockers: this.blockersFor(row),
      purpose: definition.purpose,
      template: definition.template,
      isSystem: system,
      // Deletable once it is nobody's live address any more (SRS 1.7).
      canDelete: !system && row.status !== 'published',
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
      updatedByAdminId: row.updatedByAdminId,
    };
  }
}
