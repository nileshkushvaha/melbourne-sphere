import 'server-only';
import type { BusinessDetail, PostDetail } from './api';
import { SITE_NAME, absoluteUrl, siteOrigin } from './site';

/**
 * JSON-LD builders (SRS SEO 005–007). Every value comes from what the page
 * actually shows: nothing is invented, and fields the editor left empty are
 * omitted rather than guessed.
 */
export type JsonLdValue = string | number | boolean | null | JsonLd | JsonLdValue[];
export interface JsonLd {
  [key: string]: JsonLdValue | undefined;
}

/**
 * Serialises JSON-LD so no string can close the script element or open a
 * comment, even if an editor pasted such text into a field (SRS SEO 007).
 */
export function serialiseJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** Removes undefined, null and empty values so incomplete data never ships. */
function compact(input: JsonLd): JsonLd {
  const out: JsonLd = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    out[key] = value;
  }
  return out;
}

/** Organisation identity (SRS SEO 005). The name and logo come from the published general settings when they are available. */
export function organizationJsonLd(options: { name?: string; logoUrl?: string | null; sameAs?: string[] } = {}): JsonLd {
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteOrigin()}/#organization`,
    name: options.name ?? SITE_NAME,
    sameAs: options.sameAs ?? [],
    url: siteOrigin(),
    logo: options.logoUrl ?? undefined,
    areaServed: compact({ '@type': 'City', name: 'Melbourne', addressRegion: 'VIC', addressCountry: 'AU' }),
  });
}

export function webSiteJsonLd(name: string = SITE_NAME): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteOrigin()}/#website`,
    name,
    url: siteOrigin(),
    inLanguage: 'en-AU',
    publisher: { '@id': `${siteOrigin()}/#organization` },
  };
}

export function breadcrumbJsonLd(items: { label: string; href?: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.href ? absoluteUrl(item.href) : undefined,
      }),
    ),
  };
}

/** Maps a directory category to the most accurate LocalBusiness subtype we can justify. */
const BUSINESS_TYPES: Record<string, string> = {
  cafes: 'CafeOrCoffeeShop',
  cafe: 'CafeOrCoffeeShop',
  coffee: 'CafeOrCoffeeShop',
  restaurants: 'Restaurant',
  restaurant: 'Restaurant',
  bars: 'BarOrPub',
  pubs: 'BarOrPub',
  bakeries: 'Bakery',
  hairdressers: 'HairSalon',
  'beauty-salons': 'BeautySalon',
  gyms: 'ExerciseGym',
  'health-fitness': 'HealthAndBeautyBusiness',
  dentists: 'Dentist',
  florists: 'Florist',
  bookshops: 'BookStore',
  shopping: 'Store',
  retail: 'Store',
  plumbers: 'Plumber',
  electricians: 'Electrician',
  'real-estate': 'RealEstateAgent',
  hotels: 'Hotel',
};

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

/**
 * LocalBusiness for a listing page. Address, phone, geo and hours appear only
 * when they are published on the page itself (SRS SEO 005).
 */
export interface LocalBusinessJsonLdOptions {
  /**
   * Emit AggregateRating (SRS SEO 006). Off unless the technical lead has
   * confirmed current Google eligibility for directory reviews and set
   * REVIEW_RICH_RESULTS=true; visible ratings on the page are unaffected.
   */
  reviewMarkup?: boolean;
}

export function localBusinessJsonLd(business: BusinessDetail, options: LocalBusinessJsonLdOptions = {}): JsonLd {
  const type = BUSINESS_TYPES[business.primaryCategory.slug] ?? 'LocalBusiness';
  const address = business.address;
  const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  const weekly = business.hours?.weekly;
  // Only published, scheduled intervals are described; "unknown" hours produce nothing.
  const hours =
    business.hours?.mode === 'scheduled' && weekly
      ? DAY_KEYS.flatMap((day) => {
          const entry = weekly[day];
          if (entry.state === 'open24') {
            return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAY_LABELS[day]}`, opens: '00:00', closes: '23:59' } satisfies JsonLd];
          }
          if (entry.state !== 'intervals') return [];
          return (entry.intervals ?? []).map(
            (interval) =>
              ({
                '@type': 'OpeningHoursSpecification',
                dayOfWeek: `https://schema.org/${DAY_LABELS[day]}`,
                opens: interval.start,
                closes: interval.end,
              }) satisfies JsonLd,
          );
        })
      : [];

  const rating =
    options.reviewMarkup === true && business.rating && business.rating.count > 0
      ? compact({
          '@type': 'AggregateRating',
          ratingValue: business.rating.average,
          reviewCount: business.rating.count,
          bestRating: 5,
          worstRating: 1,
        })
      : undefined;

  return compact({
    '@context': 'https://schema.org',
    '@type': type,
    '@id': absoluteUrl(`/business/${business.slug}#business`),
    name: business.name,
    description: business.description,
    url: absoluteUrl(`/business/${business.slug}`),
    telephone: business.contact?.phone?.display ?? undefined,
    email: business.contact?.email ?? undefined,
    sameAs: business.links?.map((link) => link.url) ?? [],
    image: business.image?.url ?? undefined,
    address:
      address && (address.line1 || address.suburb)
        ? compact({
            '@type': 'PostalAddress',
            streetAddress: address.line1 ?? undefined,
            addressLocality: address.suburb ?? undefined,
            postalCode: address.postcode ?? undefined,
            addressRegion: 'VIC',
            addressCountry: 'AU',
          })
        : undefined,
    geo:
      address?.latitude != null && address?.longitude != null
        ? { '@type': 'GeoCoordinates', latitude: address.latitude, longitude: address.longitude }
        : undefined,
    openingHoursSpecification: hours,
    aggregateRating: rating,
  });
}

/** BlogPosting for an article, with the author as a Person when a profile exists. */
export function blogPostingJsonLd(post: PostDetail): JsonLd {
  const image = post.cover.find((variant) => variant.kind === 'hero') ?? post.cover.at(-1);
  return compact({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': absoluteUrl(`/blog/${post.slug}#article`),
    headline: post.title,
    description: post.seoDescription ?? post.excerpt,
    url: absoluteUrl(`/blog/${post.slug}`),
    datePublished: post.firstPublishedAt,
    dateModified: post.updatedAt,
    inLanguage: 'en-AU',
    image: image?.url ?? undefined,
    articleSection: post.category.name,
    keywords: post.tags.map((tag) => tag.name),
    author: compact({
      '@type': 'Person',
      name: post.author.displayName,
      jobTitle: post.author.role ?? undefined,
      description: post.author.shortBio ?? undefined,
      image: post.author.image?.url ?? undefined,
      sameAs: post.author.links.map((link) => link.url),
      url: post.author.websiteUrl ?? undefined,
    }),
    publisher: { '@id': `${siteOrigin()}/#organization` },
  });
}
