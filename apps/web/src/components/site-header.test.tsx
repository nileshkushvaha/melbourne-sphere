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
// Each case re-imports the header after resetting the module registry, so the
// first assertion in a cold run waits on a real compile. The default 5 s is
// enough on an idle machine and not enough on a busy one; this is about the
// compile, not about the behaviour under test.
const MODULE_LOAD_TIMEOUT_MS = 20_000;

describe('Navigation to the About page', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchStaticPages.mockResolvedValue([]);
  });

  it('always links About from the header, because it is a product route like Contact', async () => {
    const SiteHeader = await loadHeader();
    render(await SiteHeader());
    // The header renders a desktop and a mobile navigation; each carries one
    // About link, and both point at the same address.
    const links = screen.getAllByRole('link', { name: 'About' });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute('href', '/about');
    expect(screen.getAllByRole('link', { name: 'Contact' }).length).toBeGreaterThan(0);
  }, MODULE_LOAD_TIMEOUT_MS);

  it('links About in the footer, then the published pages, and nothing that is still a draft', async () => {
    fetchStaticPages.mockResolvedValue([
      { slug: 'privacy', title: 'Privacy Policy' },
      // A page created after this code was written needs no change here to
      // appear (SRS 1.7).
      { slug: 'community-guidelines', title: 'Community guidelines' },
    ]);
    const SiteFooter = await loadFooter();
    const { container } = render(await SiteFooter());
    const footer = within(container);
    expect(footer.getByRole('link', { name: 'About us' })).toHaveAttribute('href', '/about');
    expect(footer.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy');
    expect(footer.getByRole('link', { name: 'Community guidelines' })).toHaveAttribute('href', '/community-guidelines');
    expect(footer.queryByRole('link', { name: /terms/i })).not.toBeInTheDocument();
  }, MODULE_LOAD_TIMEOUT_MS);
});
