import Image from 'next/image';
import Link from 'next/link';
import { fetchAreas, fetchCategories, fetchSiteSettings, fetchStaticPages, fetchFaqs } from '@/lib/api';
import { renderCopyright } from '@/lib/copyright';
import { contactChannelFrom } from '@/lib/site';
import { ConsentPreferencesLink } from './consent-banner';
import { BrandMark } from './brand-mark';
import { SocialLinks } from './social-links';

/**
 * The Information column, in the order asked for. About is a product route
 * like Contact, so it is always linked; the pages an editor publishes follow.
 *
 * "Add your business" points at the contact page rather than the home page's
 * own call-to-action band: somebody who clicks it from the foot of an article
 * wants the form, not to be sent to the top of a different page.
 */
const INFORMATION_LINKS = [
  { href: '/about', label: 'About us' },
  { href: '/business', label: 'Businesses' },
  { href: '/blog', label: 'Latest articles' },
];
const CONTACT_LINKS = [
  { href: '/contact', label: 'Contact us' },
  { href: '/contact', label: 'Add your business' },
];

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
  const [settings, pages, faqs, categories, areas] = await Promise.all([
    fetchSiteSettings(),
    fetchStaticPages(),
    fetchFaqs(),
    fetchCategories().catch(() => []),
    fetchAreas().catch(() => []),
  ]);
  const topCategories = categories.slice(0, 6);
  const topAreas = areas.slice(0, 6);
  const channel = contactChannelFrom(settings);
  const policyLinks = POLICY_SLUGS.map((slug) => pages.find((page) => page.slug === slug)).filter((page): page is { slug: string; title: string } => page !== undefined);
  const copyright = renderCopyright(settings.footer.copyrightText, { year: new Date().getFullYear(), name: settings.name });

  return (
    <footer className="ms-on-dark border-t border-band-border bg-band-deep text-band-text [background-image:radial-gradient(circle_at_15%_10%,rgba(25,158,216,.12),transparent_32%)]">
      <div className="ms-container py-16 sm:py-20">
        {/* Four columns: the brand, and three of links — the local areas and
            categories people actually browse by, then the pages. Six columns
            read as a wall of text at this width. */}
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
            {/* `whitespace-pre-line`, because the field is a textarea: an editor
                who writes two lines gets two lines, not one run-on sentence. */}
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-band-muted">
              {settings.footer.text ?? 'An independent directory and local blog for Melbourne, Victoria. Every listing is checked by our editors before it is published — one city, covered properly.'}
            </p>
            <div className="mt-5">
              <SocialLinks links={settings.social} label={`${settings.name} on social media`} tone="dark" />
            </div>
            {/* Shown only when an editor has published a routable address; the
                site refuses one on a development domain, so this is never a
                mailto that goes nowhere. */}
            {channel.email && (
              <a href={`mailto:${channel.email}`} className="mt-4 inline-flex min-h-9 items-center text-sm text-band-link underline-offset-4 hover:underline">
                {channel.email}
              </a>
            )}
          </div>

          {topAreas.length > 0 && (
            <nav aria-labelledby="footer-areas" className="text-sm">
              <h2 id="footer-areas" className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
                Local areas
              </h2>
              <ul className="mt-4 flex flex-col gap-1">
                {topAreas.map((area) => (
                  <li key={area.slug}>
                    <Link href={`/business/area/${area.slug}`} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                      {area.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

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

          <nav aria-labelledby="footer-information" className="text-sm">
            <h2 id="footer-information" className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
              Information
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {INFORMATION_LINKS.map((link) => (
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
              {CONTACT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-band-border pt-6 text-xs text-band-muted sm:flex-row sm:items-center sm:justify-between">
          {/* Exactly the line the editor wrote, with {year} and {name} filled
              in. It used to have the organisation name and ", Melbourne,
              Victoria, Australia" appended in code, so an editor who changed
              the line still could not change the end of it. */}
          <p>{copyright}</p>
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
