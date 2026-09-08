import type { SiteMetrics } from '@/lib/api';

const NUMBER = new Intl.NumberFormat('en-AU');

/**
 * The live platform snapshot: counts taken from published rows at request time
 * (SRS CFG 002).
 *
 * A metric is shown only when it is both available and greater than zero. A
 * count that could not be taken is not a zero, and a genuine zero is not an
 * achievement to advertise — in either case the honest thing is to leave the
 * figure out. When nothing can be shown the whole section is omitted by the
 * page, so the reader never meets a row of dashes.
 */
export function aboutMetricEntries(metrics: SiteMetrics): { key: string; label: string; value: number; detail: string }[] {
  const entries = [
    { key: 'businesses', label: 'Published businesses', value: metrics.businesses, detail: 'Listings visitors can browse right now' },
    { key: 'categories', label: 'Active categories', value: metrics.categories, detail: 'Categories holding at least one published listing' },
    { key: 'areas', label: 'Melbourne areas', value: metrics.areas, detail: 'Local areas with listings of their own' },
    { key: 'articles', label: 'Published articles', value: metrics.articles, detail: 'Guides and stories about the city' },
  ];
  return entries.filter((entry): entry is { key: string; label: string; value: number; detail: string } => typeof entry.value === 'number' && entry.value > 0);
}

export function AboutMetrics({ entries }: { entries: ReturnType<typeof aboutMetricEntries> }) {
  return (
    <dl className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {entries.map((entry) => (
        <div key={entry.key} className="ms-glass-dark rounded-card-lg p-6">
          <dt className="text-sm font-semibold text-band-text">{entry.label}</dt>
          <dd className="font-display mt-2 text-[clamp(2.25rem,4vw,3rem)] leading-none tracking-tight text-white">{NUMBER.format(entry.value)}</dd>
          <dd className="mt-3 text-sm leading-relaxed text-band-muted">{entry.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
