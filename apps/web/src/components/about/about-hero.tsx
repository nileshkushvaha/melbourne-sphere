import Image from 'next/image';
import { MapPinIcon, ShieldCheckIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';

export interface AboutHeroImage {
  url: string;
  alt: string;
  /** Credit line required by the image licence; omitted when the licence does not require one. */
  credit: string | null;
  focalX: number;
  focalY: number;
}

/**
 * Compact photographic hero for the About page.
 *
 * Deliberately shorter than the homepage banner — this page is a document, not
 * a discovery surface, so the introduction has to be readable without
 * scrolling past a full screen of photograph. The image is a decorative
 * background behind a navy directional overlay, and the overlay is opaque
 * enough on its own that the text meets contrast even before the photograph
 * loads, or if it never does.
 */
export function AboutHero({ title, intro, image }: { title: string; intro: string; image: AboutHeroImage | null }) {
  return (
    <section className="ms-on-dark relative isolate overflow-hidden bg-band text-band-text">
      {image && (
        <Image
          src={image.url}
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          style={{ objectPosition: `${image.focalX * 100}% ${image.focalY * 100}%` }}
          className="-z-20 object-cover"
        />
      )}
      {/* Two layers: a directional wash for the type, and a flat floor so the
          left column keeps its contrast at every viewport width. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(6,24,33,.94)_0%,rgba(13,40,72,.86)_46%,rgba(13,40,72,.55)_100%)]" />

      <div className="ms-container py-10 sm:py-12 lg:py-14">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'About' }]} tone="dark" />
        <div className="mt-6 grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
              <MapPinIcon aria-hidden="true" className="size-3.5" />
              About Melbourne Sphere
            </p>
            <h1 className="font-display mt-4 max-w-3xl text-[clamp(2.1rem,4.4vw,3.25rem)] leading-[1.06] tracking-tight">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-band-muted sm:text-lg">{intro}</p>
          </div>

          <p className="ms-glass-dark flex items-start gap-3 rounded-card-lg p-5 text-sm leading-relaxed text-band-muted">
            <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky-300" />
            <span>
              <span className="block font-semibold text-white">Edited, not uploaded</span>
              Every listing is created and checked by our editors, and every public review and comment is moderated before it appears.
            </span>
          </p>
        </div>
        {image?.credit && <p className="mt-8 text-xs text-band-muted">{image.credit}</p>}
      </div>
    </section>
  );
}
