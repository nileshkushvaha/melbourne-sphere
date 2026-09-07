import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CollectionHeader } from '@/components/collection-header';
import { DirectoryResults } from '@/components/directory-results';
import { fetchCategories, flattenCategories, searchBusinesses } from '@/lib/api';
import { isFiltered, landingRobots, parseSearchParams, toQueryString } from '@/lib/search-params';

async function findCategory(slug: string) {
  return flattenCategories(await fetchCategories()).find((c) => c.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: PageProps<'/directory/category/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) return { title: 'Category not found' };
  const state = parseSearchParams(await searchParams);
  const filtered = isFiltered(state);
  // Same request the page body makes, so it is served from the data cache; an
  // unfiltered landing is indexed only when it has text and at least one listing.
  const total = filtered ? 0 : (await searchBusinesses({ ...state, category: null }, { category: category.slug })).meta.total;
  return {
    title: `${category.name} in Melbourne`,
    description: category.description ?? `Published ${category.name} businesses across Melbourne with opening hours and contact details.`,
    alternates: { canonical: `/directory/category/${category.slug}${toQueryString(state)}` },
    robots: landingRobots(category.description, total, filtered),
  };
}

/** Curated category landing (SRS SEO 003: substantive content plus eligible listings; unknown or inactive → 404). */
export default async function CategoryPage({ params, searchParams }: PageProps<'/directory/category/[slug]'>) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();
  const state = parseSearchParams(await searchParams);
  const basePath = `/directory/category/${category.slug}`;
  return (
    <>
      <CollectionHeader
        eyebrow="Category"
        title={`${category.name} in Melbourne`}
        crumbs={[
          { label: 'Home', href: '/' },
          { label: 'Directory', href: '/directory' },
          ...(category.parent ? [{ label: category.parent.name, href: `/directory/category/${category.parent.slug}` }] : []),
          { label: category.name },
        ]}
        description={category.description ?? `Published ${category.name.toLowerCase()} businesses across Melbourne.`}
      />
      {category.children.length > 0 && (
        <nav aria-label="Subcategories" className="border-b border-border bg-surface">
          <ul className="ms-container flex flex-wrap gap-2 py-4 text-sm">
            {category.children.map((child) => (
              <li key={child.id}>
                <Link href={`/directory/category/${child.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-border px-3.5 transition-colors hover:border-border-strong hover:bg-sky-50">
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <div className="ms-container py-10 sm:py-12">
        <DirectoryResults basePath={basePath} state={{ ...state, category: null }} fixed={{ category: category.slug }} />
      </div>
    </>
  );
}
