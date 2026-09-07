import { Breadcrumbs } from './breadcrumbs';

interface Props {
  eyebrow: string;
  title: string;
  crumbs: { label: string; href?: string }[];
  /** Plain standfirst. */
  description?: string;
  /** Editor-written landing content, already sanitised by the API (SRS SEC 001). */
  bodyHtml?: string | null;
  /** e.g. "12 businesses" — the collection's own count, when there is one. */
  meta?: string;
}

/**
 * Dark title band for a collection page (blog category or tag, directory
 * category or local area). One component keeps every landing page in the same
 * light/dark rhythm as the home page instead of a bare heading on white.
 */
export function CollectionHeader({ eyebrow, title, crumbs, description, bodyHtml, meta }: Props) {
  return (
    <div className="ms-on-dark bg-band text-band-text">
      <div className="ms-container py-10 sm:py-14">
        <Breadcrumbs items={crumbs} tone="dark" />
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">{eyebrow}</p>
        <h1 className="font-display mt-3 max-w-3xl text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.06] tracking-tight">{title}</h1>
        {description && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-band-muted">{description}</p>}
        {bodyHtml && <div className="ms-prose mt-5 max-w-2xl text-band-muted [&_a]:text-band-link [&_strong]:text-white" dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
        {meta && <p className="mt-6 text-sm text-band-muted">{meta}</p>}
      </div>
    </div>
  );
}
