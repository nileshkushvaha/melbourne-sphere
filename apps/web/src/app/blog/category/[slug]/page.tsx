import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionHeader } from '@/components/collection-header';
import { gridColumns } from '@/components/page-shell';
import { PostCard } from '@/components/post-card';
import { Pagination } from '@/components/pagination';
import { fetchBlogTerms, fetchPosts } from '@/lib/api';

async function findCategory(slug: string) {
  return (await fetchBlogTerms('blog-categories')).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params }: PageProps<'/blog/category/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: 'Category not found' };
  return {
    title: `${category.name} articles`,
    description: `Articles about ${category.name.toLowerCase()} from the Melbourne Sphere blog.`,
    alternates: { canonical: `/blog/category/${category.slug}` },
    // A landing page without editorial content or articles is not worth indexing (SRS BLOG 005, SEO 003).
    robots: category.landingContent || category.postCount > 0 ? undefined : { index: false, follow: true },
  };
}

export default async function BlogCategoryPage({ params, searchParams }: PageProps<'/blog/category/[slug]'>) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();
  const query = await searchParams;
  const pageParam = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const posts = await fetchPosts({ page, category: category.slug });
  return (
    <>
      <CollectionHeader
        eyebrow="Blog category"
        title={category.name}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: category.name }]}
        bodyHtml={category.landingContent}
        meta={posts.meta.total > 0 ? `${posts.meta.total} article${posts.meta.total === 1 ? '' : 's'}` : undefined}
      />
      <div className="ms-container py-12 sm:py-16">
        {posts.data.length === 0 ? (
          <p className="rounded-card-lg border border-dashed border-border-strong p-10 text-center text-text-muted">No articles in this category yet.</p>
        ) : (
          <ul className={`grid gap-6 ${gridColumns(posts.data.length)}`}>
            {posts.data.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        )}
        <div className="mt-10">
          <Pagination page={posts.meta.page} pageCount={posts.meta.pageCount} hrefFor={(p) => (p === 1 ? `/blog/category/${category.slug}` : `/blog/category/${category.slug}?page=${p}`)} />
        </div>
      </div>
    </>
  );
}
