import { screen, within } from '@testing-library/react';
import { AppRoutes } from '@/app/routes';
import { EditorialTermsPage } from './EditorialTermsPage';
import { BLOG_CATEGORIES_CONFIG } from './editorial-configs';
import { PostsPage } from './PostsPage';
import { renderWithProviders, authenticatedProvider, user } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';
import { melbourneLocalToUtc, utcToMelbourneLocal } from '@/api/blog';

const now = '2026-09-06T00:00:00.000Z';
const author = { id: 'a1', displayName: 'Alex Editor', slug: 'alex-editor', bio: null, active: true, postCount: 1, version: 1, updatedAt: now };
const category = { id: 'c1', name: 'City guides', slug: 'city-guides', landingContent: '<p>Guides</p>', active: true, postCount: 1, version: 1, updatedAt: now };
const tag = { id: 't1', name: 'Coffee', slug: 'coffee', landingContent: null, active: true, postCount: 1, version: 1, updatedAt: now };
const post = {
  id: 'p1', title: 'Best laneway coffee', slug: 'best-laneway-coffee', status: 'draft', authorId: 'a1', authorName: 'Alex Editor',
  categoryId: 'c1', categoryName: 'City guides', tagIds: ['t1'], commentsEnabled: true, scheduledAt: null, publishedAt: null,
  firstPublishedAt: null, publicationBlockers: ['Excerpt must be at least 20 characters'], version: 2, updatedAt: now,
  excerpt: 'short', bodyMarkdown: '# Coffee\n\nBody text.', sanitizedBody: '<h2>Coffee</h2><p>Body text.</p>', coverAlt: null,
  seoTitle: null, seoDescription: null, archivedAt: null, createdAt: now,
};
const meta = { page: 1, pageSize: 20, total: 1, pageCount: 1 };

describe('blog admin screens', () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method: string; body?: string }[] = [];
  let publishAttempts = 0;
  beforeEach(() => {
    calls.length = 0;
    publishAttempts = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.startsWith('/api/v1/admin/posts?') || url === '/api/v1/admin/posts') {
        if (method === 'GET') return jsonResponse(200, { data: [post], meta });
        return jsonResponse(201, { data: { ...post, id: 'p2' } });
      }
      if (url === '/api/v1/admin/posts/p1' && method === 'GET') return jsonResponse(200, { data: post });
      if (url === '/api/v1/admin/posts/p1/publish') {
        publishAttempts += 1;
        if (publishAttempts === 1) {
          return jsonResponse(409, { error: { code: 'PUBLICATION_BLOCKED', message: 'blocked', fields: { publication: ['Excerpt must be at least 20 characters'] }, requestId: 'r' } });
        }
        return jsonResponse(200, { data: { ...post, status: 'published', version: 3 } });
      }
      if (url === '/api/v1/admin/posts/p1/schedule') return jsonResponse(200, { data: { ...post, status: 'scheduled', scheduledAt: '2026-10-03T23:00:00.000Z', version: 3 } });
      if (url.startsWith('/api/v1/admin/authors')) return method === 'GET' ? jsonResponse(200, { data: [author] }) : jsonResponse(201, { data: author });
      if (url.startsWith('/api/v1/admin/blog-categories')) return jsonResponse(200, { data: [category] });
      if (url.startsWith('/api/v1/admin/blog-tags')) return jsonResponse(200, { data: [tag] });
      return jsonResponse(200, { data: { status: 'ok' } });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists articles with their state and links to the editor', async () => {
    renderWithProviders(<PostsPage />, { initialEntries: ['/admin/posts?status=draft'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Articles' })).toBeInTheDocument();
    const row = (await screen.findByRole('link', { name: 'Best laneway coffee' })).closest('tr')!;
    expect(within(row).getByText('draft')).toBeInTheDocument();
    expect(within(row).getByText('incomplete')).toBeInTheDocument();
    expect(calls[0]?.url).toBe('/api/v1/admin/posts?status=draft&page=1&pageSize=20');
  });

  it('shows the sanitised preview and surfaces publication blockers from the API', async () => {
    const ue = user();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/posts/p1'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Best laneway coffee' })).toBeInTheDocument();
    expect(await screen.findByText('Not ready to publish')).toBeInTheDocument();
    const preview = screen.getByTestId('post-preview');
    expect(preview.innerHTML).toBe('<h2>Coffee</h2><p>Body text.</p>');

    await ue.click(screen.getByRole('button', { name: /^publish$/i }));
    const dialog = await screen.findByRole('dialog');
    await ue.click(within(dialog).getByRole('button', { name: /^publish$/i }));
    expect(await within(dialog).findByText('Excerpt must be at least 20 characters')).toBeInTheDocument();
    await ue.click(within(dialog).getByRole('button', { name: /^publish$/i }));
    const publishes = calls.filter((c) => c.url.endsWith('/publish'));
    expect(publishes).toHaveLength(2);
    expect(JSON.parse(publishes[1]!.body!)).toMatchObject({ expectedVersion: 2 });
  });

  it('sends a Melbourne schedule as a UTC instant', async () => {
    const ue = user();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/posts/p1'] });
    await screen.findByRole('heading', { level: 1, name: 'Best laneway coffee' });
    await ue.click(screen.getByRole('button', { name: /^schedule$/i }));
    const dialog = await screen.findByRole('dialog');
    const picker = within(dialog).getByLabelText(/publish at \(melbourne time/i);
    await ue.clear(picker);
    await ue.type(picker, '2026-10-04T10:00');
    await ue.click(within(dialog).getByRole('button', { name: /^schedule$/i }));
    const scheduled = calls.find((c) => c.url.endsWith('/schedule'))!;
    // 10:00 on 2026-10-04 is AEDT (UTC+11), so 23:00Z the previous day.
    expect(JSON.parse(scheduled.body!)).toMatchObject({ expectedVersion: 2, scheduledAt: '2026-10-03T23:00:00.000Z' });
  });

  it('lists blog categories and links each to its own editable address', async () => {
    renderWithProviders(<EditorialTermsPage config={BLOG_CATEGORIES_CONFIG} />, { initialEntries: ['/admin/blog-categories'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Blog categories' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /new category/i })).toHaveAttribute('href', '/admin/blog-categories/new');
    // Editing is a route, so the list itself opens no dialog.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('hides the editorial navigation without posts.write', async () => {
    const provider = authenticatedProvider();
    provider.getPermissions = async () => ['listings.read'];
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/'], authProvider: provider });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Articles' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Authors' })).not.toBeInTheDocument();
  });
});

describe('Melbourne schedule conversion (SRS BLOG 002)', () => {
  it('round-trips across the daylight-saving boundary', () => {
    expect(melbourneLocalToUtc('2026-10-04T10:00')?.toISOString()).toBe('2026-10-03T23:00:00.000Z'); // AEDT, UTC+11
    expect(melbourneLocalToUtc('2026-07-01T10:00')?.toISOString()).toBe('2026-07-01T00:00:00.000Z'); // AEST, UTC+10
    expect(utcToMelbourneLocal(new Date('2026-10-03T23:00:00.000Z'))).toBe('2026-10-04T10:00');
    expect(utcToMelbourneLocal(new Date('2026-07-01T00:00:00.000Z'))).toBe('2026-07-01T10:00');
    expect(melbourneLocalToUtc('not-a-date')).toBeNull();
  });
});
