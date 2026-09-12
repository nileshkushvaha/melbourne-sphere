import { screen } from '@testing-library/react';
import { EditorialTermsPage } from '@/pages/blog/EditorialTermsPage';
import { BLOG_TAGS_CONFIG } from '@/pages/blog/editorial-configs';
import { PagesPage } from '@/pages/website/PagesPage';
import { TestimonialsPage } from '@/pages/website/TestimonialsPage';
import { ServiceAlertsPage } from '@/pages/website/ServiceAlertsPage';
import { AdministratorsPage } from '@/pages/admins/AdministratorsPage';
import { AuthorsPage } from '@/pages/blog/AuthorsPage';
import { renderWithProviders, providerWithPermissions } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

/**
 * A filter that renders but never reaches the server is worse than no filter:
 * it answers confidently with the unfiltered list. These assert the request
 * that actually goes out when the screen is opened with the filter in the
 * address bar.
 */
describe('list filters reach the API', () => {
  const originalFetch = globalThis.fetch;
  let urls: string[] = [];
  beforeEach(() => {
    urls = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return jsonResponse(200, { data: [], meta: { page: 1, pageSize: 20, total: 0, pageCount: 1 } });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const asked = (path: string, ...params: string[]) => {
    const hit = urls.find((url) => url.includes(path) && params.every((param) => url.includes(param)));
    expect(hit, `no request to ${path} carrying ${params.join(' & ')}. Requests: ${urls.join(' | ')}`).toBeTruthy();
  };

  it('sends the blog tag search and status', async () => {
    renderWithProviders(<EditorialTermsPage config={BLOG_TAGS_CONFIG} />, {
      initialEntries: ['/admin/blog-tags?q=coffee&status=inactive'],
      authProvider: providerWithPermissions(['posts.write']),
    });
    await screen.findByRole('heading', { level: 1 });
    asked('/admin/blog-tags', 'q=coffee', 'status=inactive');
  });

  it('sends the page search and status', async () => {
    renderWithProviders(<PagesPage />, { initialEntries: ['/admin/website/pages?q=about&status=draft'], authProvider: providerWithPermissions(['settings.manage']) });
    await screen.findByRole('heading', { level: 1 });
    asked('/admin/pages', 'q=about', 'status=draft');
  });

  it('sends the testimonial search', async () => {
    renderWithProviders(<TestimonialsPage />, { initialEntries: ['/admin/website/testimonials?q=bakery'], authProvider: providerWithPermissions(['website.testimonials.view']) });
    await screen.findByRole('heading', { level: 1 });
    asked('/admin/testimonials', 'q=bakery');
  });

  it('sends the alert title search and severity', async () => {
    renderWithProviders(<ServiceAlertsPage />, { initialEntries: ['/admin/website/service-alerts?q=holiday&severity=warning'], authProvider: providerWithPermissions(['website.alerts.view']) });
    await screen.findByRole('heading', { level: 1 });
    asked('/admin/service-alerts', 'q=holiday', 'severity=warning');
  });

  it('sends the author search to the server rather than filtering in the browser', async () => {
    renderWithProviders(<AuthorsPage />, { initialEntries: ['/admin/authors?q=priya&status=active'], authProvider: providerWithPermissions(['posts.write']) });
    await screen.findByRole('heading', { level: 1 });
    asked('/admin/authors', 'q=priya', 'status=active');
  });

  it('sends the administrator role filter', async () => {
    renderWithProviders(<AdministratorsPage />, { initialEntries: ['/admin/admins?role=editor'], authProvider: providerWithPermissions(['admins.manage', 'roles.view']) });
    await screen.findByRole('heading', { level: 1 });
    asked('/admin/admins', 'role=editor');
  });
});
