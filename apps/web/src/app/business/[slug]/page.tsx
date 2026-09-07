import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GlobeIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLdScript } from '@/components/json-ld';
import { breadcrumbJsonLd, localBusinessJsonLd } from '@/lib/structured-data';
import { BusinessCard } from '@/components/business-card';
import { HoursTable } from '@/components/hours-table';
import { statusLabel } from '@/lib/hours';
import { RatingStars } from '@/components/rating-stars';
import { RatingPanel } from '@/components/rating-panel';
import { gridColumns } from '@/components/page-shell';
import { fetchBusiness, fetchReviews, fetchSiteSettings, reviewGuidelinesHref } from '@/lib/api';
import { EnquiryForm } from '@/components/enquiry-form';
import { ReviewForm } from '@/components/review-form';
import { ReviewList } from '@/components/review-list';
import { contactChannelFrom, reviewRichResultsEnabled, turnstileSiteKey } from '@/lib/site';
import { categoryGradient, initials } from '@/lib/category-visuals';
import { CategoryIcon } from '@/components/category-icon';
import { BrandIcon, brandLabel } from '@/components/brand-icon';

export async function generateMetadata({ params }: PageProps<'/business/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const business = await fetchBusiness(slug);
  if (!business) return { title: 'Business not found', robots: { index: false } };
  return {
    title: `${business.name} — ${business.primaryCategory.name} in ${business.localArea.name}`,
    description: business.description.slice(0, 160),
    alternates: { canonical: `/business/${business.slug}` },
    openGraph: { title: business.name, description: business.description.slice(0, 200), images: [business.image?.url ?? '/business-fallback.svg'] },
  };
}

