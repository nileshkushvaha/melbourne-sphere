import { screen, within } from '@testing-library/react';
import { AppRoutes } from '@/app/routes';
import { MediaLibraryPage } from './MediaLibraryPage';
import { renderWithProviders, authenticatedProvider, user } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';
import { localFileProblem, variantUrl } from '@/api/media';

const now = '2026-09-06T00:00:00.000Z';
const ready = {
  id: 'm1', sourceName: 'laneway.png', mimeType: 'image/png', bytes: 120_000, width: 1200, height: 800, status: 'ready',
  rejectionReason: null, altText: 'A Melbourne laneway', credit: null, rightsNote: null, focalX: null, focalY: null,
  variants: [{ kind: 'card' as const, url: 'https://cdn.test/media/card.webp', width: 800, height: 533 }, { kind: 'thumbnail' as const, url: 'https://cdn.test/media/thumb.webp', width: 320, height: 213 }],
  usages: [{ kind: 'business', id: 'b1', label: 'Gallery Cafe' }], version: 2, createdAt: now,
};
const meta = { page: 1, pageSize: 24, total: 1, pageCount: 1 };

describe('media library', () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method: string; body?: string }[] = [];
  beforeEach(() => {
    calls.length = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.startsWith('/api/v1/admin/media?') || url === '/api/v1/admin/media') return jsonResponse(200, { data: [ready], meta });
      if (url === '/api/v1/admin/media/m1' && method === 'PATCH') return jsonResponse(200, { data: { ...ready, credit: 'Photo: Alex', version: 3 } });
      if (url === '/api/v1/admin/media/m1' && method === 'DELETE') return jsonResponse(409, { error: { code: 'MEDIA_IN_USE', message: 'This image is used in 1 place(s).', fields: {}, requestId: 'r' } });
      return jsonResponse(200, { data: { status: 'ok' } });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('lists assets with their status, size and usage count', async () => {
    renderWithProviders(<MediaLibraryPage />, { initialEntries: ['/admin/media?status=ready'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Media library' })).toBeInTheDocument();
    const card = (await screen.findByText('laneway.png')).closest('.ant-card')!;
    expect(within(card as HTMLElement).getByText('ready')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText((_, node) => node?.textContent === '1200\u00d7800' && node.tagName === 'SPAN')).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText('1 use')).toBeInTheDocument();
    expect(screen.getByAltText('A Melbourne laneway')).toHaveAttribute('src', 'https://cdn.test/media/thumb.webp');
    expect(calls[0]?.url).toBe('/api/v1/admin/media?status=ready&page=1&pageSize=24');
  });

  it('saves image details with the record version', async () => {
    const ue = user();
    renderWithProviders(<MediaLibraryPage />, { initialEntries: ['/admin/media'] });
    await screen.findByText('laneway.png');
    await ue.click(screen.getByRole('button', { name: 'Details' }));
    const dialog = await screen.findByRole('dialog');
    await ue.type(within(dialog).getByLabelText(/credit/i), 'Photo: Alex');
    await ue.click(within(dialog).getByRole('button', { name: /^save$/i }));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(JSON.parse(patch.body!)).toMatchObject({ expectedVersion: 2, altText: 'A Melbourne laneway', credit: 'Photo: Alex' });
  });

  it('hides the library without media.manage', async () => {
    const provider = authenticatedProvider();
    provider.getPermissions = async () => ['listings.read'];
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/'], authProvider: provider });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Media library' })).not.toBeInTheDocument();
  });
});

describe('client-side upload checks (SRS MED 001)', () => {
  const file = (type: string, size: number) => ({ type, size, name: 'x' }) as File;

  it('rejects unsupported types and oversized files before any request', () => {
    expect(localFileProblem(file('image/jpeg', 1000))).toBeNull();
    expect(localFileProblem(file('image/svg+xml', 1000))).toMatch(/JPEG, PNG and WebP/);
    expect(localFileProblem(file('application/pdf', 1000))).toMatch(/JPEG, PNG and WebP/);
    expect(localFileProblem(file('image/png', 11 * 1024 * 1024))).toMatch(/10 MB/);
    expect(localFileProblem(file('image/png', 0))).toMatch(/empty/);
  });

  it('picks the smallest variant at or above the requested width', () => {
    expect(variantUrl(ready, 320)).toBe('https://cdn.test/media/thumb.webp');
    expect(variantUrl(ready, 700)).toBe('https://cdn.test/media/card.webp');
    expect(variantUrl(ready, 5000)).toBe('https://cdn.test/media/card.webp');
    expect(variantUrl({ variants: [] })).toBeNull();
  });
});
