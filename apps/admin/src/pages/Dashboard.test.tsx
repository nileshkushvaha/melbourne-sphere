import { screen } from '@testing-library/react';
import { DashboardPage } from './DashboardPage';
import { renderWithProviders } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const payload = {
  metrics: [
    { key: 'pendingReviews', label: 'Reviews awaiting moderation', value: 3, href: '/reviews', tone: 'attention' },
    { key: 'openReports', label: 'Open abuse reports', value: 0, href: '/reports', tone: 'neutral' },
  ],
  scheduledPosts: [{ id: 'p1', title: 'Winter markets', scheduledAt: '2026-09-08T09:00:00.000Z', overdue: true }],
  activity: [{ id: 'l1', action: 'blog.post.publish', actorName: 'Alex Editor', targetType: 'post', createdAt: '2026-09-06T00:00:00.000Z' }],
  generatedAt: '2026-09-06T01:00:00.000Z',
};

describe('dashboard', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('shows the counts that need attention, scheduled work and recent activity', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      String(input).startsWith('/api/v1/admin/dashboard') ? jsonResponse(200, { data: payload }) : jsonResponse(200, { data: { status: 'ok' } })) as typeof fetch;
    renderWithProviders(<DashboardPage />, { initialEntries: ['/admin/'] });
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    const metric = await screen.findByRole('link', { name: 'Reviews awaiting moderation: 3' });
    expect(metric).toHaveAttribute('href', '/admin/reviews');
    expect(screen.getByText('Winter markets')).toBeInTheDocument();
    expect(screen.getByText('overdue')).toBeInTheDocument();
    // Audit keys are turned into something a person reads.
    expect(screen.getByText('Blog post — published')).toBeInTheDocument();
  });

  it('explains an account with no visible metrics instead of showing an empty page', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      String(input).startsWith('/api/v1/admin/dashboard')
        ? jsonResponse(200, { data: { metrics: [], scheduledPosts: [], activity: [], generatedAt: payload.generatedAt } })
        : jsonResponse(200, { data: { status: 'ok' } })) as typeof fetch;
    renderWithProviders(<DashboardPage />, { initialEntries: ['/admin/'] });
    expect(await screen.findByText(/no permissions that expose dashboard counts/i)).toBeInTheDocument();
    expect(await screen.findByText(/nothing scheduled/i)).toBeInTheDocument();
  });

  it('surfaces an API failure with a retry action', async () => {
    globalThis.fetch = (async (input: RequestInfo | URL) =>
      String(input).startsWith('/api/v1/admin/dashboard')
        ? jsonResponse(503, { error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable. Please try again shortly.', fields: {}, requestId: 'req-1' } })
        : jsonResponse(200, { data: { status: 'ok' } })) as typeof fetch;
    renderWithProviders(<DashboardPage />, { initialEntries: ['/admin/'] });
    expect(await screen.findByText(/temporarily unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
