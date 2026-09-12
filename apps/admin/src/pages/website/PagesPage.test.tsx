import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

// The rich-text editor is ProseMirror behind a lazy import: real in the
// browser, and in jsdom a plain textarea that reports the same value, so these
// tests are about the page rather than about contenteditable.
vi.mock('@/components/RichTextEditorLazy', () => ({
  RichTextEditorLazy: ({ value, onChange, ariaLabel }: { value: string; onChange: (html: string) => void; ariaLabel?: string }) => (
    <textarea aria-label={ariaLabel ?? 'Body'} value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
import { PagesPage } from '@/pages/website/PagesPage';
import { PageCreatePage } from '@/pages/website/PageCreatePage';
import { PageEditorPage } from '@/pages/website/PageEditorPage';
import { renderWithProviders, providerWithPermissions } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const terms = {
  slug: 'terms',
  title: 'Terms of Use',
  sanitizedBody: '<p>An independent directory.</p>',
  bodySource: '<p>An independent directory.</p>',
  bodyFormat: 'html',
  seoTitle: null,
  seoDescription: null,
  status: 'published',
  publishedAt: '2026-09-08T00:00:00.000Z',
  publicationBlockers: [],
  purpose: 'The terms visitors accept by using the site.',
  template: 'generic',
  isSystem: true,
  canDelete: false,
  version: 3,
  updatedAt: '2026-09-08T00:00:00.000Z',
  updatedByAdminId: null,
};

const privacy = {
  ...terms,
  slug: 'privacy',
  title: 'Privacy Policy',
  status: 'draft',
  publishedAt: null,
  publicationBlockers: ['Page content must be at least 200 characters of real copy'],
  purpose: 'What personal data the site collects.',
  template: 'generic',
  isSystem: true,
  canDelete: false,
  version: 0,
};

/** A page an administrator created: deletable, and only while unpublished. */
const custom = {
  ...terms,
  slug: 'community-guidelines',
  title: 'Community guidelines',
  status: 'draft',
  publishedAt: null,
  template: 'generic',
  isSystem: false,
  canDelete: true,
  purpose: 'A page you created.',
  version: 1,
};

/**
 * Pages (SRS CFG 002 as amended in SRS 1.6): a fixed set of known pages, each
 * edited on its own route, with publication refused while the API says the copy
 * is not ready.
 */
describe('Website pages', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists the pages with their address, template and readiness', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [terms, privacy] })) as typeof fetch;
    renderWithProviders(<PagesPage />, { initialEntries: ['/admin/website/pages'], authProvider: providerWithPermissions(['settings.manage']) });

    expect(await screen.findByRole('heading', { level: 1, name: 'Pages' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Terms of Use' })).toHaveAttribute('href', '/admin/website/pages/terms');
    expect(screen.getByText('/privacy')).toBeInTheDocument();
    // The reason a page is not publishable is visible before opening it.
    expect(screen.getByText('1 to fix')).toBeInTheDocument();
  });

  it('offers no way in without settings.manage', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [terms] })) as typeof fetch;
    renderWithProviders(<PagesPage />, { initialEntries: ['/admin/website/pages'], authProvider: providerWithPermissions(['audit.read']) });

    expect(await screen.findByText('Terms of Use')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Terms of Use' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
  });

  it('edits a page on its own route', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: terms })) as typeof fetch;
    renderWithProviders(<PageEditorPage />, {
      initialEntries: ['/admin/website/pages/terms'],
      routePath: '/website/pages/:slug',
      authProvider: providerWithPermissions(['settings.manage']),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Terms of Use' })).toBeInTheDocument();
    expect(screen.getByText('Public address: /terms')).toBeInTheDocument();
    // Published, so the action offered is the reverse one.
    expect(await screen.findByRole('button', { name: /^unpublish$/i })).toBeInTheDocument();
  });

  it('will not offer publication while the API says the copy is not ready', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: privacy })) as typeof fetch;
    renderWithProviders(<PageEditorPage />, {
      initialEntries: ['/admin/website/pages/privacy'],
      routePath: '/website/pages/:slug',
      authProvider: providerWithPermissions(['settings.manage']),
    });

    expect(await screen.findByRole('button', { name: /^publish$/i })).toBeDisabled();
    expect(await screen.findByText('Not ready to publish')).toBeInTheDocument();
    expect(screen.getByText(/at least 200 characters/i)).toBeInTheDocument();
  });

  it('saves with the version it loaded, so a concurrent edit is caught by the API', async () => {
    const calls: { url: string; method: string; body: unknown }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
      return jsonResponse(200, { data: terms });
    }) as typeof fetch;

    renderWithProviders(<PageEditorPage />, {
      initialEntries: ['/admin/website/pages/terms'],
      routePath: '/website/pages/:slug',
      authProvider: providerWithPermissions(['settings.manage']),
    });

    await userEvent.click(await screen.findByRole('button', { name: /save page/i }));
    await waitFor(() => expect(calls.some((call) => call.method === 'PUT')).toBe(true));
    const put = calls.find((call) => call.method === 'PUT')!;
    expect(put.url).toContain('/admin/pages/terms');
    expect(put.body).toMatchObject({ expectedVersion: 3, title: 'Terms of Use' });
  });

  it('offers a new page, and shows which rows belong to the product', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [terms, privacy, custom] })) as typeof fetch;
    renderWithProviders(<PagesPage />, { initialEntries: ['/admin/website/pages'], authProvider: providerWithPermissions(['settings.manage']) });

    expect(await screen.findByRole('link', { name: /new page/i })).toHaveAttribute('href', '/admin/website/pages/new');
    expect(screen.getAllByText('Part of the product')).toHaveLength(2);
    expect(screen.getByText('Added by an editor')).toBeInTheDocument();
    // Only the editor's own page offers deletion.
    expect(screen.getAllByRole('button', { name: /^delete/i })).toHaveLength(1);
  });

  it('will not offer to delete a published page, and says why', async () => {
    globalThis.fetch = (async () => jsonResponse(200, { data: [{ ...custom, status: 'published', canDelete: false }] })) as typeof fetch;
    renderWithProviders(<PagesPage />, { initialEntries: ['/admin/website/pages'], authProvider: providerWithPermissions(['settings.manage']) });

    const remove = await screen.findByRole('button', { name: /delete community guidelines/i });
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('title', 'Unpublish it first');
  });

  it('confirms a deletion before sending it, saying what is lost', async () => {
    const calls: { url: string; method: string }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method ?? 'GET' });
      return init?.method === 'DELETE' ? jsonResponse(204, {}) : jsonResponse(200, { data: [custom] });
    }) as typeof fetch;
    renderWithProviders(<PagesPage />, { initialEntries: ['/admin/website/pages'], authProvider: providerWithPermissions(['settings.manage']) });

    await userEvent.click(await screen.findByRole('button', { name: /delete community guidelines/i }));
    expect(await screen.findByText(/cannot be undone/i)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /^delete$/i }).at(-1)!);
    await waitFor(() => expect(calls.some((call) => call.method === 'DELETE')).toBe(true));
    expect(calls.find((call) => call.method === 'DELETE')!.url).toContain('/admin/pages/community-guidelines');
  });

  it('suggests an address from the title, lets it be overridden, and sends what was typed', async () => {
    const posted: { url: string; body: unknown }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posted.push({ url: String(input), body: JSON.parse(String(init.body)) });
        return jsonResponse(201, { data: custom });
      }
      return jsonResponse(200, { data: [] });
    }) as typeof fetch;
    renderWithProviders(<PageCreatePage />, { initialEntries: ['/admin/website/pages/new'], authProvider: providerWithPermissions(['settings.manage']) });

    await userEvent.type(await screen.findByLabelText(/^title/i), 'Community Guidelines');
    // The suggestion is a starting point, not a decision: it is shown, not typed.
    expect(await screen.findByText('/community-guidelines')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const address = screen.getByLabelText('Web address');
    await userEvent.clear(address);
    await userEvent.type(address, 'house-rules');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await userEvent.type(screen.getByLabelText(/^title/i), '!');
    // Once the editor has written an address, the title stops overwriting it.
    expect(await screen.findByText('/house-rules')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Page content'), 'Say what you would say to a neighbour.');
    await userEvent.click(screen.getByRole('button', { name: /create page/i }));
    await waitFor(() => expect(posted).toHaveLength(1));
    expect(posted[0]!.body).toMatchObject({ slug: 'house-rules', title: 'Community Guidelines!' });
  });

  it('puts the API’s refusal of an address on the address field', async () => {
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse(400, {
          error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid', fields: { slug: ['That address is used by the site itself, so a page there would never be seen'] }, requestId: 'r' },
        });
      }
      return jsonResponse(200, { data: [] });
    }) as typeof fetch;
    renderWithProviders(<PageCreatePage />, { initialEntries: ['/admin/website/pages/new'], authProvider: providerWithPermissions(['settings.manage']) });

    await userEvent.type(await screen.findByLabelText(/^title/i), 'Blog');
    await userEvent.type(screen.getByLabelText('Page content'), 'Something about the blog.');
    await userEvent.click(screen.getByRole('button', { name: /create page/i }));
    expect(await screen.findByText(/used by the site itself/i)).toBeInTheDocument();
  });
});
