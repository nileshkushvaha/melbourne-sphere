import type { Metadata } from 'next';
import { routeMetadata } from '@/lib/route-seo';
import { BusinessResults } from '@/components/business-results';
import { isFiltered, parseSearchParams, toQueryString } from '@/lib/search-params';

/**
 * Lives in a route group so its loading boundary does not wrap the category and
 * area pages (a streamed shell would turn their 404s into 200 responses).
 * Filtered searches are noindex,follow with a normalised self canonical (SRS SEO 003); the base list is indexable. */
export async function generateMetadata({ searchParams }: PageProps<'/business'>): Promise<Metadata> {
  const state = parseSearchParams(await searchParams);
  const filtered = isFiltered(state);
  const base: Metadata = {
    title: filtered ? `Search results${state.q ? ` for “${state.q}”` : ''}` : 'Businesses',
    description: 'Every published business across Melbourne. Filter by category, local area and rating.',
    alternates: { canonical: `/business${toQueryString(state)}` },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
  // A filtered search is not the directory index: it keeps its own normalised
  // canonical and stays out of the index (SEO 003), whatever has been
  // configured for the index itself.
  if (filtered) return base;
  return routeMetadata('directory', base);
}

export default async function BusinessListPage({ searchParams }: PageProps<'/business'>) {
  const state = parseSearchParams(await searchParams);
  return (
    <>
      <div className="ms-on-dark bg-band text-band-text">
        <div className="ms-container py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Melbourne, Victoria</p>
          <h1 className="font-display mt-3 max-w-3xl text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.06] tracking-tight">Melbourne business directory</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-band-muted">
            Every published listing inside Melbourne, checked by our editors. Combine a keyword with a category, local area or minimum rating.
          </p>
        </div>
      </div>
      <div className="ms-container py-10 sm:py-12">
        <BusinessResults basePath="/business" state={state} />
      </div>
    </>
  );
}
