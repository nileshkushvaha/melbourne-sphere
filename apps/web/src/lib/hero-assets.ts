import type { HeroSlide } from '@/components/hero-banner';

/**
 * Licensed Melbourne photography shipped with the site (SRS HERO 001).
 *
 * These are the fallback slides: whenever an administrator configures banner
 * images in site settings, those replace this set entirely. They exist so the
 * homepage is never a flat colour panel while the client's own photography is
 * being commissioned, and they are stored locally (never hot-linked) as
 * pre-cropped 2560×1440 WebP with EXIF stripped.
 *
 * Both are Creative Commons *Attribution* images — no share-alike obligation —
 * and the required credit is rendered with the banner. Sources and licences are
 * recorded in `docs/content/hero-photography.md`.
 */
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    url: '/hero/flinders-street-evening.webp',
    previewUrl: '/hero/flinders-street-evening.webp',
    alt: 'A tram passes Flinders Street Station in the Melbourne CBD on a summer evening',
    caption: 'Flinders Street Station · photo Caroline Jones, CC BY 2.0',
    focalX: 0.5,
    focalY: 0.42,
    width: 2560,
    height: 1440,
  },
  {
    url: '/hero/degraves-street-laneway.webp',
    previewUrl: '/hero/degraves-street-laneway.webp',
    alt: 'Cafés, awnings and hanging signs along Degraves Street, a laneway in the Melbourne CBD',
    caption: 'Degraves Street · photo -wuppertaler, CC BY 4.0',
    focalX: 0.58,
    focalY: 0.5,
    width: 2560,
    height: 1440,
  },
];

/** Admin-configured banners win; the licensed defaults fill in until then. */
export function heroSlides(configured: HeroSlide[] | undefined): HeroSlide[] {
  return configured && configured.length > 0 ? configured : DEFAULT_HERO_SLIDES;
}
