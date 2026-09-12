import type { Metadata } from 'next';
import { routeMetadata } from '@/lib/route-seo';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRightIcon, MapPinIcon, PenLineIcon, ShieldCheckIcon } from 'lucide-react';
import { JsonLdScript } from '@/components/json-ld';
import { organizationJsonLd, webSiteJsonLd } from '@/lib/structured-data';
import { BusinessCard } from '@/components/business-card';
import { TestimonialCarousel } from '@/components/testimonial-carousel';
import { PartnerStrip } from '@/components/partner-strip';
import { CategoryIcon } from '@/components/category-icon';
import { FeaturedPostCard, PostCard } from '@/components/post-card';
import { Band, SectionHeading, cardGridColumns, gridColumns } from '@/components/page-shell';
import { fetchAreas, fetchCategories, fetchHome, fetchPosts, fetchSiteSettings, flattenCategories, searchBusinesses, type BusinessCard as BusinessCardData, type PublicArea, type PublicCategory, type PostCard as PostCardData, type SearchMeta, fetchTestimonials, fetchPartners } from '@/lib/api';
import { HeroHeadline } from '@/components/hero-headline';
import { HeroSearch } from '@/components/hero-search';
import { HeroBanner } from '@/components/hero-banner';
import { heroSlides } from '@/lib/hero-assets';
import { usablePhrases } from '@/lib/hero';
import { contactChannelFrom } from '@/lib/site';

/** The front page's metadata, with any administrator overrides applied (SEO 001). */
export function generateMetadata(): Promise<Metadata> {
  return routeMetadata('home', { alternates: { canonical: '/' } });
}
/** Rendered per request (data cached 300 s per fetch) so builds never depend on a live API (SRS CACHE 001). */
export const dynamic = 'force-dynamic';

/**
 * One section's data. Each band loads independently, so a single failing
 * endpoint degrades its own section instead of taking down the page — and a
 * failure is never presented as "nothing to show" (SRS DIR 006, NFR 012).
 */
type Loaded<T> = { ok: true; data: T } | { ok: false };

function settle<T>(result: PromiseSettledResult<T>): Loaded<T> {
  return result.status === 'fulfilled' ? { ok: true, data: result.value } : { ok: false };
}

/** Inline failure state for one band; the rest of the page is unaffected. */
function SectionError({ what, tone = 'light' }: { what: string; tone?: 'light' | 'dark' }) {
  return (
    <p
      role="status"
      className={`mt-8 rounded-card border px-5 py-6 text-sm ${tone === 'dark' ? 'border-band-border bg-white/5 text-band-muted' : 'border-border bg-surface-raised text-text-muted'}`}
    >
      We couldn’t load {what} just now. Everything else on this page still works —{' '}
      <Link href="/" className={`font-semibold underline underline-offset-4 ${tone === 'dark' ? 'text-band-link' : 'text-link'}`}>
        try again
      </Link>
      .
    </p>
  );
}

/** Neutral empty state, used when a section has loaded but has nothing published yet. */
function SectionEmpty({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <p className={`mt-8 rounded-card border border-dashed px-5 py-6 text-sm ${tone === 'dark' ? 'border-band-border text-band-muted' : 'border-border-strong text-text-muted'}`}>{children}</p>
  );
}

/**
 * Discovery home (SRS UX 003: a business is reachable within three
 * interactions). The page alternates full-bleed light and dark bands — hero,
 * categories, listings, Melbourne areas, stories, call to action — and every
 * block is real published data: a block with nothing to show says so rather
 * than being filled with placeholders.
 */
