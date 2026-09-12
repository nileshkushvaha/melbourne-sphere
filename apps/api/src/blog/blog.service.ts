import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { BlogCategory, BlogTag, Prisma } from '@melbourne-sphere/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../auth/auth.service.js';
import { collectionMeta, skipFor } from '../common/pagination.js';
import { isValidSlug, slugify } from '../common/slug.js';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { RedirectsService } from '../seo/redirects.service.js';
import type { ChangeSlugDto } from '../seo/dto/redirect.dto.js';
import { POST_TRANSITIONS, postPublicationBlockers, scheduleBlockers, type PostAction } from './post-rules.js';
import { renderSanitisedBody, sanitiseHtmlFragment } from './sanitise.js';
import { validateAuthorLinks, validateExpertise, validatePublicEmail, type NormalisedAuthorLink } from './author-rules.js';
import { validatePublicUrl } from '../directory/business-rules.js';
import { MediaService } from '../media/media.service.js';
import { CacheService } from '../cache/cache.service.js';
import { CACHE_TAGS } from '@melbourne-sphere/domain';
import type {
  AuthorDto,
  AuthorInputDto,
  BlogTermDto,
  BlogTermInputDto,
  CreatePostDto,
  ListPostsQueryDto,
  PostDto,
  PostPreviewDto,
  PostRevisionDto,
  PostStateDto,
  PostSummaryDto,
  SchedulePostDto,
  UpdateAuthorDto,
  UpdateBlogTermDto,
  UpdatePostDto,
} from './dto/blog.dto.js';

const notFound = (what = 'Post') => new NotFoundException({ code: 'NOT_FOUND', message: `${what} not found` });
const stale = () => new ConflictException({ code: 'STALE_VERSION', message: 'This item was changed by someone else. Reload and try again.' });
const slugTaken = () => new ConflictException({ code: 'SLUG_IN_USE', message: 'That slug is already used', fields: { slug: ['That slug is already used'] } });
const validation = (field: string, message: string) => new HttpException({ code: 'VALIDATION_ERROR', message, fields: { [field]: [message] } }, HttpStatus.BAD_REQUEST);

/** Author profile with its links, counts and published-article count. */
const authorInclude = {
  links: { orderBy: { sortOrder: 'asc' } },
  posts: { where: { status: 'published' }, select: { id: true } },
  _count: { select: { posts: true } },
} satisfies Prisma.AuthorInclude;

type AuthorRow = Prisma.AuthorGetPayload<{ include: typeof authorInclude }>;

/** Optional profile columns, shaped so the same object works for create and update. */
type AuthorProfileData = Partial<{
  role: string | null;
  shortBio: string | null;
  bio: string | null;
  pronouns: string | null;
  location: string | null;
  publicEmail: string | null;
  websiteUrl: string | null;
  expertise: string[];
  imageMediaId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
}>;

const postInclude = {
  author: { select: { id: true, displayName: true, active: true } },
  category: { select: { id: true, name: true, active: true } },
  tags: { select: { tagId: true } },
} as const;

type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;
export type TermKind = 'category' | 'tag';

/**
 * Editorial content (SRS BLOG 001–003). Bodies are authored as Markdown and
 * stored with their sanitised HTML; publication is an explicit, gated,
 * transactional action that also writes the outbox event used for cache
 * invalidation.
 */
