// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SiteMetrics, StaticPageContent } from '@/lib/api';
import { DEFAULT_SITE_SETTINGS } from '@/lib/api';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound }));

const fetchStaticPage = vi.fn<() => Promise<StaticPageContent | null>>();
const fetchSiteMetrics = vi.fn<() => Promise<SiteMetrics>>();
const fetchSiteSettings = vi.fn(async () => DEFAULT_SITE_SETTINGS);
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, fetchStaticPage: () => fetchStaticPage(), fetchSiteMetrics: () => fetchSiteMetrics(), fetchSiteSettings: () => fetchSiteSettings() };
});

const PAGE: StaticPageContent = {
  slug: 'about',
  title: 'About Melbourne Sphere',
  body: '<p>Melbourne Sphere is an independent directory of businesses across Melbourne.</p>',
  seoTitle: 'About Melbourne Sphere',
  seoDescription: 'An independently edited directory of Melbourne businesses, local guides and city stories.',
  seoKeywords: null,
  ogImage: null,
  updatedAt: '2026-09-08T01:00:00.000Z',
};

const METRICS: SiteMetrics = { businesses: 42, categories: 9, areas: 5, articles: 3, countedAt: '2026-09-08T01:00:00.000Z' };

const load = async () => (await import('./page')).default;
const loadMetadata = async () => (await import('./page')).generateMetadata;

/**
 * The About page (SRS CFG 002 as amended in SRS 1.6). What matters here is that
 * publication is respected, that no statistic is ever invented, and that the
 * page keeps working when a secondary source fails.
 */
describe('About page', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.SITE_ORIGIN = 'https://melbournesphere.example';
    fetchStaticPage.mockResolvedValue(PAGE);
    fetchSiteMetrics.mockResolvedValue(METRICS);
    fetchSiteSettings.mockResolvedValue(DEFAULT_SITE_SETTINGS);
    notFound.mockClear();
  });

  it('renders the administrator’s title and copy, with one h1 and a breadcrumb trail', async () => {
    const AboutPage = await load();
    render(await AboutPage());

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('About Melbourne Sphere');
    expect(screen.getByText(/independent directory of businesses/i)).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('404s while the page is still a draft, so no unapproved copy is public', async () => {
    fetchStaticPage.mockResolvedValue(null);
    const AboutPage = await load();
    await expect(AboutPage()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('keeps a draft out of the index rather than describing a page nobody can read', async () => {
    fetchStaticPage.mockResolvedValue(null);
    expect(await (await loadMetadata())()).toMatchObject({ robots: { index: false } });
    fetchStaticPage.mockResolvedValue(PAGE);
    expect(await (await loadMetadata())()).toMatchObject({
      title: 'About Melbourne Sphere',
      description: PAGE.seoDescription,
      alternates: { canonical: '/about' },
    });
  });

  it('shows the live counts it was given, formatted, in a description list', async () => {
    const AboutPage = await load();
    render(await AboutPage());
    const snapshot = screen.getByRole('region', { name: /what is published today/i });
    expect(within(snapshot).getByText('42')).toBeInTheDocument();
    expect(within(snapshot).getByText('Published businesses')).toBeInTheDocument();
  });

  it('omits the snapshot entirely when the counts are unavailable — never a row of zeros', async () => {
    fetchSiteMetrics.mockResolvedValue({ businesses: null, categories: null, areas: null, articles: null, countedAt: METRICS.countedAt });
    const AboutPage = await load();
    render(await AboutPage());
    expect(screen.queryByRole('region', { name: /what is published today/i })).not.toBeInTheDocument();
    // The rest of the page is unaffected by that failure.
    expect(screen.getByRole('heading', { name: /how a listing reaches the site/i })).toBeInTheDocument();
  });

  it('treats a genuine zero as nothing to boast about', async () => {
    fetchSiteMetrics.mockResolvedValue({ businesses: 0, categories: 0, areas: 0, articles: 4, countedAt: METRICS.countedAt });
    const AboutPage = await load();
    render(await AboutPage());
    const snapshot = screen.getByRole('region', { name: /what is published today/i });
    expect(within(snapshot).queryByText('0')).not.toBeInTheDocument();
    expect(within(snapshot).getByText('4')).toBeInTheDocument();
  });

  it('offers the business action only when a contact address is actually published', async () => {
    const AboutPage = await load();
    const { unmount } = render(await AboutPage());
    expect(screen.queryByRole('link', { name: /add or update a business/i })).not.toBeInTheDocument();
    unmount();

    fetchSiteSettings.mockResolvedValue({ ...DEFAULT_SITE_SETTINGS, contact: { ...DEFAULT_SITE_SETTINGS.contact, email: 'editors@melbournesphere.au' } });
    render(await AboutPage());
    const action = screen.getByRole('link', { name: /add or update a business/i });
    expect(action).toHaveAttribute('href', expect.stringContaining('mailto:editors@melbournesphere.au'));
  });

  it('never publishes a development contact address', async () => {
    const AboutPage = await load();
    const { container } = render(await AboutPage());
    expect(container.innerHTML).not.toMatch(/\.local|\.test\b|example\.com/i);
  });

  it('describes the steps in order, as a numbered list that survives without its styling', async () => {
    const AboutPage = await load();
    render(await AboutPage());
    const steps = screen.getByRole('heading', { name: /how a listing reaches the site/i }).closest('section')!.querySelector('ol')!;
    expect(steps.tagName).toBe('OL');
    expect(steps.querySelectorAll('li')).toHaveLength(5);
    expect(steps.querySelector('li')).toHaveTextContent('Step 1');
  });

  it('links only to routes that exist, and gives the hero photograph a credit', async () => {
    const AboutPage = await load();
    const { container } = render(await AboutPage());
    const hrefs = [...container.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href'));
    expect(new Set(hrefs)).toEqual(new Set(['/', '/business', '/blog', '/contact']));
    expect(screen.getByText(/CC BY 4\.0/)).toBeInTheDocument();
  });
});