export default async function HomePage() {
  // Started first so it runs alongside the band data; it never rejects, because
  // the shell must render even when the settings endpoint is unavailable.
  const settingsPromise = fetchSiteSettings();
  const [homeResult, categoriesResult, areasResult, newestResult, topRatedResult, postsResult, testimonialsResult, partnersResult] = await Promise.allSettled([
    fetchHome(),
    fetchCategories(),
    fetchAreas(),
    searchBusinesses({ q: '', category: null, area: null, minRating: null, openNow: false, sort: 'newest', page: 1 }),
    searchBusinesses({ q: '', category: null, area: null, minRating: 4, openNow: false, sort: 'rating', page: 1 }),
    fetchPosts({ page: 1 }),
    fetchTestimonials(),
    fetchPartners(),
  ]);
  const settings = await settingsPromise;

  const home = settle(homeResult);
  const categories: Loaded<PublicCategory[]> = settle(categoriesResult);
  const areas: Loaded<PublicArea[]> = settle(areasResult);
  const newest: Loaded<{ data: BusinessCardData[]; meta: SearchMeta }> = settle(newestResult);
  const topRated: Loaded<{ data: BusinessCardData[]; meta: SearchMeta }> = settle(topRatedResult);
  const posts: Loaded<{ data: PostCardData[] }> = settle(postsResult);

  const heroContent = home.ok ? home.data : { heroHeadline: 'Discover Melbourne businesses', heroPhrases: [], heroSlides: [], counters: undefined };
  const phrases = usablePhrases(heroContent.heroPhrases);
  const categoryOptions = categories.ok ? flattenCategories(categories.data).map((c) => ({ slug: c.slug, label: c.parent ? `${c.parent.name} › ${c.name}` : c.name })) : [];
  const featured = newest.ok ? (newest.data.meta.featured ?? []) : [];
  const channel = contactChannelFrom(settings);
  const areasWithIntro = areas.ok ? areas.data.filter((area) => (area.editorialIntro ?? '').trim().length > 0) : [];
  // Both fetchers already fall back to an empty list, so an unavailable API
  // omits the band rather than failing the page.
  const testimonials = testimonialsResult.status === 'fulfilled' ? testimonialsResult.value : [];
  const partners = partnersResult.status === 'fulfilled' ? partnersResult.value : [];
  const leadPost = posts.ok ? posts.data.data[0] : undefined;
  const supportingPosts = posts.ok ? posts.data.data.slice(1, 4) : [];

  return (
    <>
      <JsonLdScript data={[organizationJsonLd({ name: settings.name, logoUrl: settings.branding.logo?.url ?? null, sameAs: settings.social.map((link) => link.url) }), webSiteJsonLd(settings.name)]} />

      <HeroBanner slides={heroSlides(heroContent.heroSlides)}>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-white backdrop-blur">
          <MapPinIcon aria-hidden="true" className="size-3.5" />
          Melbourne, Victoria
        </p>
        <HeroHeadline headline={heroContent.heroHeadline} phrases={phrases} />
        <HeroSearch categories={categoryOptions} />
        {home.ok && home.data.counters && (
          <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { label: 'Published businesses', value: home.data.counters.businesses },
              { label: 'Categories', value: home.data.counters.categories },
              { label: 'Local areas', value: home.data.counters.areas },
            ].map((counter) => (
              <div key={counter.label}>
                <dd className="font-display text-4xl tracking-tight text-white">{counter.value.toLocaleString('en-AU')}</dd>
                <dt className="mt-1 text-sm text-hero-text">{counter.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </HeroBanner>

      {/* 2 — Category discovery, light */}
      <Band tone="plain" aria-labelledby="categories-heading">
        <SectionHeading
          id="categories-heading"
          eyebrow="Browse"
          title="Browse businesses by category"
          description="Every category is curated by our editors and lists only published Melbourne businesses."
          href="/business"
          linkLabel="View all categories"
        />
        {!categories.ok ? (
          <SectionError what="our categories" />
        ) : categories.data.length === 0 ? (
          <SectionEmpty>Categories are being prepared. In the meantime you can browse every published listing in the directory.</SectionEmpty>
        ) : (
          // Four across on a desktop: the directory now has enough categories
          // that three left a long column, and a tile is a picture and two
          // lines rather than a paragraph, so it reads fine at a quarter.
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.data.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/business/category/${category.slug}`}
                  className="ms-card-lift group flex h-full flex-col overflow-hidden rounded-card-lg border border-white/80 bg-white/75 p-7 shadow-md backdrop-blur-md"
                >
                  {category.image ? (
                    // The category's own picture, where an editor has chosen one;
                    // the icon stays the mark for the ones without.
                    <span className="relative -mx-7 -mt-7 mb-5 block aspect-[16/9] overflow-hidden bg-navy-950">
                      <Image src={category.image.url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    </span>
                  ) : (
                    <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-white text-sky-700 shadow-sm ring-1 ring-sky-500/10">
                      <CategoryIcon slug={category.slug} className="size-6" />
                    </span>
                  )}
                  <h3 className="mt-5 text-lg font-semibold tracking-tight group-hover:text-link">{category.name}</h3>
                  {category.description ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">{category.description}</p>
                  ) : (
                    category.children.length > 0 && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-muted">{category.children.map((child) => child.name).join(' · ')}</p>
                  )}
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-link">
                    Browse {category.name.toLowerCase()}
                    <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
            {/* Completes the grid and gives the section its own way out. */}
            <li>
              <Link href="/business" className="ms-on-dark ms-card-lift ms-glass-dark group flex h-full min-h-44 flex-col justify-end rounded-card-lg p-7 text-band-text">
                <h3 className="font-display text-2xl">Every Melbourne listing</h3>
                <p className="mt-2 text-sm leading-relaxed text-band-muted">Search the full directory by keyword, category, local area or rating.</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-band-link">
                  Browse businesses
                  <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          </ul>
        )}
      </Band>

      {/* 3 — Listings, soft neutral */}
      <Band tone="soft" aria-labelledby="newest-heading">
        {featured.length > 0 && (
          <div className="mb-16">
            <SectionHeading id="featured-heading" eyebrow="Featured" title="Featured Melbourne businesses" description="A small, clearly labelled set of placements. They never displace organic results." />
            <ul className={`mt-10 grid gap-6 ${gridColumns(Math.min(featured.length, 3))}`}>
              {featured.slice(0, 3).map((business) => (
                <li key={business.id}>
                  <BusinessCard business={business} featured />
                </li>
              ))}
            </ul>
          </div>
        )}

        <SectionHeading
          id="newest-heading"
          eyebrow="Recently added"
          title="New on Melbourne Sphere"
          description="The newest listings our editors have verified and published."
          href="/business?sort=newest"
          linkLabel="All businesses"
        />
        {!newest.ok ? (
          <SectionError what="the newest listings" />
        ) : newest.data.data.length === 0 ? (
          <SectionEmpty>No listings are published yet. Businesses are added as our editors verify them.</SectionEmpty>
        ) : (
          <ul className={`mt-10 grid gap-6 ${gridColumns(Math.min(newest.data.data.length, 8))}`}>
            {newest.data.data.slice(0, 8).map((business) => (
              <li key={business.id}>
                <BusinessCard business={business} />
              </li>
            ))}
          </ul>
        )}

        {topRated.ok && topRated.data.data.length > 0 && (
          <div className="mt-20">
            <SectionHeading
              id="rated-heading"
              eyebrow="Reviewed by locals"
              title="Highly rated in Melbourne"
              description="Averages come from approved reviews only."
              href="/business?sort=rating&minRating=4"
              linkLabel="See highly rated"
            />
            <ul className={`mt-10 grid gap-6 ${gridColumns(Math.min(topRated.data.data.length, 4))}`}>
              {topRated.data.data.slice(0, 4).map((business) => (
                <li key={business.id}>
                  <BusinessCard business={business} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </Band>

      {/* 4 — Melbourne localities, dark */}
      <Band tone="dark" aria-labelledby="areas-heading">
        <SectionHeading
          id="areas-heading"
          eyebrow="Melbourne, Victoria"
          title="Find businesses by local area"
          description="We cover Melbourne only — the CBD and the suburbs around it — so an area page is a real neighbourhood, not a generated location page."
          tone="dark"
        />
        {!areas.ok ? (
          <SectionError what="Melbourne local areas" tone="dark" />
        ) : areas.data.length === 0 ? (
          <SectionEmpty tone="dark">Local areas are being reviewed and will appear here once approved.</SectionEmpty>
        ) : (
          <>
            {areasWithIntro.length > 0 && (
              <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {areasWithIntro.slice(0, 6).map((area) => (
                  <li key={area.id}>
                    <Link href={`/business/area/${area.slug}`} className="ms-glass-dark group flex h-full flex-col overflow-hidden rounded-card-lg p-7 transition-all hover:-translate-y-1 hover:border-sky-400">
                      {area.image && (
                        <span className="relative -mx-7 -mt-7 mb-5 block aspect-[16/9] overflow-hidden bg-navy-950">
                          <Image src={area.image.url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                        </span>
                      )}
                      <h3 className="font-display text-2xl text-white">{area.name}</h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-band-muted">{area.editorialIntro}</p>
                      <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-band-link">
                        See {area.name} businesses
                        <ArrowRightIcon aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {areas.data.map((area) => (
                <li key={area.id}>
                  <Link
                    href={`/business/area/${area.slug}`}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-band-border bg-white/[0.05] px-5 text-sm font-semibold text-white backdrop-blur transition-all hover:-translate-y-0.5 hover:border-sky-400 hover:bg-white/10"
                  >
                    <MapPinIcon aria-hidden="true" className="size-4 shrink-0 text-sky-400" />
                    <span className="truncate">{area.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Band>

      {/* 5 — Editorial, light */}
      <Band tone="page" aria-labelledby="blog-heading">
        <SectionHeading
          id="blog-heading"
          eyebrow="Stories"
          title="From the Melbourne Sphere blog"
          description="Local guides and stories written by our editors."
          href="/blog"
          linkLabel="All articles"
        />
        {!posts.ok ? (
          <SectionError what="our latest articles" />
        ) : !leadPost ? (
          <SectionEmpty>The first articles are being written. They will appear here as soon as they are published.</SectionEmpty>
        ) : (
          <div className="mt-10 flex flex-col gap-6">
            {/* Far below the hero, so its picture does not compete with the page's real LCP image. */}
            <FeaturedPostCard post={leadPost} headingLevel={3} priority={false} />
            {supportingPosts.length > 0 && (
              <ul className={`grid gap-6 ${cardGridColumns}`}>
                {supportingPosts.map((post) => (
                  <li key={post.id}>
                    <PostCard post={post} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Band>

      {/* Client and partner organisations — public marketing content only; these
          records grant nobody any access (SRS 1.2 PTNR 001). Omitted when none
          is published and authorised, rather than rendering an empty strip. */}
      {partners.length > 0 && (
        <Band tone="plain" aria-labelledby="partners-heading">
          <SectionHeading id="partners-heading" eyebrow="Working with" title="Clients and partners" />
          <PartnerStrip partners={partners} />
        </Band>
      )}

      {/* 6 — Call to action, dark */}
      <Band tone="dark" id="business-listing" aria-labelledby="cta-heading">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">For business owners</p>
            <h2 id="cta-heading" className="font-display text-4xl leading-tight sm:text-5xl">
              Run a business in Melbourne?
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-band-muted">
              Send us your details and our editors will check and publish the listing for you. There is nothing to sign up for and nothing to pay.
            </p>
            {channel.listingMailto ? (
              <a
                href={channel.listingMailto}
                className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-sky-500 px-7 text-base font-semibold text-navy-950 transition-colors hover:bg-sky-400"
              >
                Add or update a business
                <ArrowRightIcon aria-hidden="true" className="size-5" />
              </a>
            ) : (
              // No publishable address is configured yet, so no dead contact
              // route is offered (SRS CFG 002).
              <p className="mt-8 rounded-card border border-band-border bg-white/5 px-5 py-4 text-sm text-band-muted">
                Our published contact address is being finalised. Listing requests reopen here as soon as it is confirmed.
              </p>
            )}
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {[
              { icon: PenLineIcon, title: 'No account needed', body: 'There are no business logins in Melbourne Sphere. You email us; we do the rest.' },
              { icon: ShieldCheckIcon, title: 'Checked before publishing', body: 'Our editors verify the details and the Melbourne location before a listing goes live.' },
              { icon: MapPinIcon, title: 'Melbourne only', body: 'We cover one city properly instead of thousands of generated location pages.' },
            ].map((item) => (
              <li key={item.title} className="ms-glass-dark flex gap-4 rounded-card-lg p-6">
                <item.icon aria-hidden="true" className="size-6 shrink-0 text-sky-400" />
                <div>
                  <h3 className="text-base font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-band-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Band>

      {/* Testimonials — omitted entirely when nothing is approved and published
          (SRS 1.2 TSTM 004): an empty band would be a placeholder, and the
          specification is explicit that the site ships without invented copy. */}
      {testimonials.length > 0 && (
        <Band tone="soft" aria-labelledby="testimonials-heading">
          <SectionHeading id="testimonials-heading" eyebrow="In their words" title="What Melbourne businesses say" description="Quotes published with the permission of the people who gave them." />
          <TestimonialCarousel testimonials={testimonials} />
        </Band>
      )}
    </>
  );
}
