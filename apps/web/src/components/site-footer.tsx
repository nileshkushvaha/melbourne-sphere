import Link from 'next/link';
import { fetchStaticPages } from '@/lib/api';
import { SITE_NAME, contactChannel } from '@/lib/site';
import { BrandMark } from './brand-mark';

const DIRECTORY_LINKS = [
  { href: '/directory', label: 'All businesses' },
  { href: '/directory?sort=rating&minRating=4', label: 'Highly rated' },
  { href: '/directory?sort=newest', label: 'Recently added' },
];

const EDITORIAL_LINKS = [{ href: '/blog', label: 'Latest articles' }];

/**
 * Footer (SRS UX 002): a structured dark band closing the page rhythm. Policy
 * pages are listed only once they are published, so no link here points at a
 * 404, and the contact address is shown only when it is publicly routable.
 */
export async function SiteFooter() {
  const channel = contactChannel();
  const pages = await fetchStaticPages();
  const year = new Date().getFullYear();
  return (
    <footer className="ms-on-dark border-t border-band-border bg-band-deep text-band-text">
      <div className="ms-container py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-12">
          <div className="max-w-sm">
            <p className="flex items-center gap-2.5">
              <BrandMark className="size-8" />
              <span className="font-display text-2xl tracking-tight">{SITE_NAME}</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-band-muted">
              An independent directory and local blog for Melbourne, Victoria. Every listing is checked by our editors before it is published — one city, covered properly.
            </p>
          </div>

          <nav aria-labelledby="footer-directory" className="text-sm">
            <h2 id="footer-directory" className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
              Directory
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

          <nav aria-labelledby="footer-editorial" className="text-sm">
            <h2 id="footer-editorial" className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">
              Editorial
            </h2>
            <ul className="mt-4 flex flex-col gap-1">
              {EDITORIAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="text-sm">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Information</h2>
            {pages.length === 0 ? (
              <p className="mt-4 text-band-muted">Privacy, terms and review guidelines are being prepared and will be linked here once published.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-1">
                {pages.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="inline-flex min-h-9 items-center text-band-muted underline-offset-4 hover:text-white hover:underline">
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-sky-400">Get in touch</h2>
            {channel.available ? (
              <p className="mt-4 text-band-muted">
                Corrections, additions and editorial questions:{' '}
                <a className="text-band-link underline-offset-4 hover:underline" href={`mailto:${channel.email}`}>
                  {channel.email}
                </a>
              </p>
            ) : (
              <p className="mt-4 text-band-muted">Our published contact address is being finalised.</p>
            )}
            <p className="mt-2">
              <Link href="/contact" className="inline-flex min-h-9 items-center text-band-link underline-offset-4 hover:underline">
                How to reach the editors
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-band-border pt-6 text-xs text-band-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {SITE_NAME} · Melbourne, Victoria, Australia
          </p>
          <p className="max-w-2xl sm:text-right">Hours and contact details are supplied by businesses and checked by our editors; tell us when something looks wrong.</p>
        </div>
      </div>
    </footer>
  );
}
