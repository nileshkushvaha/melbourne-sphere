import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionHeader } from '@/components/collection-header';
import { DirectoryResults } from '@/components/directory-results';
import { fetchAreas, searchBusinesses } from '@/lib/api';
import { isFiltered, landingRobots, parseSearchParams, toQueryString } from '@/lib/search-params';

async function findArea(slug: string) {
  return (await fetchAreas()).find((a) => a.slug === slug) ?? null;
}

export async function generateMetadata({ params, searchParams }: PageProps<'/directory/area/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const area = await findArea(slug);
  if (!area) return { title: 'Area not found' };
  const state = parseSearchParams(await searchParams);
  const filtered = isFiltered(state);
  // Same request the page body makes, so it is served from the data cache; an
  // unfiltered landing is indexed only when it has text and at least one listing.
  const total = filtered ? 0 : (await searchBusinesses({ ...state, area: null }, { area: area.slug })).meta.total;
  return {
    title: `Businesses in ${area.name}`,
    description: area.editorialIntro?.slice(0, 160) ?? `Published businesses in ${area.name}, Melbourne, with opening hours and contact details.`,
    alternates: { canonical: `/directory/area/${area.slug}${toQueryString(state)}` },
    robots: landingRobots(area.editorialIntro, total, filtered),
  };
}

/** Approved local area page (SRS BUS 008, UX 003: areas are an allowlist, never a generic city route). */
export default async function AreaPage({ params, searchParams }: PageProps<'/directory/area/[slug]'>) {
  const { slug } = await params;
  const area = await findArea(slug);
  if (!area) notFound();
  const state = parseSearchParams(await searchParams);
  const basePath = `/directory/area/${area.slug}`;
  return (
    <>
      <CollectionHeader
        eyebrow="Local area"
        title={`Businesses in ${area.name}`}
        crumbs={[{ label: 'Home', href: '/' }, { label: 'Directory', href: '/directory' }, { label: area.name }]}
        description={area.editorialIntro ?? `Published businesses located in ${area.name}, Melbourne.`}
      />
      <div className="ms-container py-10 sm:py-12">
        <DirectoryResults basePath={basePath} state={{ ...state, area: null }} fixed={{ area: area.slug }} />
      </div>
    </>
  );
}
