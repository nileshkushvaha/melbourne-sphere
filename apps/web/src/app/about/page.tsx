import type { Metadata } from 'next';
import { staticPageMetadata } from '@/lib/route-seo';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRightIcon, BookOpenIcon, CompassIcon, MapIcon, MessageSquareIcon, PenLineIcon, SearchIcon, ShieldCheckIcon, StoreIcon } from 'lucide-react';
import { AboutHero, type AboutHeroImage } from '@/components/about/about-hero';
import { AboutMetrics, aboutMetricEntries } from '@/components/about/about-metrics';
import { AboutProcess } from '@/components/about/about-process';
import { Band, SectionHeading } from '@/components/page-shell';
import { JsonLdScript } from '@/components/json-ld';
import { fetchSiteMetrics, fetchSiteSettings, fetchStaticPage } from '@/lib/api';
import { contactChannelFrom } from '@/lib/site';
import { aboutPageJsonLd, breadcrumbJsonLd } from '@/lib/structured-data';

export const dynamic = 'force-dynamic';

/**
 * Hero photograph: licensed Melbourne photography already shipped with the
 * site and stored locally, never hot-linked, with the credit its licence
 * requires. Replacing it with the client's own commissioned photograph is
 * recorded as outstanding in docs/content/hero-photography.md.
 */
const HERO_IMAGE: AboutHeroImage = {
  url: '/hero/degraves-street-laneway.webp',
  alt: 'Cafés, awnings and hanging signs along Degraves Street, a laneway in the Melbourne CBD',
  credit: 'Degraves Street · photo -wuppertaler, CC BY 4.0',
  focalX: 0.58,
  focalY: 0.5,
};

/** Standfirst under the H1, used when the editor has not written a meta description. */
const HERO_INTRO = 'Melbourne Sphere brings trusted local businesses, useful neighbourhood information and independent city stories together in one carefully edited place.';

const OFFERS = [
  {
    icon: SearchIcon,
    title: 'Local business discovery',
    body: 'Search by what you need, filter by category, local area, rating or whether somewhere is open now, and reach a listing with hours, contact details and directions in a few steps.',
    href: '/business',
    linkLabel: 'Browse businesses',
  },
  {
    icon: MapIcon,
    title: 'Neighbourhood by neighbourhood',
    body: 'Local area pages are written about the places they cover, so a search that starts with a suburb ends somewhere worth reading rather than on a generated list.',
    href: '/business',
    linkLabel: 'Explore Melbourne areas',
  },
  {
    icon: BookOpenIcon,
    title: 'Independent guides and stories',
    body: 'Our blog covers the city around the directory: what is opening, what is changing and how to find your way about. It is written by our editors, not supplied by the businesses we list.',
    href: '/blog',
    linkLabel: 'Read the blog',
  },
  {
    icon: MessageSquareIcon,
    title: 'Contributions that are checked',
    body: 'Visitors can leave reviews and comments, and report anything that looks wrong. Everything public is moderated by an editor first — nothing appears automatically.',
    href: '/contact',
    linkLabel: 'Report something',
  },
];

const PROCESS = [
  { title: 'Details received', body: 'A business owner, a reader or one of our editors sends us the details of a business worth listing.' },
  { title: 'Melbourne checked', body: 'We confirm the business operates in Melbourne. Anywhere else is out of scope, whatever else it has going for it.' },
  { title: 'Information reviewed', body: 'An editor checks the details we would publish — name, category, area, hours, contact routes — against what the business itself says.' },
  { title: 'Listing published', body: 'The listing goes live with the information we could verify. Anything we could not confirm is left out rather than guessed at.' },
  { title: 'Kept current', body: 'Corrections are welcome and prioritised, and reviews and comments on the listing are moderated as they arrive.' },
];

const PRINCIPLES = [
  { title: 'Local relevance', body: 'One city, covered properly. We would rather be a good guide to Melbourne than a thin guide to everywhere.' },
  { title: 'Editorial care', body: 'A person decides what is published. Listings are researched and checked, not accepted from a form.' },
  { title: 'Clear moderation', body: 'Reviews and comments are read by an editor before they appear, and our guidelines say what is and is not published.' },
  { title: 'Useful over promotional', body: 'Featured placements are labelled as such and never displace ordinary results. Nothing is ranked by what it paid.' },
  { title: 'Accessible discovery', body: 'The site is built to WCAG 2.2 AA: keyboard-usable, readable at 200% zoom and legible on a small screen.' },
  { title: 'Respect for privacy', body: 'We collect what we need to answer you and to moderate what you post, and nothing more. Our privacy policy sets out the detail.' },
];

const MELBOURNE_POINTS = [
  'Local area pages are written about the places they cover, so they are worth reading in their own right.',
  'Categories reflect how people in Melbourne actually search, rather than a template applied to every city.',
  'Editors who know the city can tell when a listing is wrong, out of date or in the wrong suburb.',
  'We do not mass-generate location pages: a page exists because there was something to say on it.',
  'Businesses get context — the area, the category and the stories around them — instead of an entry in a vacuum.',
];

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchStaticPage('about');
  if (!page) return { title: 'About', robots: { index: false } };
  return staticPageMetadata(page, '/about');
}