@Injectable()
export class BlogService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly redirects: RedirectsService,
    private readonly media: MediaService,
    private readonly cache: CacheService,
  ) {}

  // ---- authors -------------------------------------------------------------

  async listAuthors(query: { q?: string; status?: 'active' | 'inactive' } = {}): Promise<AuthorDto[]> {
    const db = await this.database.client();
    // Narrowed in the query: the screen filtered the whole list in the browser,
    // which is fine for six authors and wrong for six hundred.
    const where = {
      ...(query.q ? { OR: [{ displayName: { contains: query.q } }, { role: { contains: query.q } }] } : {}),
      ...(query.status ? { active: query.status === 'active' } : {}),
    };
    const rows = await db.author.findMany({ where, orderBy: [{ displayName: 'asc' }, { id: 'asc' }], include: authorInclude });
    return Promise.all(rows.map((row) => this.toAuthorDto(row)));
  }

  async getAuthor(id: string): Promise<AuthorDto> {
    const db = await this.database.client();
    const row = await db.author.findUnique({ where: { id }, include: authorInclude });
    if (!row) throw notFound('Author');
    return this.toAuthorDto(row);
  }

  async createAuthor(input: AuthorInputDto, actor: AdminPrincipal, ctx: RequestContext): Promise<AuthorDto> {
    const db = await this.database.client();
    const slug = input.slug ?? slugify(input.displayName);
    if (!isValidSlug(slug)) throw validation('slug', 'Slug must be lowercase letters, numbers and single hyphens');
    if (await db.author.findUnique({ where: { slug } })) throw slugTaken();
    const profile = await this.authorProfileData(input);
    const row = await db.$transaction(async (tx) => {
      const created = await tx.author.create({ data: { displayName: input.displayName, slug, ...profile.data } });
      if (profile.links.length > 0) await tx.authorLink.createMany({ data: profile.links.map((link) => ({ authorId: created.id, ...link })) });
      return tx.author.findUniqueOrThrow({ where: { id: created.id }, include: authorInclude });
    });
    await this.audit.record({ action: 'blog.author.create', actorAdminId: actor.id, targetType: 'author', targetId: row.id, metadata: { slug }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toAuthorDto(row);
  }

  async updateAuthor(id: string, input: UpdateAuthorDto, actor: AdminPrincipal, ctx: RequestContext): Promise<AuthorDto> {
    const db = await this.database.client();
    const current = await db.author.findUnique({ where: { id } });
    if (!current) throw notFound('Author');
    if (current.version !== input.expectedVersion) throw stale();
    if (input.slug && input.slug !== current.slug) {
      if (!isValidSlug(input.slug)) throw validation('slug', 'Slug must be lowercase letters, numbers and single hyphens');
      if (await db.author.findUnique({ where: { slug: input.slug } })) throw slugTaken();
    }
    const profile = await this.authorProfileData(input);
    const row = await db.$transaction(async (tx) => {
      const updated = await tx.author.updateMany({
        where: { id, version: input.expectedVersion },
        data: { displayName: input.displayName, ...(input.slug ? { slug: input.slug } : {}), ...profile.data, version: { increment: 1 } },
      });
      if (updated.count !== 1) throw stale();
      if (input.links !== undefined) {
        await tx.authorLink.deleteMany({ where: { authorId: id } });
        if (profile.links.length > 0) await tx.authorLink.createMany({ data: profile.links.map((link) => ({ authorId: id, ...link })) });
      }
      return tx.author.findUniqueOrThrow({ where: { id }, include: authorInclude });
    });
    await this.audit.record({ action: 'blog.author.update', actorAdminId: actor.id, targetType: 'author', targetId: id, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toAuthorDto(row);
  }

  async setAuthorActive(id: string, active: boolean, expectedVersion: number, actor: AdminPrincipal, ctx: RequestContext): Promise<AuthorDto> {
    const db = await this.database.client();
    const current = await db.author.findUnique({ where: { id } });
    if (!current) throw notFound('Author');
    if (current.version !== expectedVersion) throw stale();
    if (!active) {
      const inUse = await db.post.count({ where: { authorId: id, status: { not: 'archived' } } });
      if (inUse > 0) throw new ConflictException({ code: 'TERM_IN_USE', message: `Cannot deactivate: ${inUse} live article(s) still credit this author.` });
    }
    const updated = await db.author.updateMany({ where: { id, version: expectedVersion }, data: { active, version: { increment: 1 } } });
    if (updated.count !== 1) throw stale();
    await this.audit.record({ action: active ? 'blog.author.activate' : 'blog.author.deactivate', actorAdminId: actor.id, targetType: 'author', targetId: id, requestId: ctx.requestId, ipAddress: ctx.ip });
    const row = await db.author.findUniqueOrThrow({ where: { id }, include: authorInclude });
    return this.toAuthorDto(row);
  }

  /**
   * Validates and normalises the optional profile fields. The long bio goes
   * through the editorial allowlist, so an author profile can never introduce
   * script or style content into a public page or an admin preview (SEC 001).
   */
  private async authorProfileData(input: AuthorInputDto): Promise<{ data: AuthorProfileData; links: NormalisedAuthorLink[] }> {
    const fields: Record<string, string[]> = {};
    const email = validatePublicEmail(input.publicEmail);
    if (!email.ok) fields.publicEmail = ['Enter a valid email address'];
    let websiteUrl: string | null = null;
    if (input.websiteUrl) {
      websiteUrl = validatePublicUrl(input.websiteUrl);
      if (!websiteUrl) fields.websiteUrl = ['Website must be a full http(s) URL without credentials'];
    }
    const expertise = validateExpertise(input.expertise);
    Object.assign(fields, expertise.errors);
    const links = validateAuthorLinks((input.links ?? []) as never);
    Object.assign(fields, links.errors);
    if (Object.keys(fields).length > 0) throw new HttpException({ code: 'VALIDATION_ERROR', message: 'Some fields are invalid', fields }, HttpStatus.BAD_REQUEST);
    if (input.imageMediaId) await this.media.assertUsableImage(input.imageMediaId);

    const data: AuthorProfileData = {};
    if (input.role !== undefined) data.role = input.role ?? null;
    if (input.shortBio !== undefined) data.shortBio = input.shortBio ?? null;
    if (input.bio !== undefined) data.bio = input.bio ? sanitiseHtmlFragment(input.bio) : null;
    if (input.pronouns !== undefined) data.pronouns = input.pronouns ?? null;
    if (input.location !== undefined) data.location = input.location ?? null;
    if (input.publicEmail !== undefined) data.publicEmail = email.normalised;
    if (input.websiteUrl !== undefined) data.websiteUrl = websiteUrl;
    if (input.expertise !== undefined) data.expertise = expertise.normalised;
    if (input.imageMediaId !== undefined) data.imageMediaId = input.imageMediaId ?? null;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle ?? null;
    if (input.seoDescription !== undefined) data.seoDescription = input.seoDescription ?? null;
    return { data, links: links.normalised };
  }

  // ---- categories and tags --------------------------------------------------

  async listTerms(kind: TermKind, query: { q?: string; status?: 'active' | 'inactive' } = {}): Promise<BlogTermDto[]> {
    const db = await this.database.client();
    // Narrowed in the query rather than after it, so the screen stays usable as
    // the tag list grows with the writing.
    const where = {
      ...(query.q ? { OR: [{ name: { contains: query.q } }, { slug: { contains: query.q } }] } : {}),
      ...(query.status ? { active: query.status === 'active' } : {}),
    };
    if (kind === 'category') {
      const rows = await db.blogCategory.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { posts: true } } } });
      return rows.map((row) => this.toTermDto(row, row._count.posts));
    }
    const rows = await db.blogTag.findMany({ where, orderBy: [{ name: 'asc' }], include: { _count: { select: { posts: true } } } });
    return rows.map((row) => this.toTermDto(row, row._count.posts));
  }

  async createTerm(kind: TermKind, input: BlogTermInputDto, actor: AdminPrincipal, ctx: RequestContext): Promise<BlogTermDto> {
    const db = await this.database.client();
    const slug = input.slug ?? slugify(input.name);
    if (!isValidSlug(slug)) throw validation('slug', 'Slug must be lowercase letters, numbers and single hyphens');
    const landingContent = input.landingContent ? renderSanitisedBody(input.landingContent) : null;
    if (kind === 'category') {
      if (await db.blogCategory.findUnique({ where: { slug } })) throw slugTaken();
      const row = await db.blogCategory.create({ data: { name: input.name, slug, landingContent } });
      await this.audit.record({ action: 'blog.category.create', actorAdminId: actor.id, targetType: 'blog_category', targetId: row.id, requestId: ctx.requestId, ipAddress: ctx.ip });
      return this.toTermDto(row, 0);
    }
    if (await db.blogTag.findUnique({ where: { slug } })) throw slugTaken();
    const row = await db.blogTag.create({ data: { name: input.name, slug, landingContent } });
    await this.audit.record({ action: 'blog.tag.create', actorAdminId: actor.id, targetType: 'blog_tag', targetId: row.id, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toTermDto(row, 0);
  }

  async updateTerm(kind: TermKind, id: string, input: UpdateBlogTermDto, actor: AdminPrincipal, ctx: RequestContext): Promise<BlogTermDto> {
    const db = await this.database.client();
    const model = kind === 'category' ? db.blogCategory : db.blogTag;
    const current = await (model as typeof db.blogTag).findUnique({ where: { id } });
    if (!current) throw notFound(kind === 'category' ? 'Category' : 'Tag');
    if (current.version !== input.expectedVersion) throw stale();
    if (input.slug && input.slug !== current.slug) {
      if (!isValidSlug(input.slug)) throw validation('slug', 'Slug must be lowercase letters, numbers and single hyphens');
      const clash = await (model as typeof db.blogTag).findUnique({ where: { slug: input.slug } });
      if (clash) throw slugTaken();
    }
    const data = { name: input.name, ...(input.slug ? { slug: input.slug } : {}), landingContent: input.landingContent ? renderSanitisedBody(input.landingContent) : null, version: { increment: 1 } };
    const updated = await (model as typeof db.blogTag).updateMany({ where: { id, version: input.expectedVersion }, data });
    if (updated.count !== 1) throw stale();
    await this.audit.record({ action: `blog.${kind}.update`, actorAdminId: actor.id, targetType: `blog_${kind}`, targetId: id, requestId: ctx.requestId, ipAddress: ctx.ip });
    return (await this.listTerms(kind)).find((t) => t.id === id)!;
  }

  async setTermActive(kind: TermKind, id: string, active: boolean, expectedVersion: number, actor: AdminPrincipal, ctx: RequestContext): Promise<BlogTermDto> {
    const db = await this.database.client();
    const model = kind === 'category' ? db.blogCategory : db.blogTag;
    const current = await (model as typeof db.blogTag).findUnique({ where: { id } });
    if (!current) throw notFound(kind === 'category' ? 'Category' : 'Tag');
    if (current.version !== expectedVersion) throw stale();
    if (!active) {
      const inUse = kind === 'category'
        ? await db.post.count({ where: { categoryId: id, status: { not: 'archived' } } })
        : await db.postTag.count({ where: { tagId: id, post: { status: { not: 'archived' } } } });
      if (inUse > 0) throw new ConflictException({ code: 'TERM_IN_USE', message: `Cannot deactivate: ${inUse} live article(s) still use this term.` });
    }
    const updated = await (model as typeof db.blogTag).updateMany({ where: { id, version: expectedVersion }, data: { active, version: { increment: 1 } } });
    if (updated.count !== 1) throw stale();
    await this.audit.record({ action: `blog.${kind}.${active ? 'activate' : 'deactivate'}`, actorAdminId: actor.id, targetType: `blog_${kind}`, targetId: id, requestId: ctx.requestId, ipAddress: ctx.ip });
    return (await this.listTerms(kind)).find((t) => t.id === id)!;
  }

  // ---- posts ----------------------------------------------------------------

  async listPosts(query: ListPostsQueryDto): Promise<{ data: PostSummaryDto[]; meta: ReturnType<typeof collectionMeta> }> {
    const db = await this.database.client();
    const where: Prisma.PostWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.authorId ? { authorId: query.authorId } : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
      ...(query.q ? { OR: [{ title: { contains: query.q } }, { slug: { contains: query.q } }] } : {}),
    };
    const orderBy: Prisma.PostOrderByWithRelationInput[] = [{ [query.sort]: query.order } as Prisma.PostOrderByWithRelationInput, { id: 'asc' }];
    const [rows, total] = await Promise.all([
      db.post.findMany({ where, orderBy, skip: skipFor(query.page, query.pageSize), take: query.pageSize, include: postInclude }),
      db.post.count({ where }),
    ]);
    return { data: rows.map((row) => this.toSummary(row)), meta: collectionMeta(query.page, query.pageSize, total) };
  }

  async getPost(id: string): Promise<PostDto> {
    const row = await this.load(id);
    return this.toDto(row);
  }

  async preview(id: string): Promise<PostPreviewDto> {
    const row = await this.load(id);
    return { id: row.id, title: row.title, excerpt: row.excerpt, sanitizedBody: row.sanitizedBody, authorName: row.author.displayName, categoryName: row.category.name, status: row.status, noindex: true };
  }

  async revisions(id: string): Promise<PostRevisionDto[]> {
    const db = await this.database.client();
    const rows = await db.contentRevision.findMany({ where: { resourceType: 'post', resourceId: id }, orderBy: { version: 'desc' }, take: 50 });
    return rows.map((r) => ({ id: r.id, version: r.version, title: r.title, reason: r.reason, actorAdminId: r.actorAdminId, createdAt: r.createdAt.toISOString() }));
  }

  async createPost(input: CreatePostDto, actor: AdminPrincipal, ctx: RequestContext): Promise<PostDto> {
    const db = await this.database.client();
    const slug = input.slug ?? slugify(input.title);
    if (!isValidSlug(slug)) throw validation('slug', 'Slug must be lowercase letters, numbers and single hyphens');
    if (await db.post.findUnique({ where: { slug } })) throw slugTaken();
    await this.assertReferences(input.authorId, input.categoryId, input.tagIds ?? []);
    if (input.coverMediaId) await this.media.assertUsableImage(input.coverMediaId);
    if (input.ogImageMediaId) await this.media.assertUsableImage(input.ogImageMediaId);
    const bodyMarkdown = input.bodyMarkdown ?? '';
    // Markdown stays the default so an API client that omits the field keeps the
    // original behaviour; the admin editor always sends 'html' explicitly.
    const bodyFormat = input.bodyFormat ?? 'markdown';
    const row = await db.post.create({
      data: {
        title: input.title,
        slug,
        excerpt: input.excerpt ?? '',
        bodyMarkdown,
        bodyFormat,
        sanitizedBody: renderSanitisedBody(bodyMarkdown, bodyFormat),
        authorId: input.authorId,
        categoryId: input.categoryId,
        coverAlt: input.coverAlt ?? null,
        coverMediaId: input.coverMediaId ?? null,
        ogImageMediaId: input.ogImageMediaId ?? null,
        seoKeywords: input.seoKeywords ?? null,
        seoTitle: input.seoTitle ?? null,
        seoDescription: input.seoDescription ?? null,
        commentsEnabled: input.commentsEnabled ?? true,
        tags: { create: [...new Set(input.tagIds ?? [])].map((tagId) => ({ tagId })) },
      },
      include: postInclude,
    });
    await this.audit.record({ action: 'blog.post.create', actorAdminId: actor.id, targetType: 'post', targetId: row.id, metadata: { slug }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toDto(row);
  }

  async updatePost(id: string, input: UpdatePostDto, actor: AdminPrincipal, ctx: RequestContext): Promise<PostDto> {
    const db = await this.database.client();
    const current = await this.load(id);
    if (current.version !== input.expectedVersion) throw stale();
    if (current.status === 'archived') throw new ConflictException({ code: 'INVALID_STATE', message: 'Restore the article before editing it' });
    if (input.slug && input.slug !== current.slug) {
      if (!isValidSlug(input.slug)) throw validation('slug', 'Slug must be lowercase letters, numbers and single hyphens');
      // A published URL only changes through a reviewed redirect (SRS SEO 004, UX 003).
      if (current.firstPublishedAt) throw new ConflictException({ code: 'SLUG_LOCKED', message: 'The slug of a published article changes through the slug-change endpoint, which creates a redirect' });
      if (await db.post.findUnique({ where: { slug: input.slug } })) throw slugTaken();
    }
    if (input.authorId || input.categoryId || input.tagIds) {
      await this.assertReferences(input.authorId ?? current.authorId, input.categoryId ?? current.categoryId, input.tagIds ?? current.tags.map((t) => t.tagId));
    }
    if (input.coverMediaId) await this.media.assertUsableImage(input.coverMediaId);
    if (input.ogImageMediaId) await this.media.assertUsableImage(input.ogImageMediaId);
    const data: Prisma.PostUncheckedUpdateInput = { version: { increment: 1 } };
    if (input.title !== undefined) data.title = input.title;
    if (input.slug !== undefined) data.slug = input.slug;
    if (input.excerpt !== undefined) data.excerpt = input.excerpt;
    if (input.bodyMarkdown !== undefined) {
      data.bodyMarkdown = input.bodyMarkdown;
      data.bodyFormat = input.bodyFormat ?? current.bodyFormat;
      data.sanitizedBody = renderSanitisedBody(input.bodyMarkdown, data.bodyFormat);
    }
    if (input.authorId !== undefined) data.authorId = input.authorId;
    if (input.categoryId !== undefined) data.categoryId = input.categoryId;
    if (input.coverAlt !== undefined) data.coverAlt = input.coverAlt;
    if (input.coverMediaId !== undefined) data.coverMediaId = input.coverMediaId ?? null;
    if (input.ogImageMediaId !== undefined) data.ogImageMediaId = input.ogImageMediaId ?? null;
    if (input.seoKeywords !== undefined) data.seoKeywords = input.seoKeywords ?? null;
    if (input.seoTitle !== undefined) data.seoTitle = input.seoTitle;
    if (input.seoDescription !== undefined) data.seoDescription = input.seoDescription;
    if (input.commentsEnabled !== undefined) data.commentsEnabled = input.commentsEnabled;

    const row = await db.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({ where: { id, version: input.expectedVersion }, data });
      if (updated.count !== 1) throw stale();
      if (input.tagIds !== undefined) {
        await tx.postTag.deleteMany({ where: { postId: id } });
        if (input.tagIds.length > 0) await tx.postTag.createMany({ data: [...new Set(input.tagIds)].map((tagId) => ({ postId: id, tagId })) });
      }
      // Editing a published article keeps the previous sanitised body (SRS BLOG 003).
      if (current.firstPublishedAt) {
        await tx.contentRevision.create({
          data: { resourceType: 'post', resourceId: id, version: current.version, sanitizedSnapshot: current.sanitizedBody, title: current.title, reason: input.revisionReason ?? null, actorAdminId: actor.id },
        });
        await this.outbox.write(tx, { type: 'post.updated', resourceType: 'post', resourceId: id, resourceVersion: current.version + 1, correlationId: ctx.requestId, payload: { postId: id, slug: current.slug } });
      }
      return tx.post.findUniqueOrThrow({ where: { id }, include: postInclude });
    });
    await this.audit.record({ action: 'blog.post.update', actorAdminId: actor.id, targetType: 'post', targetId: id, reason: input.revisionReason ?? null, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toDto(row);
  }

  /**
   * Changes the public slug of an article and, once it has been published,
   * leaves a 301 from the old path in the same transaction (SRS SEO 004).
   */
  async changeSlug(id: string, input: ChangeSlugDto, actor: AdminPrincipal, ctx: RequestContext): Promise<PostDto> {
    const db = await this.database.client();
    const current = await this.load(id);
    if (current.version !== input.expectedVersion) throw stale();
    if (current.status === 'archived') throw new ConflictException({ code: 'INVALID_STATE', message: 'Restore the article before changing its slug' });
    const slug = input.slug.trim().toLowerCase();
    if (!isValidSlug(slug)) throw validation('slug', 'Slug must be lowercase letters, numbers and single hyphens');
    if (slug === current.slug) throw validation('slug', 'That is already the slug of this article');
    if (await db.post.findUnique({ where: { slug } })) throw slugTaken();
    const row = await db.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({ where: { id, version: input.expectedVersion }, data: { slug, version: { increment: 1 } } });
      if (updated.count !== 1) throw stale();
      // Only a published article has an indexed URL worth preserving.
      if (current.firstPublishedAt) {
        await this.redirects.recordSlugChange(tx, { sourcePath: `/blog/${current.slug}`, targetPath: `/blog/${slug}`, resourceType: 'post', resourceId: id, actorAdminId: actor.id, reason: input.reason ?? null });
        await this.cache.recordInvalidation(tx, {
          resourceType: 'post',
          resourceId: id,
          urgent: true,
          correlationId: ctx.requestId,
          tags: [CACHE_TAGS.posts, CACHE_TAGS.post(current.slug), CACHE_TAGS.post(slug), CACHE_TAGS.sitemap, CACHE_TAGS.redirects],
        });
        await this.outbox.write(tx, { type: 'post.updated', resourceType: 'post', resourceId: id, resourceVersion: current.version + 1, correlationId: ctx.requestId, payload: { postId: id, slug } });
      }
      return tx.post.findUniqueOrThrow({ where: { id }, include: postInclude });
    });
    await this.audit.record({ action: 'blog.post.slug.change', actorAdminId: actor.id, targetType: 'post', targetId: id, reason: input.reason ?? null, metadata: { from: current.slug, to: slug, redirect: current.firstPublishedAt ? 'created' : 'none' }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toDto(row);
  }

  /** Explicit state changes with the BLOG 002 gates; publication is transactional with its outbox event. */
  async transition(id: string, action: PostAction, input: PostStateDto | SchedulePostDto, actor: AdminPrincipal, ctx: RequestContext, now = new Date()): Promise<PostDto> {
    const db = await this.database.client();
    const current = await this.load(id);
    if (current.version !== input.expectedVersion) throw stale();
    const transition = POST_TRANSITIONS[action];
    if (!transition.from.includes(current.status)) {
      throw new ConflictException({ code: 'INVALID_STATE', message: `Cannot ${action} an article that is ${current.status}` });
    }
    let scheduledAt: Date | null = current.scheduledAt;
    if (action === 'publish' || action === 'schedule') {
      const blockers = postPublicationBlockers({
        title: current.title,
        slug: current.slug,
        excerpt: current.excerpt,
        sanitizedBody: current.sanitizedBody,
        authorActive: current.author.active,
        categoryActive: current.category.active,
      });
      if (action === 'schedule') {
        scheduledAt = new Date((input as SchedulePostDto).scheduledAt);
        blockers.push(...scheduleBlockers(scheduledAt, now));
      }
      if (blockers.length > 0) {
        throw new HttpException({ code: 'PUBLICATION_BLOCKED', message: 'The article does not meet the publication requirements', fields: { publication: blockers } }, HttpStatus.CONFLICT);
      }
    }
    const data: Prisma.PostUncheckedUpdateInput = { status: transition.to, version: { increment: 1 } };
    if (action === 'publish') {
      data.publishedAt = now;
      data.scheduledAt = null;
      data.firstPublishedAt = current.firstPublishedAt ?? now;
      data.archivedAt = null;
    }
    if (action === 'schedule') data.scheduledAt = scheduledAt;
    if (action === 'unpublish') {
      data.publishedAt = null;
      data.scheduledAt = null;
    }
    if (action === 'archive') data.archivedAt = now;
    if (action === 'restore') {
      data.archivedAt = null;
      data.publishedAt = null;
      data.scheduledAt = null;
    }

    const row = await db.$transaction(async (tx) => {
      const updated = await tx.post.updateMany({ where: { id, version: input.expectedVersion }, data });
      if (updated.count !== 1) throw stale();
      if (action === 'publish' || action === 'unpublish' || action === 'archive') {
        await this.outbox.write(tx, {
          type: action === 'publish' ? 'post.published' : 'post.removed',
          resourceType: 'post',
          resourceId: id,
          resourceVersion: current.version + 1,
          correlationId: ctx.requestId,
          payload: { postId: id, slug: current.slug, action },
        });
        await this.cache.recordInvalidation(tx, {
          resourceType: 'post',
          resourceId: id,
          urgent: action !== 'publish',
          correlationId: ctx.requestId,
          tags: [CACHE_TAGS.posts, CACHE_TAGS.post(current.slug), CACHE_TAGS.sitemap, CACHE_TAGS.taxonomy],
        });
      }
      return tx.post.findUniqueOrThrow({ where: { id }, include: postInclude });
    });
    await this.cache.bumpNamespace();
    await this.audit.record({ action: `blog.post.${action}`, actorAdminId: actor.id, targetType: 'post', targetId: id, reason: input.reason ?? null, metadata: { from: current.status, to: transition.to }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.toDto(row);
  }

  /**
   * Publishes every post whose scheduled time has passed (SRS BLOG 002). It is
   * idempotent: a post that is no longer scheduled is skipped, so a catch-up
   * run after downtime cannot double-publish or strand due posts.
   */
  async publishDueScheduled(now = new Date()): Promise<{ published: string[]; skipped: number }> {
    const db = await this.database.client();
    const due = await db.post.findMany({ where: { status: 'scheduled', scheduledAt: { lte: now } }, select: { id: true, version: true, slug: true, firstPublishedAt: true }, take: 50 });
    const published: string[] = [];
    let skipped = 0;
    for (const post of due) {
      const applied = await db.$transaction(async (tx) => {
        const updated = await tx.post.updateMany({
          where: { id: post.id, version: post.version, status: 'scheduled' },
          data: { status: 'published', publishedAt: now, scheduledAt: null, firstPublishedAt: post.firstPublishedAt ?? now, version: { increment: 1 } },
        });
        if (updated.count !== 1) return false;
        await this.outbox.write(tx, { type: 'post.published', resourceType: 'post', resourceId: post.id, resourceVersion: post.version + 1, payload: { postId: post.id, slug: post.slug, scheduled: true } });
        return true;
      });
      if (applied) {
        published.push(post.id);
        await this.audit.record({ action: 'blog.post.publish', targetType: 'post', targetId: post.id, metadata: { scheduled: true } });
      } else skipped += 1;
    }
    return { published, skipped };
  }

  // ---- helpers --------------------------------------------------------------

  private async load(id: string): Promise<PostRow> {
    const db = await this.database.client();
    const row = await db.post.findUnique({ where: { id }, include: postInclude });
    if (!row) throw notFound();
    return row;
  }

  private async assertReferences(authorId: string, categoryId: string, tagIds: string[]): Promise<void> {
    const db = await this.database.client();
    const [author, category, tags] = await Promise.all([
      db.author.findUnique({ where: { id: authorId }, select: { active: true } }),
      db.blogCategory.findUnique({ where: { id: categoryId }, select: { active: true } }),
      tagIds.length > 0 ? db.blogTag.findMany({ where: { id: { in: tagIds } }, select: { id: true, active: true } }) : Promise.resolve([]),
    ]);
    if (!author?.active) throw validation('authorId', 'Choose an active author');
    if (!category?.active) throw validation('categoryId', 'Choose an active category');
    const found = new Set(tags.filter((t) => t.active).map((t) => t.id));
    if (tagIds.some((id) => !found.has(id))) throw validation('tagIds', 'One or more tags are unknown or inactive');
  }

  private async toAuthorDto(row: AuthorRow): Promise<AuthorDto> {
    return {
      id: row.id,
      displayName: row.displayName,
      slug: row.slug,
      role: row.role,
      shortBio: row.shortBio,
      bio: row.bio,
      pronouns: row.pronouns,
      location: row.location,
      publicEmail: row.publicEmail,
      websiteUrl: row.websiteUrl,
      expertise: Array.isArray(row.expertise) ? (row.expertise as unknown[]).filter((value): value is string => typeof value === 'string') : [],
      links: row.links.map((link) => ({ kind: link.kind, url: link.url, label: link.label })),
      image: await this.media.publicImageRef(row.imageMediaId),
      imageMediaId: row.imageMediaId,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      active: row.active,
      postCount: row._count.posts,
      publishedPostCount: row.posts.length,
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toTermDto(row: BlogCategory | BlogTag, postCount: number): BlogTermDto {
    return { id: row.id, name: row.name, slug: row.slug, landingContent: row.landingContent, active: row.active, postCount, version: row.version, updatedAt: row.updatedAt.toISOString() };
  }

  private toSummary(row: PostRow): PostSummaryDto {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      status: row.status,
      authorId: row.authorId,
      authorName: row.author.displayName,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      tagIds: row.tags.map((t) => t.tagId).sort(),
      commentsEnabled: row.commentsEnabled,
      scheduledAt: row.scheduledAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
      publicationBlockers: postPublicationBlockers({ title: row.title, slug: row.slug, excerpt: row.excerpt, sanitizedBody: row.sanitizedBody, authorActive: row.author.active, categoryActive: row.category.active }),
      version: row.version,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async toDto(row: PostRow): Promise<PostDto> {
    return {
      ...this.toSummary(row),
      excerpt: row.excerpt,
      bodyMarkdown: row.bodyMarkdown,
      bodyFormat: row.bodyFormat,
      sanitizedBody: row.sanitizedBody,
      coverAlt: row.coverAlt,
      coverMediaId: row.coverMediaId,
      cover: await this.media.publicImageRef(row.coverMediaId),
      ogImageMediaId: row.ogImageMediaId,
      ogImage: await this.media.publicImageRef(row.ogImageMediaId),
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      seoKeywords: row.seoKeywords,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
