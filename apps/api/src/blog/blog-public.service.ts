import type { MediaVariantKind } from '@melbourne-sphere/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@melbourne-sphere/database';
import { collectionMeta, skipFor } from '../common/pagination.js';
import { DatabaseService } from '../database/database.service.js';
import { ObjectStoragePort } from '../media/storage.port.js';
import { relatedScore } from './post-rules.js';
import type { ListPublicPostsQueryDto, PublicBlogTermDto, PublicImageVariantDto, PublicPostCardDto, PublicPostDto } from './dto/public-post.dto.js';

const cardInclude = {
  author: {
    select: {
      displayName: true, slug: true, role: true, shortBio: true, bio: true, pronouns: true, location: true, websiteUrl: true, expertise: true,
      links: { orderBy: { sortOrder: 'asc' }, select: { kind: true, url: true, label: true } },
      image: { include: { variants: true } },
    },
  },
  category: { select: { name: true, slug: true } },
  tags: { include: { tag: { select: { name: true, slug: true, active: true } } } },
  cover: { include: { variants: true } },
  ogImage: { include: { variants: true } },
} satisfies Prisma.PostInclude;

type CardRow = Prisma.PostGetPayload<{ include: typeof cardInclude }>;

const RELATED_LIMIT = 4;

/**
 * Public blog reads (SRS BLOG 004–005). Only published articles are visible;
 * drafts, scheduled and archived posts are invisible even by direct slug.
 */
@Injectable()
export class BlogPublicService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: ObjectStoragePort,
  ) {}

  async list(query: ListPublicPostsQueryDto): Promise<{ data: PublicPostCardDto[]; meta: ReturnType<typeof collectionMeta> }> {
    const db = await this.database.client();
    const where: Prisma.PostWhereInput = {
      status: 'published',
      ...(query.category ? { category: { slug: query.category, active: true } } : {}),
      ...(query.tag ? { tags: { some: { tag: { slug: query.tag, active: true } } } } : {}),
      ...(query.q ? { OR: [{ title: { contains: query.q } }, { excerpt: { contains: query.q } }] } : {}),
    };
    const [rows, total] = await Promise.all([
      db.post.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }], skip: skipFor(query.page, query.pageSize), take: query.pageSize, include: cardInclude }),
      db.post.count({ where }),
    ]);
    return { data: rows.map((row) => this.toCard(row)), meta: collectionMeta(query.page, query.pageSize, total) };
  }

  async detail(slug: string): Promise<PublicPostDto> {
    const db = await this.database.client();
    const row = await db.post.findFirst({ where: { slug, status: 'published' }, include: cardInclude });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Article not found' });
    const [related, approvedCommentCount] = await Promise.all([this.related(row), db.comment.count({ where: { postId: row.id, status: 'approved' } })]);
    return {
      ...this.toCard(row),
      body: row.sanitizedBody,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      commentsEnabled: row.commentsEnabled,
      approvedCommentCount,
      firstPublishedAt: (row.firstPublishedAt ?? row.publishedAt ?? row.createdAt).toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      related,
    };
  }

  /** Same category first, then shared tags, never itself or unpublished content (SRS BLOG 004). */
  private async related(post: CardRow): Promise<PublicPostCardDto[]> {
    const db = await this.database.client();
    const tagIds = post.tags.map((t) => t.tagId);
    const candidates = await db.post.findMany({
      where: {
        status: 'published',
        id: { not: post.id },
        OR: [{ categoryId: post.categoryId }, ...(tagIds.length > 0 ? [{ tags: { some: { tagId: { in: tagIds } } } }] : [])],
      },
      include: cardInclude,
      orderBy: [{ publishedAt: 'desc' }, { id: 'asc' }],
      take: 25,
    });
    return candidates
      .map((candidate) => ({ candidate, score: relatedScore({ categoryId: candidate.categoryId, tagIds: candidate.tags.map((t) => t.tagId) }, { categoryId: post.categoryId, tagIds }) }))
      .sort((a, b) => b.score - a.score || (b.candidate.publishedAt?.getTime() ?? 0) - (a.candidate.publishedAt?.getTime() ?? 0) || a.candidate.id.localeCompare(b.candidate.id))
      .slice(0, RELATED_LIMIT)
      .map(({ candidate }) => this.toCard(candidate));
  }

  async terms(kind: 'category' | 'tag'): Promise<PublicBlogTermDto[]> {
    const db = await this.database.client();
    const rows =
      kind === 'category'
        ? await db.blogCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], include: { _count: { select: { posts: { where: { status: 'published' } } } } } })
        : await db.blogTag.findMany({ where: { active: true }, orderBy: [{ name: 'asc' }], include: { _count: { select: { posts: { where: { post: { status: 'published' } } } } } } });
    return rows.map((row) => ({ name: row.name, slug: row.slug, landingContent: row.landingContent, postCount: row._count.posts }));
  }

  /** Byline data only; nothing private and nothing an editor has not published. */
  private toAuthor(author: CardRow['author']): PublicPostCardDto['author'] {
    const variants = author.image && author.image.status === 'ready' ? author.image.variants.slice().sort((a, b) => a.width - b.width) : [];
    const chosen = variants.find((variant) => variant.kind === 'thumbnail') ?? variants[0];
    return {
      displayName: author.displayName,
      slug: author.slug,
      role: author.role,
      shortBio: author.shortBio,
      bio: author.bio,
      pronouns: author.pronouns,
      location: author.location,
      websiteUrl: author.websiteUrl,
      expertise: Array.isArray(author.expertise) ? (author.expertise as unknown[]).filter((value): value is string => typeof value === 'string') : [],
      links: author.links.map((link) => ({ kind: link.kind, url: link.url, label: link.label })),
      image: chosen ? { url: this.storage.publicUrl(chosen.objectKey), alt: author.image?.altText ?? '' } : null,
    };
  }

  private toCard(row: CardRow): PublicPostCardDto {
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      category: { name: row.category.name, slug: row.category.slug },
      author: this.toAuthor(row.author),
      tags: row.tags.filter((t) => t.tag.active).map((t) => ({ name: t.tag.name, slug: t.tag.slug })),
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
      coverAlt: row.coverAlt ?? row.cover?.altText ?? null,
      cover: this.renditions(row.cover),
      // The image used when the article is shared. An article that sets one
      // publishes that; otherwise the cover stands in, which is what readers
      // expect and what the editor is told on the screen.
      shareImage: this.renditions(row.ogImage).at(-1) ?? null,
    };
  }

  /** Published renditions of an asset, smallest first; empty unless it is ready. */
  private renditions(asset: { status: string; variants: { kind: MediaVariantKind; objectKey: string; width: number; height: number }[] } | null | undefined): PublicImageVariantDto[] {
    if (!asset || asset.status !== 'ready') return [];
    return asset.variants
      .slice()
      .sort((a, b) => a.width - b.width)
      .map((v) => ({ kind: v.kind, url: this.storage.publicUrl(v.objectKey), width: v.width, height: v.height }));
  }
}
