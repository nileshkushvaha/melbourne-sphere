import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ArticleCollection, BlogEmptyState } from '@/components/article-collection';
import { BlogCategoryNav } from '@/components/blog-category-nav';
import { CollectionHeader } from '@/components/collection-header';
import { Pagination } from '@/components/pagination';
import { fetchBlogTerms, fetchPosts, type BlogTerm } from '@/lib/api';

async function categories(): Promise<BlogTerm[]> {
  return fetchBlogTerms('blog-categories');
}

export async function generateMetadata({ params }: PageProps<'/blog/category/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const category = (await categories()).find((c) => c.slug === slug) ?? null;
  if (!category) return { title: 'Category not found', robots: { index: false } };
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
  const terms = await categories();
  const category = terms.find((c) => c.slug === slug) ?? null;
  // An address that is not a published category is a 404, not a category with
  // nothing in it (SRS SEO 001: correct status).
  if (!category) notFound();

  const query = await searchParams;
  const pageParam = Number(Array.isArray(query.page) ? query.page[0] : query.page);
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1;
  const posts = await fetchPosts({ page, category: category.slug });
  const stocked = terms.filter((term) => term.postCount > 0 || term.slug === category.slug);

  return (
    <>
      <CollectionHeader
        eyebrow="Blog category"
        title={category.name}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: category.name }]}
        // The editor's own description for this category; nothing is invented
        // when they have not written one (SRS CFG 003, BLOG 005).
        bodyHtml={category.landingContent}
        meta={posts.meta.total > 0 ? `${posts.meta.total} article${posts.meta.total === 1 ? '' : 's'}` : undefined}
        footer={<BlogCategoryNav categories={stocked} active={category.slug} />}
      />
      <div className="ms-container py-12 sm:py-16">
        {posts.data.length === 0 ? (
          page > 1 ? (
            <BlogEmptyState message="There are no more articles in this category." action={{ href: `/blog/category/${category.slug}`, label: `Back to ${category.name}` }} />
          ) : (
            <BlogEmptyState message="No stories have been published in this category yet." action={{ href: '/blog', label: 'Browse all stories' }} />
          )
        ) : (
          // The category is the page heading, so the cards do not repeat it.
          <ArticleCollection posts={posts.data} label={`Articles in ${category.name}`} showCategory={false} leadIsAboveFold />
        )}
        {posts.meta.pageCount > 1 && (
          <div className="mt-12">
            <Pagination page={posts.meta.page} pageCount={posts.meta.pageCount} hrefFor={(p) => (p === 1 ? `/blog/category/${category.slug}` : `/blog/category/${category.slug}?page=${p}`)} />
          </div>
        )}
      </div>
    </>
  );
}
