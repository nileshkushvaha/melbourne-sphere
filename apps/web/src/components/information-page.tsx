import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLdScript } from '@/components/json-ld';
import { breadcrumbJsonLd } from '@/lib/structured-data';

interface Props {
  title: string;
  /** One-line standfirst under the title. */
  intro?: string;
  updatedAt?: string;
  children: ReactNode;
  /** Optional column beside the body: contact details, related links. */
  aside?: ReactNode;
}

const melbourneDate = (value: string) => new Intl.DateTimeFormat('en-AU', { dateStyle: 'long', timeZone: 'Australia/Melbourne' }).format(new Date(value));

/**
 * Shared shell for the information pages (SRS CFG 002): a dark title band that
 * continues the site's light/dark rhythm, then the reading column on the light
 * surface with an optional aside. One layout means About, Contact, Privacy,
 * Terms and the review guidelines all look like the same publication.
 */
export function InformationPage({ title, intro, updatedAt, children, aside }: Props) {
  const crumbs = [{ label: 'Home', href: '/' }, { label: title }];
  return (
    <article>
      <JsonLdScript data={breadcrumbJsonLd(crumbs)} />
      <div className="ms-on-dark bg-band text-band-text">
        <div className="ms-container py-10 sm:py-14">
          <Breadcrumbs items={crumbs} tone="dark" />
          <h1 className="font-display mt-6 max-w-3xl text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.08] tracking-tight">{title}</h1>
          {intro && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-band-muted">{intro}</p>}
          {updatedAt && (
            <p className="mt-6 text-sm text-band-muted">
              Last updated <time dateTime={updatedAt}>{melbourneDate(updatedAt)}</time>
            </p>
          )}
        </div>
      </div>
      <div className="ms-container grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
        <div className="ms-prose">{children}</div>
        {aside && <aside className="lg:pt-1">{aside}</aside>}
      </div>
    </article>
  );
}
