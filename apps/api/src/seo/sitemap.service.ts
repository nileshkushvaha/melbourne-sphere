import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { SitemapEntryDto } from './dto/sitemap.dto.js';

/** Sitemap sections (SRS SEO 002); the web tier turns the paths into absolute URLs. */
export const SITEMAP_SECTIONS = ['businesses', 'editorial', 'taxonomies', 'pages'] as const;
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number];

/** Upper bound per section; well under the 50 000 URL protocol limit. */
const MAX_ENTRIES = 20_000;

const latest = (...dates: (Date | null | undefined)[]): Date => {
  const times = dates.filter((d): d is Date => d instanceof Date).map((d) => d.getTime());
  return new Date(times.length > 0 ? Math.max(...times) : 0);
};

/**
 * Canonical, indexable paths with real last-modified times. Only content that
 * returns 200 to an anonymous visitor is listed: drafts, archived rows,
 * inactive terms, empty taxonomies and filtered searches are all excluded
 * (SRS SEO 002/003/007).
 */
@Injectable()
export class SitemapService {
  constructor(private readonly database: DatabaseService) {}

  async section(section: SitemapSection): Promise<SitemapEntryDto[]> {
    switch (section) {
      case 'businesses':
        return this.businesses();
      case 'editorial':
        return this.editorial();
      case 'taxonomies':
        return this.taxonomies();
      case 'pages':
        return this.pages();
    }
  }

  /**
   * Published information pages, and the routes that are always there. A page
   * still in draft answers 404, so it is not listed until it is published
   * (SEO 002).
   */
  private async pages(): Promise<SitemapEntryDto[]> {
    const db = await this.database.client();
    // Every published page, whether the product declared it or an editor
    // created it: what makes a page listable is that it answers 200 to an
    // anonymous visitor, which publication is exactly the record of.
    const rows = await db.staticPage.findMany({ where: { status: 'published' }, select: { slug: true, updatedAt: true }, orderBy: { slug: 'asc' } });
    const entries = rows.map((row) => ({ path: `/${row.slug}`, lastModified: row.updatedAt.toISOString() }));
    // `/contact` is a product route rather than editable content, so its
    // last-modified time is the newest page change we know of.
    entries.push({ path: '/contact', lastModified: latest(...rows.map((row) => row.updatedAt)).toISOString() });
    return entries;
  }

  private async businesses(): Promise<SitemapEntryDto[]> {
    const db = await this.database.client();
    const rows = await db.business.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_ENTRIES,
    });
    return rows.map((row) => ({ path: `/business/${row.slug}`, lastModified: row.updatedAt.toISOString() }));
  }

  private async editorial(): Promise<SitemapEntryDto[]> {
    const db = await this.database.client();
    const rows = await db.post.findMany({
      where: { status: 'published' },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: MAX_ENTRIES,
    });
    const entries = rows.map((row) => ({ path: `/blog/${row.slug}`, lastModified: row.updatedAt.toISOString() }));
    // The blog index is only listed once it has something to show.
    if (rows.length > 0) entries.unshift({ path: '/blog', lastModified: latest(rows[0]?.updatedAt).toISOString() });
    return entries;
  }

  /**
   * Curated taxonomy landing pages only: each needs its own editorial text and
   * at least one published item, which is exactly the SEO 003 rule against
   * thin generated pages.
   */
  private async taxonomies(): Promise<SitemapEntryDto[]> {
    const db = await this.database.client();
    const publishedBusiness = { status: 'published' as const };
    const [categories, areas, blogCategories, blogTags] = await Promise.all([
      db.category.findMany({
        where: { active: true, NOT: { description: null }, OR: [{ primaryOf: { some: publishedBusiness } }, { businesses: { some: { business: publishedBusiness } } }] },
        select: { slug: true, description: true, updatedAt: true },
      }),
      db.localArea.findMany({
        where: { active: true, NOT: { editorialIntro: null }, businesses: { some: publishedBusiness } },
        select: { slug: true, editorialIntro: true, updatedAt: true },
      }),
      db.blogCategory.findMany({
        where: { active: true, NOT: { landingContent: null }, posts: { some: { status: 'published' } } },
        select: { slug: true, landingContent: true, updatedAt: true },
      }),
      db.blogTag.findMany({
        where: { active: true, NOT: { landingContent: null }, posts: { some: { post: { status: 'published' } } } },
        select: { slug: true, landingContent: true, updatedAt: true },
      }),
    ]);
    const hasText = (value: string | null) => (value ?? '').trim().length > 0;
    const entries: SitemapEntryDto[] = [
      ...categories.filter((row) => hasText(row.description)).map((row) => ({ path: `/business/category/${row.slug}`, lastModified: row.updatedAt.toISOString() })),
      ...areas.filter((row) => hasText(row.editorialIntro)).map((row) => ({ path: `/business/area/${row.slug}`, lastModified: row.updatedAt.toISOString() })),
      ...blogCategories.filter((row) => hasText(row.landingContent)).map((row) => ({ path: `/blog/category/${row.slug}`, lastModified: row.updatedAt.toISOString() })),
      ...blogTags.filter((row) => hasText(row.landingContent)).map((row) => ({ path: `/blog/tag/${row.slug}`, lastModified: row.updatedAt.toISOString() })),
    ];
    return entries.slice(0, MAX_ENTRIES);
  }
}
