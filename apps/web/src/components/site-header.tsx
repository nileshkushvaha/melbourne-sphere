import Image from 'next/image';
import Link from 'next/link';
import { MailIcon, PhoneIcon } from 'lucide-react';
import { contactChannelFrom } from '@/lib/site';
import { fetchSiteSettings, fetchStaticPages } from '@/lib/api';
import { BrandMark } from './brand-mark';
import { SocialLinks } from './social-links';
import { HeaderNav, type NavLink } from './header-nav';

/**
 * Public navigation (SRS UX 002): a full-width navy band above the hero,
 * keyboard reachable and usable without JavaScript. The name, logo, contact
 * strip and social profiles all come from the general settings an administrator
 * edits (CFG 001); anything unset is omitted rather than rendered blank, and the
 * listing action is always offered but never points at a dead address.
 *
 * The contact strip scrolls away and the navigation stays pinned (client
 * instruction, 7 Sep 2026). They are siblings rather than one sticky block
 * because a `sticky` child only sticks within its own parent's box: nested
 * inside the header it would unpin the moment the header scrolled past. No
 * scroll listener is involved, so there is nothing to jank on a slow device.
 */
export async function SiteHeader() {
  const [settings, pages] = await Promise.all([fetchSiteSettings(), fetchStaticPages()]);
  const published = new Set(pages.map((page) => page.slug));
  // About appears only once it is published, so no nav item points at a 404;
  // /contact always resolves, because it explains how to reach the editors even
  // before the approved page exists (SRS UX 002/003).
  const links: NavLink[] = [
    { href: '/', label: 'Home' },
    { href: '/business', label: 'Businesses' },
    { href: '/blog', label: 'Blog' },
    ...(published.has('about') ? [{ href: '/about', label: 'About' }] : []),
    { href: '/contact', label: 'Contact' },
  ];
  const channel = contactChannelFrom(settings);
  const action = { href: channel.listingMailto ?? '/contact', label: 'Add a business' };
  const { phone } = settings.contact;
  const topBar = settings.headerTopBarEnabled && (phone !== null || channel.email !== null || settings.social.length > 0);

  return (
    <>
      {topBar && (
        <div aria-label="Contact details" className="ms-on-dark border-b border-white/10 bg-band-deep text-band-text">
          <div className="ms-container flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-1 text-xs">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {phone && (
                <a href={phone.telHref} className="inline-flex min-h-9 items-center gap-1.5 text-band-muted transition-colors hover:text-white">
                  <PhoneIcon aria-hidden="true" className="size-3.5" />
                  {phone.display}
                </a>
              )}
              {channel.email && (
                <a href={`mailto:${channel.email}`} className="inline-flex min-h-9 items-center gap-1.5 text-band-muted transition-colors hover:text-white">
                  <MailIcon aria-hidden="true" className="size-3.5" />
                  {channel.email}
                </a>
              )}
            </div>
            <SocialLinks links={settings.social} label={`${settings.name} on social media`} tone="dark" />
          </div>
        </div>
      )}
      <header className="ms-on-dark sticky top-0 z-40 border-b border-band-border bg-band-deep/92 text-band-text shadow-[0_12px_40px_-28px_rgba(0,0,0,.8)] backdrop-blur-xl supports-[backdrop-filter]:bg-band-deep/78">
        <div className="ms-container flex items-center py-3.5">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg py-1 text-white">
            {settings.branding.logo ? (
              // Height-constrained, so any uploaded aspect ratio fits the bar.
              <Image
                src={settings.branding.logo.url}
                alt={settings.branding.logo.alt || settings.name}
                width={settings.branding.logo.width}
                height={settings.branding.logo.height}
                priority
                className="h-9 w-auto object-contain"
              />
            ) : (
              <>
                <BrandMark className="size-9" />
                <span className="flex flex-col leading-none">
                  <span className="font-display text-lg">{settings.name}</span>
                  <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-band-muted">Melbourne, Victoria</span>
                </span>
              </>
            )}
          </Link>
          <HeaderNav links={links} action={action} />
        </div>
      </header>
    </>
  );
}
