import { screen, within } from '@testing-library/react';
import { AppRoutes } from '@/app/routes';
import { TermsPage } from './TermsPage';
import { AREAS_CONFIG, CATEGORIES_CONFIG } from './configs';
import { renderWithProviders, user } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const areas = [
  { id: 'l1', name: 'Carlton', slug: 'carlton', editorialIntro: null, eligibilitySource: 'council list', eligibilityVerifiedAt: '2026-09-06T00:00:00.000Z', sortOrder: 2, active: true, version: 1, createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z' },
  { id: 'l2', name: 'Docklands', slug: 'docklands', editorialIntro: null, eligibilitySource: null, eligibilityVerifiedAt: null, sortOrder: 3, active: false, version: 2, createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z' },
];

describe('taxonomy terms page (local areas)', () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method: string; body?: string }[] = [];
  beforeEach(() => {
    calls.length = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.startsWith('/api/v1/admin/areas') && method === 'GET') return jsonResponse(200, { data: areas, meta: { page: 1, pageSize: 20, total: 2, pageCount: 1 } });
      if (url === '/api/v1/admin/areas' && method === 'POST') {
        const body = JSON.parse(String(init?.body));
        if (body.name === 'Carlton') return jsonResponse(409, { error: { code: 'SLUG_IN_USE', message: 'That slug is already used', fields: { slug: ['That slug is already used'] }, requestId: 'r' } });
        return jsonResponse(201, { data: { ...areas[0], id: 'l3', name: body.name, slug: 'kensington' } });
      }
      if (url === '/api/v1/admin/areas/l1' && method === 'PATCH') return jsonResponse(409, { error: { code: 'STALE_VERSION', message: 'changed', fields: {}, requestId: 'r' } });
      if (url === '/api/v1/admin/areas/l1/deactivate') return jsonResponse(200, { data: { ...areas[0], active: false, version: 2 } });
      return jsonResponse(200, { data: { status: 'ok' } });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists areas with status, verification and URL-driven filters', async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/areas?status=active&sort=sortOrder&order=desc'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Local areas' })).toBeInTheDocument();
    const row = (await screen.findByText('Docklands')).closest('tr')!;
    expect(within(row).getByText('inactive')).toBeInTheDocument();
    expect(within(row).getByText('no')).toBeInTheDocument();
    expect(calls[0]?.url).toBe('/api/v1/admin/areas?page=1&pageSize=20&status=active&sort=sortOrder&order=desc');
    expect(screen.getByRole('link', { name: 'Local areas' })).toBeInTheDocument();
  });

  it('creates through the dialog, maps field errors from the envelope, and confirms deactivation', async () => {
    const ue = user();
    renderWithProviders(<TermsPage config={AREAS_CONFIG} />, { initialEntries: ['/admin/areas'] });
    await screen.findByText('Carlton');
    await ue.click(screen.getByRole('button', { name: /new local area/i }));
    const dialog = await screen.findByRole('dialog');
    await ue.type(within(dialog).getByLabelText(/^name/i), 'Carlton');
    await ue.click(within(dialog).getByRole('button', { name: /^create$/i }));
    expect(await within(dialog).findByText(/already used/i)).toBeInTheDocument();
    await ue.clear(within(dialog).getByLabelText(/^name/i));
    await ue.type(within(dialog).getByLabelText(/^name/i), 'Kensington');
    await ue.click(within(dialog).getByRole('button', { name: /^create$/i }));
    const post = calls.find((c) => c.method === 'POST' && c.url === '/api/v1/admin/areas' && c.body?.includes('Kensington'));
    expect(post).toBeDefined();
    expect(JSON.parse(post!.body!)).toMatchObject({ name: 'Kensington' });
    await ue.click(await screen.findByRole('switch', { name: /deactivate carlton/i }));
    const titles = await screen.findAllByText(/deactivate “carlton”/i);
    const confirm = titles.map((t) => t.closest('.ant-modal-confirm')).find((el): el is HTMLElement => el instanceof HTMLElement)!;
    await ue.click(within(confirm).getByRole('button', { name: /^deactivate$/i }));
    const deactivate = calls.find((c) => c.url === '/api/v1/admin/areas/l1/deactivate');
    expect(deactivate).toBeDefined();
    expect(JSON.parse(deactivate!.body!)).toEqual({ expectedVersion: 1 });
  });

  it('surfaces stale-version conflicts when editing', async () => {
    const ue = user();
    renderWithProviders(<TermsPage config={AREAS_CONFIG} />, { initialEntries: ['/admin/areas'] });
    await ue.click(await screen.findByRole('button', { name: 'Carlton' }));
    const dialog = await screen.findByRole('dialog');
    await ue.click(within(dialog).getByRole('button', { name: /^save$/i }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/changed by someone else/i);
  });
});

const categories = [
  { id: 'c1', name: 'Food & Drink', slug: 'food-drink', description: 'Eating out', parentId: null, sortOrder: 0, active: true, version: 1, createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z' },
  { id: 'c2', name: 'Cafes', slug: 'cafes', description: null, parentId: 'c1', sortOrder: 1, active: true, version: 1, createdAt: '2026-09-06T00:00:00.000Z', updatedAt: '2026-09-06T00:00:00.000Z' },
];

describe('taxonomy terms page (categories)', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith('/api/v1/admin/categories')) return jsonResponse(200, { data: categories, meta: { page: 1, pageSize: 20, total: 2, pageCount: 1 } });
      return jsonResponse(200, { data: { status: 'ok' } });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the list while the editor dialog is closed', async () => {
    renderWithProviders(<TermsPage config={CATEGORIES_CONFIG} />, { initialEntries: ['/admin/categories'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Categories' })).toBeInTheDocument();
    expect(await screen.findByText('Food & Drink')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('offers every top-level category as a parent when creating, and excludes the term being edited', async () => {
    const ue = user();
    renderWithProviders(<TermsPage config={CATEGORIES_CONFIG} />, { initialEntries: ['/admin/categories'] });
    await ue.click(await screen.findByRole('button', { name: /new category/i }));
    const dialog = await screen.findByRole('dialog');
    await ue.click(within(dialog).getByLabelText(/parent category/i));
    expect(await screen.findByTitle('Food & Drink')).toBeInTheDocument();
    await ue.keyboard('{Escape}');

    await ue.click(await screen.findByRole('button', { name: 'Food & Drink' }));
    const editDialog = await screen.findByRole('dialog');
    await ue.click(within(editDialog).getByLabelText(/parent category/i));
    // A category may not be its own parent.
    expect(screen.queryByTitle('Food & Drink')).not.toBeInTheDocument();
  });
});
