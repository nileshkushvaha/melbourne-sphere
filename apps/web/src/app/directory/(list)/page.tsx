import type { Metadata } from 'next';
import { DirectoryResults } from '@/components/directory-results';
import { isFiltered, parseSearchParams, toQueryString } from '@/lib/search-params';

/**
 * Lives in a route group so its loading boundary does not wrap the category and
 * area pages (a streamed shell would turn their 404s into 200 responses).
 * Filtered searches are noindex,follow with a normalised self canonical (SRS SEO 003); the base list is indexable. */
export async function generateMetadata({ searchParams }: PageProps<'/directory'>): Promise<Metadata> {
  const state = parseSearchParams(await searchParams);
  const filtered = isFiltered(state);
  return {
    title: filtered ? `Search results${state.q ? ` for “${state.q}”` : ''}` : 'Directory',
    description: 'Every published business across Melbourne. Filter by category, local area and rating.',
    alternates: { canonical: `/directory${toQueryString(state)}` },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function DirectoryPage({ searchParams }: PageProps<'/directory'>) {
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
        <DirectoryResults basePath="/directory" state={state} />
      </div>
    </>
  );
}
