import type { Metadata } from 'next';
import Link from 'next/link';
import { PostCard } from '@/components/post-card';
import { FeaturedPostCard } from '@/components/featured-post-card';
import { Pagination } from '@/components/pagination';
import { gridColumns } from '@/components/page-shell';
import { fetchBlogTerms, fetchPosts } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Guides, interviews and news about Melbourne businesses and neighbourhoods.',
  alternates: { canonical: '/blog' },
};

/** Blog index (SRS BLOG 005): 12 per page, newest published first, server rendered. */
export default async function BlogIndexPage({ searchParams }: PageProps<'/blog'>) {
  const params = await searchParams;
  const pageParam = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const [posts, categories] = await Promise.all([fetchPosts({ page }), fetchBlogTerms('blog-categories')]);
  const stocked = categories.filter((category) => category.postCount > 0);
  const lead = page === 1 ? posts.data[0] : undefined;
  const rest = lead ? posts.data.slice(1) : posts.data;

  return (
    <>
      <div className="ms-on-dark bg-band text-band-text">
        <div className="ms-container py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Melbourne Sphere</p>
          <h1 className="font-display mt-3 max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.05] tracking-tight">Stories from around the city</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-band-muted">Guides, interviews and news about the businesses and neighbourhoods we list — written by our editors, not by the businesses.</p>
          {stocked.length > 0 && (
            <nav aria-label="Blog categories" className="mt-8 flex flex-wrap gap-2.5">
              {stocked.map((category) => (
                <Link
                  key={category.slug}
                  href={`/blog/category/${category.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-band-border bg-white/[0.06] px-4 text-sm font-medium text-white transition-colors hover:border-sky-400 hover:bg-white/12"
                >
                  {category.name}
                  <span className="text-band-muted">{category.postCount}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </div>

      <div className="ms-container py-12 sm:py-16">
        {posts.data.length === 0 ? (
          <p className="rounded-card-lg border border-dashed border-border-strong p-10 text-center text-text-muted">No articles have been published yet. The first ones are being written.</p>
        ) : (
          <div className="flex flex-col gap-8">
            {/* The newest article leads page one; later pages are a plain grid. */}
            {lead && <FeaturedPostCard post={lead} />}
            {rest.length > 0 && (
              <ul className={`grid gap-6 ${gridColumns(rest.length)}`}>
                {rest.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="mt-10">
          <Pagination page={posts.meta.page} pageCount={posts.meta.pageCount} hrefFor={(p) => (p === 1 ? '/blog' : `/blog?page=${p}`)} />
        </div>
      </div>
    </>
  );
}
