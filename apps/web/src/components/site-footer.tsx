import Image from 'next/image';
import Link from 'next/link';
import { fetchSiteSettings, fetchStaticPages } from '@/lib/api';
import { contactChannelFrom } from '@/lib/site';
import { renderCopyright } from '@/lib/copyright';
import { BrandMark } from './brand-mark';
import { SocialLinks } from './social-links';

const DIRECTORY_LINKS = [
  { href: '/directory', label: 'All businesses' },
  { href: '/directory?sort=rating&minRating=4', label: 'Highly rated' },
  { href: '/directory?sort=newest', label: 'Recently added' },
];

const EDITORIAL_LINKS = [{ href: '/blog', label: 'Latest articles' }];

/**
 * Footer (SRS UX 002, CFG 001): a structured dark band closing the page rhythm.
 * The brand line, description, contact details, social profiles and copyright
 * all come from the general settings; policy pages are listed only once they
 * are published, so no link here points at a 404, and the contact address is
 * shown only when an editor has published a routable one.
 */
export async function SiteFooter() {
  const [settings, pages] = await Promise.all([fetchSiteSettings(), fetchStaticPages()]);
  const channel = contactChannelFrom(settings);
  const { phone, address } = settings.contact;
  const copyright = renderCopyright(settings.footer.copyrightText, { year: new Date().getFullYear(), name: settings.name });

  return (
    <footer className="ms-on-dark border-t border-band-border bg-band-deep text-band-text">
      <div className="ms-container py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-12">
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
            <ul className="mt-4 flex flex-col gap-1 text-band-muted">
              {channel.email && (
                <li>
                  <a className="inline-flex min-h-9 items-center text-band-link underline-offset-4 hover:underline" href={`mailto:${channel.email}`}>
                    {channel.email}
                  </a>
                </li>
              )}
              {phone && (
                <li>
                  <a className="inline-flex min-h-9 items-center text-band-link underline-offset-4 hover:underline" href={phone.telHref}>
                    {phone.display}
                  </a>
                </li>
              )}
              {!channel.email && !phone && <li>Our published contact details are being finalised.</li>}
              <li>
                <Link href="/contact" className="inline-flex min-h-9 items-center text-band-link underline-offset-4 hover:underline">
                  How to reach the editors
                </Link>
              </li>
            </ul>
            {address && <address className="mt-4 whitespace-pre-line not-italic leading-relaxed text-band-muted">{address}</address>}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-band-border pt-6 text-xs text-band-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {copyright}
            {settings.organisationName && settings.organisationName !== settings.name ? ` · ${settings.organisationName}` : ''} · Melbourne, Victoria, Australia
          </p>
          <p className="max-w-2xl sm:text-right">Hours and contact details are supplied by businesses and checked by our editors; tell us when something looks wrong.</p>
        </div>
      </div>
    </footer>
  );
}
