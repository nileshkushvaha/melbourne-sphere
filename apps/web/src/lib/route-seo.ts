import type { Metadata } from 'next';
import { SEO_ROUTES } from '@melbourne-sphere/domain';
import { fetchSiteSettings } from './api';

/**
 * Applies the administrator's search metadata to a route that has no record of
 * its own (SRS SEO 001).
 *
 * Precedence, matching what the settings screen says: a field set for the route
 * replaces the page's built-in text; an empty field keeps it; and the site-wide
 * defaults fill anything still missing. A page therefore stays correct whether
 * or not anything has been configured, and an API failure leaves it exactly as
 * it was written — `fetchSiteSettings` already falls back to the defaults.
 */
export async function routeMetadata(key: (typeof SEO_ROUTES)[number]['key'], base: Metadata): Promise<Metadata> {
  const settings = await fetchSiteSettings();
  const override = settings.seo?.routes?.[key];
  if (!override) return base;

  const title = override.metaTitle ?? undefined;
  const description = override.metaDescription ?? base.description ?? undefined;
  const image = override.ogImage;

  return {
    ...base,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(override.metaKeywords ? { keywords: override.metaKeywords.split(',').map((word) => word.trim()).filter(Boolean) } : {}),
    ...(override.canonicalUrl ? { alternates: { ...base.alternates, canonical: override.canonicalUrl } } : {}),
    // "default" means the page keeps whatever it already declared, which for
    // most pages is nothing at all — the site-wide rule then applies.
    ...(override.robots && override.robots !== 'default'
      ? { robots: { index: !override.robots.includes('noindex'), follow: !override.robots.includes('nofollow') } }
      : {}),
    openGraph: {
      ...base.openGraph,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(image ? { images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt || title || '' }] } : {}),
    },
    twitter: { card: settings.seo?.twitterCard === 'summary' ? 'summary' : 'summary_large_image' },
  };
}

/**
 * The metadata a static page publishes: its own SEO fields, its keywords, and
 * its share image when it sets one. A page that sets no image says nothing
 * here, so the site-wide share image from the root layout stands.
 */
export function staticPageMetadata(
  page: { slug: string; title: string; seoTitle: string | null; seoDescription: string | null; seoKeywords: string | null; ogImage: { url: string; alt: string; width: number; height: number } | null },
  canonical: string = `/${page.slug}`,
): Metadata {
  const title = page.seoTitle ?? page.title;
  const description = page.seoDescription ?? undefined;
  return {
    title,
    description,
    ...(page.seoKeywords ? { keywords: page.seoKeywords.split(',').map((word) => word.trim()).filter(Boolean) } : {}),
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: canonical,
      title,
      description,
      ...(page.ogImage ? { images: [{ url: page.ogImage.url, width: page.ogImage.width, height: page.ogImage.height, alt: page.ogImage.alt || title }] } : {}),
    },
  };
}
