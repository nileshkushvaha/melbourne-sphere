import Image from 'next/image';
import Link from 'next/link';
import { fetchCategories, fetchSiteSettings, fetchStaticPages, fetchFaqs } from '@/lib/api';
import { renderCopyright } from '@/lib/copyright';
import { ConsentPreferencesLink } from './consent-banner';
import { BrandMark } from './brand-mark';
import { SocialLinks } from './social-links';

const DIRECTORY_LINKS = [
  { href: '/business', label: 'All businesses' },
  { href: '/business?sort=rating&minRating=4', label: 'Highly rated' },
  { href: '/business?sort=newest', label: 'Recently added' },
  { href: '/#business-listing', label: 'Add your business' },
];

const EDITORIAL_LINKS = [{ href: '/blog', label: 'Latest articles' }];

/**
 * The pages that belong in the bottom bar rather than the Information column:
 * people look for them at the foot of the page, and listing them twice is
 * clutter. In the order they are usually cited.
 */
const POLICY_SLUGS = ['privacy', 'terms', 'review-guidelines'];

/**
 * Footer (SRS UX 002, CFG 001): a structured dark band closing the page rhythm.
 *
 * The columns are the directory itself — the categories and areas people
 * actually browse by — rather than three links and a lot of space. Every one
 * of them is a page that exists: categories and areas come from the API, so a
 * category an editor retires stops being linked, and the policy pages appear
 * only once they are published. No link here points at a 404.
 *
 * A postal address and a phone number are deliberately absent: this directory
 * has neither, and a footer that invents them tells visitors something untrue.
 * The email and the contact page are the routes that exist.
 */
export async function SiteFooter() {
  const [settings, pages, faqs, categories] = await Promise.all([
    fetchSiteSettings(),
    fetchStaticPages(),
    fetchFaqs(),
    fetchCategories().catch(() => []),
  ]);
  // The parents people recognise, and the areas with the most to show.
  const topCategories = categories.slice(0, 6);
  const policyLinks = POLICY_SLUGS.map((slug) => pages.find((page) => page.slug === slug)).filter((page): page is { slug: string; title: string } => page !== undefined);
  const copyright = renderCopyright(settings.footer.copyrightText, { year: new Date().getFullYear(), name: settings.name });

  return (
    <footer className="ms-on-dark border-t border-band-border bg-band-deep text-band-text [background-image:radial-gradient(circle_at_15%_10%,rgba(25,158,216,.12),transparent_32%)]">
      <div className="ms-container py-16 sm:py-20">
        {/* Four columns: the brand, and three of links. Six read as a wall of
            text, and the local areas have their own band on the home page and a
            page each, so they lose nothing by not being repeated here. */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] lg:gap-10">
          <div className="max-w-sm">
            <p className="flex items-center gap-2.5">
              {settings.branding.logo ? (
                <Image src={settings.branding.logo.url} alt={settings.branding.logo.alt || settings.name} width={settings.branding.logo.width} height={settings.branding.logo.height} className="h-8 w-auto object-contain" />
              ) : (
                <>
                  <BrandMark className="size-8" />
                  <span className="font-display text-2xl tracking-tight">{settings.name}</span>
                </>
              )}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-band-muted">
              {settings.footer.text ?? 'An independent directory and local blog for Melbourne, Victoria. Every listing is checked by our editors before it is published — one city, covered properly.'}
            </p>
            <div className="mt-5">
              <SocialLinks links={settings.social} label={`${settings.name} on social media`} tone="dark" />
            </div>
          </div>

          <nav aria-labelledby="footer-businesses" className="text-sm">
            <h2 id="footer-businesses" className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
              Businesses
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {DIRECTORY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {topCategories.length > 0 && (
            <nav aria-labelledby="footer-categories" className="text-sm">
              <h2 id="footer-categories" className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                Categories
              </h2>
              <ul className="mt-4 flex flex-col gap-1">
                {topCategories.map((category) => (
                  <li key={category.slug}>
                    <Link href={`/business/category/${category.slug}`} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          <div className="text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Information</h2>
            {pages.length === 0 && faqs.length === 0 ? (
              <ul className="mt-4 flex flex-col gap-1">
                {EDITORIAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/contact" className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                    Contact us
                  </Link>
                </li>
              </ul>
            ) : (
              <ul className="mt-4 flex flex-col gap-1">
                {EDITORIAL_LINKS.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
                {/* Linked only once a question is actually published, on the same
                    rule as the information pages: no link ever points at a 404. */}
                {faqs.length > 0 && (
                  <li>
                    <Link href="/faqs" className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                      FAQs
                    </Link>
                  </li>
                )}
                {pages.filter((page) => !POLICY_SLUGS.includes(page.slug)).map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                      {page.title}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/contact" className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                    Contact us
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-band-border pt-6 text-xs text-band-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {copyright}
            {settings.organisationName && settings.organisationName !== settings.name ? ` · ${settings.organisationName}` : ''} · Melbourne, Victoria, Australia
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:justify-end">
            {/* The policies, in the place people look for them. Each appears
                only once its page is published, so the bar never offers a link
                to an empty page — an unpublished policy is a gap to fill in the
                admin, not a 404 to ship. */}
            {policyLinks.map((page) => (
              <Link key={page.slug} href={`/${page.slug}`} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                {page.title}
              </Link>
            ))}
            {/* Only rendered once the question has been answered, so it is a way
                back to a decision rather than a second prompt. */}
            <ConsentPreferencesLink />
          </div>
        </div>
      </div>
    </footer>
  );
}
