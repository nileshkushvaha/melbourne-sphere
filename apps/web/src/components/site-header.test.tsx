// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_SETTINGS } from '@/lib/api';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

const fetchStaticPages = vi.fn<() => Promise<{ slug: string; title: string }[]>>();
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    fetchStaticPages: () => fetchStaticPages(),
    fetchSiteSettings: async () => DEFAULT_SITE_SETTINGS,
    fetchFaqs: async () => [],
  };
});

const loadHeader = async () => (await import('./site-header')).SiteHeader;
const loadFooter = async () => (await import('./site-footer')).SiteFooter;

/**
 * Publication-aware navigation (SRS UX 002, CFG 002): a link appears only for a
 * page a visitor can actually open, so the navigation never points at a 404.
 */
describe('Navigation to the About page', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchStaticPages.mockResolvedValue([]);
  });

  it('omits About from the header while the page is unpublished', async () => {
    const SiteHeader = await loadHeader();
    render(await SiteHeader());
    expect(screen.queryByRole('link', { name: 'About' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Contact' }).length).toBeGreaterThan(0);
  });

  it('shows About in the header once it is published, exactly once per navigation region', async () => {
    fetchStaticPages.mockResolvedValue([{ slug: 'about', title: 'About Melbourne Sphere' }]);
    const SiteHeader = await loadHeader();
    render(await SiteHeader());
    // The header renders a desktop and a mobile navigation; each carries one
    // About link, and both point at the same address.
    const links = screen.getAllByRole('link', { name: 'About' });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/about');
  });

  it('lists published pages in the footer, including ones an administrator added, and nothing that is still a draft', async () => {
    fetchStaticPages.mockResolvedValue([
      { slug: 'about', title: 'About Melbourne Sphere' },
      { slug: 'privacy', title: 'Privacy Policy' },
      // A page created after this code was written needs no change here to
      // appear (SRS 1.7).
      { slug: 'community-guidelines', title: 'Community guidelines' },
    ]);
    const SiteFooter = await loadFooter();
    const { container } = render(await SiteFooter());
    const footer = within(container);
    expect(footer.getByRole('link', { name: 'About Melbourne Sphere' })).toHaveAttribute('href', '/about');
    expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(footer.getByRole('link', { name: 'Community guidelines' })).toHaveAttribute('href', '/community-guidelines');
    expect(footer.queryByRole('link', { name: /terms/i })).not.toBeInTheDocument();
  });
});
