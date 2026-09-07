import { screen, within } from '@testing-library/react';
import { AppRoutes } from '@/app/routes';
import { CommentsPage } from './CommentsPage';
import { renderWithProviders, authenticatedProvider, user } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const now = '2026-09-06T00:00:00.000Z';
const comment = {
  id: 'c1', postId: 'p1', postTitle: 'Where to find laneway coffee', displayName: 'Sam Reader', email: 'sam@example.com',
  originalText: 'Great guide, thanks for the tips.', publicText: null, redactionReason: null, status: 'pending',
  moderationReason: null, moderatorAdminId: null, decidedAt: null, openReportCount: 1, acknowledgedVersion: '2026-09-01', version: 1, createdAt: now,
};
const meta = { page: 1, pageSize: 20, total: 1, pageCount: 1 };

describe('comments moderation queue', () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method: string; body?: string }[] = [];
  beforeEach(() => {
    calls.length = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url.startsWith('/api/v1/admin/comments') && method === 'GET') return jsonResponse(200, { data: [comment], meta });
      if (url === '/api/v1/admin/comments/c1/approve') return jsonResponse(200, { data: { ...comment, status: 'approved', version: 2 } });
      if (url === '/api/v1/admin/comments/c1/reject') return jsonResponse(200, { data: { ...comment, status: 'rejected', version: 2 } });
      return jsonResponse(200, { data: { status: 'ok' } });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('publishes a pending comment and flags reported ones', async () => {
    const ue = user();
    renderWithProviders(<CommentsPage />, { initialEntries: ['/admin/comments?status=pending'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Comments' })).toBeInTheDocument();
    const row = (await screen.findByText('Where to find laneway coffee')).closest('tr')!;
    expect(within(row).getByText('pending')).toBeInTheDocument();
    expect(within(row).getByLabelText('Reported')).toBeInTheDocument();
    expect(calls[0]?.url).toBe('/api/v1/admin/comments?status=pending&page=1&pageSize=20');
    await ue.click(within(row).getByRole('button', { name: 'Publish' }));
    const dialog = await screen.findByRole('dialog');
    await ue.click(within(dialog).getByRole('button', { name: /confirm/i }));
    expect(JSON.parse(calls.find((c) => c.url.endsWith('/approve'))!.body!)).toEqual({ expectedVersion: 1 });
  });

  it('requires a reason to reject', async () => {
    const ue = user();
    renderWithProviders(<CommentsPage />, { initialEntries: ['/admin/comments'] });
    const row = (await screen.findByText('Where to find laneway coffee')).closest('tr')!;
    await ue.click(within(row).getByRole('button', { name: 'Reject' }));
    const dialog = await screen.findByRole('dialog');
    await ue.click(within(dialog).getByRole('button', { name: /confirm/i }));
    expect(await within(dialog).findByText('A reason is required')).toBeInTheDocument();
    await ue.type(within(dialog).getByLabelText(/reason/i), 'Off topic');
    await ue.click(within(dialog).getByRole('button', { name: /confirm/i }));
    expect(JSON.parse(calls.find((c) => c.url.endsWith('/reject'))!.body!)).toEqual({ expectedVersion: 1, reason: 'Off topic' });
  });

  it('hides the queue without comments.moderate', async () => {
    const provider = authenticatedProvider();
    provider.getPermissions = async () => ['listings.read'];
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/'], authProvider: provider });
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('link', { name: 'Comments' })).not.toBeInTheDocument();
  });
});
