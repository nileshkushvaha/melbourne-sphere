import Link from 'next/link';
import { SITE_NAME, contactChannel } from '@/lib/site';
import { fetchStaticPages } from '@/lib/api';
import { BrandMark } from './brand-mark';
import { HeaderNav, type NavLink } from './header-nav';

/**
 * Public navigation (SRS UX 002): a full-width navy band above the hero, sticky,
 * keyboard reachable and usable without JavaScript. The listing action is
 * always offered but never points at a dead address: a routable mailbox when
 * one is configured, and the contact page otherwise.
 */
export async function SiteHeader() {
  const pages = await fetchStaticPages();
  const published = new Set(pages.map((page) => page.slug));
  // About appears only once it is published, so no nav item points at a 404;
  // /contact always resolves, because it explains how to reach the editors even
  // before the approved page exists (SRS UX 002/003).
  const links: NavLink[] = [
    { href: '/', label: 'Home' },
    { href: '/directory', label: 'Directory' },
    { href: '/blog', label: 'Blog' },
    ...(published.has('about') ? [{ href: '/about', label: 'About' }] : []),
    { href: '/contact', label: 'Contact' },
  ];
  const channel = contactChannel();
  // A routable mailbox is the shortest path; otherwise the contact page, which
  // always resolves. The action is always offered (SRS UX 002) and never points
  // at a dead address.
  const action = { href: channel.listingMailto ?? '/contact', label: 'Add a business' };

  return (
    <header className="ms-on-dark sticky top-0 z-40 border-b border-band-border bg-band-deep/95 text-band-text backdrop-blur supports-[backdrop-filter]:bg-band-deep/85">
      <div className="ms-container flex items-center py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg py-1 text-white">
          <BrandMark className="size-9" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl tracking-tight">{SITE_NAME}</span>
            <span className="mt-0.5 text-[0.65rem] font-medium uppercase tracking-[0.16em] text-band-muted">Melbourne, Victoria</span>
          </span>
        </Link>
        <HeaderNav links={links} action={action} />
      </div>
    </header>
  );
}
