import { screen, within } from '@testing-library/react';
import { RedirectsPage } from './RedirectsPage';
import { renderWithProviders, user } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const now = '2026-09-06T00:00:00.000Z';
const redirect = {
  id: 'r1',
  sourcePath: '/business/old-cafe',
  targetPath: '/business/new-cafe',
  kind: 'permanent' as const,
  reason: 'Renamed',
  resourceType: 'business',
  resourceId: 'b1',
  createdByAdminId: 'admin1',
  createdAt: now,
  updatedAt: now,
};
const meta = { page: 1, pageSize: 25, total: 1, pageCount: 1 };

describe('SEO redirects', () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method: string; body?: string }[] = [];
  beforeEach(() => {
    calls.length = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.startsWith('/api/v1/admin/redirects') && method === 'GET') return jsonResponse(200, { data: [redirect], meta });
      if (url === '/api/v1/admin/redirects' && method === 'POST') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { targetPath?: string | null };
        if (body.targetPath && body.targetPath.startsWith('http')) {
          return jsonResponse(400, { error: { code: 'VALIDATION_ERROR', message: 'Target must be a site-relative path on this site', fields: { targetPath: ['Target must be a site-relative path on this site'] }, requestId: 'r' } });
        }
        return jsonResponse(201, { data: { ...redirect, id: 'r2' } });
      }
      return jsonResponse(200, { data: { status: 'ok' } });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists redirects with their source, target and type', async () => {
    renderWithProviders(<RedirectsPage />, { initialEntries: ['/admin/redirects'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'SEO redirects' })).toBeInTheDocument();
    const row = (await screen.findByText('/business/old-cafe')).closest('tr')!;
    expect(within(row).getByText('/business/new-cafe')).toBeInTheDocument();
    expect(within(row).getByText('Renamed')).toBeInTheDocument();
  });

  it('creates a 301 and hides the target field for a removed page', async () => {
    const ue = user();
    renderWithProviders(<RedirectsPage />, { initialEntries: ['/admin/redirects'] });
    await ue.click(await screen.findByRole('button', { name: /new redirect/i }));
    const dialog = await screen.findByRole('dialog');
    await ue.type(within(dialog).getByLabelText(/old address/i), '/business/gone-cafe');
    await ue.type(within(dialog).getByLabelText(/new address/i), '/business/new-cafe');
    await ue.click(within(dialog).getByRole('button', { name: /save/i }));
    const post = calls.find((call) => call.method === 'POST');
    expect(JSON.parse(post!.body!)).toMatchObject({ sourcePath: '/business/gone-cafe', targetPath: '/business/new-cafe', kind: 'permanent' });

    await ue.click(await screen.findByRole('button', { name: /new redirect/i }));
    const second = (await screen.findAllByRole('dialog')).at(-1)!;
    // Ant Design hides the real radio input behind its label, so click the label.
    await ue.click(within(second).getByText(/removed for good/i));
    expect(within(second).queryByLabelText(/new address/i)).not.toBeInTheDocument();
  });

  it('shows the API validation message on the target field', async () => {
    const ue = user();
    renderWithProviders(<RedirectsPage />, { initialEntries: ['/admin/redirects'] });
    await ue.click(await screen.findByRole('button', { name: /new redirect/i }));
    const dialog = await screen.findByRole('dialog');
    await ue.type(within(dialog).getByLabelText(/old address/i), '/business/old');
    await ue.type(within(dialog).getByLabelText(/new address/i), 'https://evil.example/x');
    await ue.click(within(dialog).getByRole('button', { name: /save/i }));
    expect(await screen.findAllByText(/site-relative path on this site/i)).not.toHaveLength(0);
  });
});