/**
 * About (SRS CFG 002 as amended in SRS 1.6, SCP 001–005).
 *
 * The title, introduction, SEO fields and publication state belong to the
 * administrator — they come from the `about` information page — and this
 * template composes them with what must not be retyped by hand: the live
 * directory counts, the configured contact route and a description of how the
 * product actually works. An unpublished page is a 404 here exactly as it is on
 * the policy pages, so the route never shows draft copy.
 *
 * Everything is server-rendered. A failure anywhere but the page content itself
 * removes one section rather than the page: the counts fall back to null and
 * the settings to their documented defaults.
 */
export default async function AboutPage() {
  const [page, settings, metrics] = await Promise.all([fetchStaticPage('about'), fetchSiteSettings(), fetchSiteMetrics()]);
  if (!page) notFound();

  const channel = contactChannelFrom(settings);
  const crumbs = [{ label: 'Home', href: '/' }, { label: page.title }];
  const metricEntries = aboutMetricEntries(metrics);

  return (
    <>
      <JsonLdScript data={[breadcrumbJsonLd(crumbs), aboutPageJsonLd({ name: page.title, description: page.seoDescription, updatedAt: page.updatedAt })]} />

      <AboutHero title={page.title} intro={page.seoDescription ?? HERO_INTRO} image={HERO_IMAGE} />

      {/* 1 — The administrator's own copy, on the reading surface. */}
      <Band tone="plain" aria-labelledby="mission-heading">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
          <div>
            <h2 id="mission-heading" className="font-display text-3xl leading-[1.1] sm:text-4xl">
              Why Melbourne Sphere exists
            </h2>
            {/* Sanitised by the API with an allowlist before storage (SRS SEC 001). */}
            <div className="ms-prose mt-6" dangerouslySetInnerHTML={{ __html: page.body }} />
          </div>
          <aside className="lg:pt-2">
            <div className="overflow-hidden rounded-card-lg border border-border shadow-sm">
              <Image
                src="/hero/flinders-street-evening.webp"
                alt="A tram passes Flinders Street Station in the Melbourne CBD on a summer evening"
                width={2560}
                height={1440}
                sizes="(min-width: 1024px) 22rem, 100vw"
                className="h-auto w-full"
              />
            </div>
            <p className="mt-3 text-xs text-text-muted">Flinders Street Station · photo Caroline Jones, CC BY 2.0</p>
            <dl className="mt-6 rounded-card-lg border border-border bg-surface-raised p-6 text-sm shadow-sm">
              <dt className="font-semibold">Covers</dt>
              <dd className="mt-1 text-text-muted">Melbourne, Victoria, Australia</dd>
              <dt className="mt-4 font-semibold">Published by</dt>
              <dd className="mt-1 text-text-muted">{settings.organisationName ?? settings.name}</dd>
              <dt className="mt-4 font-semibold">Listings added by</dt>
              <dd className="mt-1 text-text-muted">Our editors, after checking the details</dd>
            </dl>
          </aside>
        </div>
      </Band>

      {/* 2 — Live snapshot. Omitted entirely when there is nothing true to show. */}
      {metricEntries.length > 0 && (
        <Band tone="dark" aria-labelledby="snapshot-heading">
          <SectionHeading
            id="snapshot-heading"
            eyebrow="Right now"
            title="What is published today"
            description="Counted from the site itself when this page loaded, not written by hand. Figures we cannot count are left out rather than estimated."
            tone="dark"
          />
          <AboutMetrics entries={metricEntries} />
        </Band>
      )}

      {/* 3 — What the site offers. */}
      <Band tone="soft" aria-labelledby="offers-heading">
        <SectionHeading id="offers-heading" eyebrow="What you can do here" title="Four things this site is for" />
        <ul className="mt-10 grid gap-5 sm:grid-cols-2">
          {OFFERS.map((offer) => (
            <li key={offer.title} className="flex h-full flex-col rounded-card-lg border border-white/80 bg-white/80 p-7 shadow-md backdrop-blur-md">
              <span aria-hidden="true" className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-white text-sky-700 shadow-sm ring-1 ring-sky-500/10">
                <offer.icon className="size-5" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">{offer.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{offer.body}</p>
              <Link href={offer.href} className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-5 text-sm font-semibold text-link underline-offset-4 hover:underline">
                {offer.linkLabel}
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      {/* 4 — How a listing becomes trusted. */}
      <Band tone="plain" aria-labelledby="process-heading">
        <SectionHeading
          id="process-heading"
          eyebrow="How it works"
          title="How a listing reaches the site"
          description="There are no business accounts: owners contact us, and our editors create and maintain the listing. We check what we can, and say what we cannot."
        />
        <AboutProcess steps={PROCESS} />
        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-text-muted">
          We check that a business operates in Melbourne and that the details we publish match what the business tells us. We do not certify, endorse, license or
          background-check anyone, and we cannot guarantee that every detail stays current — which is why every listing carries a correction route.
        </p>
      </Band>

      {/* 5 — Melbourne only. */}
      <Band tone="deep" aria-labelledby="melbourne-heading" className="ms-dot-grid">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <SectionHeading
              id="melbourne-heading"
              eyebrow="One city"
              title="Why Melbourne only"
              description="Covering one city is a decision, not a limitation we are waiting to grow out of."
              tone="dark"
            />
            <ul className="mt-8 flex flex-col gap-4">
              {MELBOURNE_POINTS.map((point) => (
                <li key={point} className="flex gap-3 text-band-muted">
                  <CompassIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky-300" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="ms-glass-dark rounded-card-lg p-7">
            <h3 className="font-display text-2xl">Where Melbourne stops</h3>
            <p className="mt-3 leading-relaxed text-band-muted">
              Eligibility is checked against the local areas we currently cover, centred on the City of Melbourne council area. Whether that extends further across
              Greater Melbourne is a decision still with our client; until it is taken, the areas listed on the site are the areas we cover.
            </p>
            <Link href="/business" className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-band-link underline-offset-4 hover:underline">
              See the areas we cover
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </Band>

      {/* 6 — Principles. */}
      <Band tone="page" aria-labelledby="principles-heading">
        <SectionHeading id="principles-heading" eyebrow="Our principles" title="How we decide what to publish" />
        <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title} className="rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm">
              <dt className="text-base font-semibold tracking-tight">{principle.title}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-text-muted">{principle.body}</dd>
            </div>
          ))}
        </dl>
      </Band>

      {/* 7 — Taking part. */}
      <Band tone="soft" aria-labelledby="participate-heading">
        <SectionHeading id="participate-heading" eyebrow="Taking part" title="How to get involved" />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-card-lg border border-border bg-surface-raised p-7 shadow-sm">
            <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-card bg-sky-50 text-sky-700">
                <PenLineIcon className="size-4" strokeWidth={1.8} />
              </span>
              If you live here
            </h3>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-text-muted marker:text-sky-600">
              <li>
                <Link href="/business" className="text-link underline-offset-4 hover:underline">
                  Find a business
                </Link>{' '}
                by category, area or what it does.
              </li>
              <li>
                <Link href="/blog" className="text-link underline-offset-4 hover:underline">
                  Read our guides
                </Link>{' '}
                to the city and its neighbourhoods.
              </li>
              <li>Leave a review on a listing, or comment on an article. Both are moderated before they appear.</li>
              <li>Report a review, a comment or a listing detail that is wrong — each one carries a report or correction action.</li>
            </ul>
          </div>
          <div className="rounded-card-lg border border-border bg-surface-raised p-7 shadow-sm">
            <h3 className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
              <span aria-hidden="true" className="inline-flex size-9 items-center justify-center rounded-card bg-sky-50 text-sky-700">
                <StoreIcon className="size-4" strokeWidth={1.8} />
              </span>
              If you run a business here
            </h3>
            <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-text-muted marker:text-sky-600">
              <li>Send us your details and an editor will check them and create the listing. There is no charge and no account to create.</li>
              <li>Ask us to correct or update anything already published — hours, phone number, website, address or category.</li>
              <li>Listings are managed by our editors, so there is nothing to log in to and nothing to maintain.</li>
            </ul>
            {channel.listingMailto ? (
              <a href={channel.listingMailto} className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-link underline-offset-4 hover:underline">
                Email us about a listing
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </a>
            ) : (
              <Link href="/contact" className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-link underline-offset-4 hover:underline">
                How to reach the editors
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>
        </div>
      </Band>

      {/* 8 — Closing call to action. */}
      <Band tone="dark" aria-labelledby="cta-heading">
        <div className="ms-glass-dark rounded-card-lg p-8 sm:p-12">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
            <div className="max-w-2xl">
              <h2 id="cta-heading" className="font-display text-3xl leading-[1.1] sm:text-4xl">
                Start with the directory
              </h2>
              <p className="mt-3 leading-relaxed text-band-muted">Everything we publish is here to be used: the listings, the areas and the writing around them.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/business" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-sky-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-sky-400">
                <SearchIcon aria-hidden="true" className="size-4" />
                Browse businesses
              </Link>
              <Link href="/blog" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                <BookOpenIcon aria-hidden="true" className="size-4" />
                Read the blog
              </Link>
              {channel.listingMailto && (
                <a
                  href={channel.listingMailto}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/30 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <ShieldCheckIcon aria-hidden="true" className="size-4" />
                  Add or update a business
                </a>
              )}
            </div>
          </div>
        </div>
      </Band>
    </>
  );
}