/** Business detail (SRS BUS 001/003/004/005): omits missing optional fields, never fabricates. */
export default async function BusinessPage({ params }: PageProps<'/business/[slug]'>) {
  const { slug } = await params;
  const business = await fetchBusiness(slug);
  if (!business) notFound();
  const [reviews, settings] = await Promise.all([fetchReviews(business.id), fetchSiteSettings()]);
  // The editors' own address, published in the general settings; null until one
  // is configured, and then no correction link is offered rather than a dead one.
  const editorsEmail = contactChannelFrom(settings).email;
  const { contact, address } = business;
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Directory', href: '/directory' }, { label: business.primaryCategory.name, href: `/directory/category/${business.primaryCategory.slug}` }, { label: business.name }];
  const hasContact = contact.phone || contact.email || contact.website || business.links.length > 0;
  const status = business.hours?.status;
  const statusTone = status?.state === 'open' ? 'bg-success/15 text-white' : status?.state === 'closed' ? 'bg-white/10 text-band-muted' : 'bg-white/10 text-band-muted';
  const action = 'inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors';

  return (
    <article>
      <JsonLdScript data={[localBusinessJsonLd(business, { reviewMarkup: reviewRichResultsEnabled() }), breadcrumbJsonLd(crumbs)]} />

      {/* Identity band: who this is, where it is, how it rates and the three
          things a visitor actually wants to do (SRS BUS 001/003). */}
      <div className="ms-on-dark bg-band text-band-text">
        <div className="ms-container py-10 sm:py-14">
          <Breadcrumbs items={crumbs} tone="dark" />
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_26rem] lg:items-start">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-xs">
                <Link href={`/directory/category/${business.primaryCategory.slug}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white/12 px-3.5 font-semibold text-white transition-colors hover:bg-white/20">
                  <CategoryIcon slug={business.primaryCategory.slug} className="size-3.5" />
                  {business.primaryCategory.name}
                </Link>
                {business.secondaryCategories.map((category) => (
                  <Link key={category.slug} href={`/directory/category/${category.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-band-border px-3.5 font-medium text-band-muted transition-colors hover:border-sky-400 hover:text-white">
                    {category.name}
                  </Link>
                ))}
              </p>
              <h1 className="font-display mt-5 text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.06] tracking-tight">{business.name}</h1>
              <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                <Link href={`/directory/area/${business.localArea.slug}`} className="inline-flex items-center gap-1.5 text-band-muted underline-offset-4 hover:text-white hover:underline">
                  <MapPinIcon aria-hidden="true" className="size-4" />
                  {business.localArea.name}, Melbourne
                </Link>
                {business.rating ? (
                  <a href="#reviews-heading" className="inline-flex items-center gap-2 text-band-muted underline-offset-4 hover:text-white hover:underline">
                    <RatingStars value={business.rating.average} size="sm" />
                    <span>
                      <span className="font-semibold text-white">{business.rating.average.toFixed(1)}</span>
                      <span className="sr-only"> out of 5</span> · {business.rating.count} review{business.rating.count === 1 ? '' : 's'}
                    </span>
                  </a>
                ) : (
                  <span className="text-band-muted">No reviews yet</span>
                )}
                {status && <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusTone}`}>{statusLabel(status)}</span>}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {contact.phone && (
                  <a href={contact.phone.telHref} className={`${action} bg-sky-500 text-navy-950 hover:bg-sky-400`}>
                    <PhoneIcon aria-hidden="true" className="size-4" />
                    Call {contact.phone.display}
                  </a>
                )}
                {address && (
                  <a href={address.directionsUrl} target="_blank" rel="noopener noreferrer" className={`${action} border border-band-border bg-white/[0.06] text-white hover:bg-white/12`}>
                    <MapPinIcon aria-hidden="true" className="size-4" />
                    Directions
                  </a>
                )}
                {contact.website && (
                  <a href={contact.website} target="_blank" rel="noopener noreferrer nofollow" className={`${action} border border-band-border bg-white/[0.06] text-white hover:bg-white/12`}>
                    <GlobeIcon aria-hidden="true" className="size-4" />
                    Website
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card-lg bg-navy-950 shadow-lg">
                {business.image ? (
                  <Image src={business.image.url} alt={business.image.alt ?? ''} fill priority sizes="(min-width: 1024px) 26rem, 100vw" className="object-cover" />
                ) : (
                  // The same branded, category-derived panel the cards use, so a
                  // listing without a photograph never shows a stock placeholder.
                  <div aria-hidden="true" className="flex size-full flex-col items-center justify-center gap-3 text-white/90" style={{ background: categoryGradient(business.primaryCategory.slug) }}>
                    <CategoryIcon slug={business.primaryCategory.slug} className="size-12 opacity-80" />
                    <span className="font-display text-4xl tracking-wide">{initials(business.name)}</span>
                  </div>
                )}
              </div>
              {business.gallery.length > 1 && (
                <ul aria-label="Gallery" className="grid grid-cols-3 gap-2">
                  {business.gallery.slice(1, 7).map((image) => {
                    const thumb = image.variants.find((variant) => variant.kind === 'thumbnail') ?? image.variants[0];
                    return thumb ? (
                      <li key={thumb.url}>
                        <figure>
                          <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-navy-950">
                            <Image src={thumb.url} alt={image.alt} fill sizes="9rem" className="object-cover" />
                          </div>
                          {image.caption && <figcaption className="mt-1 text-xs text-band-muted">{image.caption}</figcaption>}
                        </figure>
                      </li>
                    ) : null;
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="ms-container grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
        <div className="flex flex-col gap-12">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="font-display text-2xl tracking-tight">
              About {business.name}
            </h2>
            <p className="mt-3 max-w-prose whitespace-pre-line text-[1.0625rem] leading-relaxed">{business.description}</p>
            {business.services.length > 0 && (
              <>
                <h3 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">Services</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {business.services.map((service) => (
                    <li key={service.slug} className="rounded-full bg-surface-sunken px-3.5 py-1.5 text-sm">
                      {service.name}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <HoursTable hours={business.hours} correctionEmail={editorsEmail} businessName={business.name} />

          <section aria-labelledby="reviews-heading" className="flex flex-col gap-6 scroll-mt-24">
            <h2 id="reviews-heading" className="font-display text-2xl tracking-tight">
              Reviews{reviews.meta.total > 0 ? ` (${reviews.meta.total})` : ''}
            </h2>
            <RatingPanel rating={business.rating} breakdown={business.ratingBreakdown} />
            {/* The panel already says "no reviews yet"; the list would repeat it. */}
            {reviews.data.length > 0 && <ReviewList reviews={reviews.data} />}
            <div id="write-review" className="scroll-mt-24">
              <h3 className="mb-3 text-lg font-semibold">Write a review</h3>
              <ReviewForm businessId={business.id} businessName={business.name} turnstileSiteKey={turnstileSiteKey()} guidelinesHref={await reviewGuidelinesHref()} />
            </div>
          </section>

          <section aria-labelledby="enquiry-heading" className="flex flex-col gap-3">
            <h2 id="enquiry-heading" className="font-display text-2xl tracking-tight">
              Contact {business.name}
            </h2>
            {business.acceptsEnquiries ? (
              <EnquiryForm businessId={business.id} businessName={business.name} turnstileSiteKey={turnstileSiteKey()} />
            ) : (
              <p className="text-text-muted">
                This business does not take messages through Melbourne Sphere. Use the phone number or website above
                {editorsEmail ? (
                  <>
                    , or{' '}
                    <a className="text-link underline underline-offset-2" href={`mailto:${editorsEmail}?subject=${encodeURIComponent(`Listing correction: ${business.name}`)}`}>
                      tell us about a missing contact detail
                    </a>
                  </>
                ) : null}
                .
              </p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div id="contact" className="scroll-mt-24 rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight">Contact and location</h2>
            {!hasContact && !address && <p className="mt-3 text-sm text-text-muted">Contact details have not been published.</p>}
            <dl className="mt-4 flex flex-col gap-4 text-sm">
              {contact.phone && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Phone</dt>
                  <dd className="mt-1">
                    <a href={contact.phone.telHref} className="text-link underline-offset-4 hover:underline">
                      {contact.phone.display}
                    </a>
                  </dd>
                </div>
              )}
              {contact.email && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Email</dt>
                  <dd className="mt-1">
                    <a href={`mailto:${contact.email}`} className="break-all text-link underline-offset-4 hover:underline">
                      {contact.email}
                    </a>
                  </dd>
                </div>
              )}
              {contact.website && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Website</dt>
                  <dd className="mt-1">
                    <a href={contact.website} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-link underline-offset-4 hover:underline">
                      {contact.website.replace(/^https?:\/\//, '')}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">{address ? 'Address' : 'Service area'}</dt>
                <dd className="mt-1">
                  {address ? (
                    <address className="not-italic leading-relaxed">
                      {address.line1}
                      {address.line2 ? <>, {address.line2}</> : null}
                      <br />
                      {address.suburb} VIC {address.postcode}
                    </address>
                  ) : (
                    <>Serves {business.localArea.name} and nearby Melbourne areas; the street address is not published.</>
                  )}
                </dd>
              </div>
            </dl>
            {business.links.length > 0 && (
              // Brand marks, sized to a 44 px target; the platform name (or the
              // editor's own label) stays as the accessible name (SRS NFR 011).
              <ul aria-label="Social links" className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-5">
                {business.links.map((link) => {
                  const name = link.label ?? (link.kind === 'other' ? new URL(link.url).hostname : brandLabel(link.kind));
                  return (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        title={name}
                        className="inline-flex size-11 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-border-strong hover:bg-sky-50 hover:text-link"
                      >
                        <BrandIcon kind={link.kind} size={18} />
                        <span className="sr-only">{name}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {business.related.length > 0 && (
        <section aria-labelledby="related-heading" className="ms-section bg-surface-sunken">
          <div className="ms-container">
            <h2 id="related-heading" className="font-display text-3xl tracking-tight">
              More {business.primaryCategory.name.toLowerCase()} nearby
            </h2>
            <ul className={`mt-8 grid gap-6 ${gridColumns(business.related.length)}`}>
              {business.related.map((related) => (
                <li key={related.id}>
                  <BusinessCard business={related} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
