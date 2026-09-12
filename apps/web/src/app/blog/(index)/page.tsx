import type { Metadata } from 'next';
import { routeMetadata } from '@/lib/route-seo';
import { ArticleCollection, BlogEmptyState } from '@/components/article-collection';
import { BlogCategoryNav } from '@/components/blog-category-nav';
import { LazyPostGrid } from '@/components/lazy-list';
import { NextPageLink } from '@/components/next-page-link';
import { PostCard } from '@/components/post-card';
import { fetchBlogTerms, fetchPosts, type BlogTerm } from '@/lib/api';

/** The page's own metadata, with any administrator overrides applied (SEO 001). */
export async function generateMetadata(): Promise<Metadata> {
  return routeMetadata('blog', {
    title: 'Blog',
    description: 'Guides, interviews and news about Melbourne businesses and neighbourhoods.',
    alternates: { canonical: '/blog' },
  });
}

/** Blog index (SRS BLOG 005): 12 per page, newest published first, server rendered. */
export default async function BlogIndexPage({ searchParams }: PageProps<'/blog'>) {
  const params = await searchParams;
  const pageParam = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;

  // The articles are the page: a failure there reaches the error boundary rather
  // than being reported as "no articles" (SRS DIR 006 applied to editorial).
  // The category row is navigation around them, so it is allowed to be missing
  // without taking the index down with it.
  const [posts, termsResult] = await Promise.all([fetchPosts({ page }), fetchBlogTerms('blog-categories').then<BlogTerm[], BlogTerm[]>((terms) => terms, () => [])]);
  const stocked = termsResult.filter((category) => category.postCount > 0);

  // The lead-plus-grid hierarchy needs something to put in the grid. With three
  // articles or fewer it would leave a lead card above one lonely half-row, so
  // those counts are laid out as a single collection instead — the page stays
  // deliberate whether the blog holds one article or a hundred.
  const leadSplit = page === 1 && posts.data.length >= 4;
  const lead = leadSplit ? posts.data[0] : undefined;
  const rest = lead ? posts.data.slice(1) : posts.data;

  return (
    <>
      <section aria-labelledby="blog-heading" className="ms-on-dark ms-editorial-band text-band-text">
        <div className="ms-container py-11 sm:py-16">
          {/* The publisher and the size of the archive on one line: both are
              labels for the heading under them, and stacking them separately
              left the band twice as tall as its content needed. */}
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold uppercase tracking-[0.18em] text-sky-400">Melbourne Sphere</span>
            {posts.meta.total > 0 && (
              <>
                <span aria-hidden="true" className="text-band-border">
                  •
                </span>
                <span className="text-sm text-band-muted">
                  {posts.meta.total} {posts.meta.total === 1 ? 'story' : 'stories'}
                </span>
              </>
            )}
          </p>
          <h1 id="blog-heading" className="font-display mt-3.5 max-w-3xl text-balance text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.04] tracking-tight">
            Stories from around the city
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-band-muted">
            Guides, interviews and news about the businesses and neighbourhoods we list — written by our editors, not by the businesses.
          </p>
          <div className="mt-8">
            <BlogCategoryNav categories={stocked} active="all" />
          </div>
        </div>
      </section>

      <div className="ms-container py-12 sm:py-16">
        {posts.data.length === 0 ? (
          page > 1 ? (
            <BlogEmptyState message="There are no more articles on this page." action={{ href: '/blog', label: 'Back to the latest stories' }} />
          ) : (
            <BlogEmptyState message="No articles have been published yet. The first ones are being written." />
          )
        ) : (
          <div className="flex flex-col gap-12 sm:gap-14">
            {/* The newest article leads page one once there is a grid to lead. */}
            {lead && <PostCard post={lead} variant="featured" headingLevel={2} label="Latest" priority />}

            {lead ? (
              <section aria-labelledby="more-stories-heading" className="flex flex-col gap-6">
                <h2 id="more-stories-heading" className="font-display text-2xl tracking-tight sm:text-3xl">
                  More stories
                </h2>
                {/* This page is server rendered; later pages are appended as the
                    index is scrolled. Without JavaScript a plain "More articles"
                    link takes its place, so the archive is still walkable. */}
                <LazyPostGrid
                  initial={rest}
                  page={posts.meta.page}
                  pageCount={posts.meta.pageCount}
                  fallback={posts.meta.page < posts.meta.pageCount ? <NextPageLink href={`/blog?page=${posts.meta.page + 1}`} label="More articles" /> : null}
                />
              </section>
            ) : posts.meta.pageCount > 1 ? (
              <LazyPostGrid
                initial={rest}
                page={posts.meta.page}
                pageCount={posts.meta.pageCount}
                fallback={posts.meta.page < posts.meta.pageCount ? <NextPageLink href={`/blog?page=${posts.meta.page + 1}`} label="More articles" /> : null}
              />
            ) : (
              <ArticleCollection posts={rest} label="Articles" headingLevel={2} leadIsAboveFold />
            )}
          </div>
        )}
      </div>
    </>
  );
}
