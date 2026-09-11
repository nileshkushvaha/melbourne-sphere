import { screen } from '@testing-library/react';
import { AppRoutes } from '@/app/routes';
import { renderWithProviders, user } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const record = {
  applicationName: 'Melbourne Sphere',
  shortName: 'Sphere',
  organisationName: null,
  tagline: 'Find local businesses across Melbourne',
  metaDescription: null,
  supportEmail: 'listings@melbournesphere.com',
  supportPhone: '03 9000 0000',
  supportPhoneDisplay: { display: '03 9000 0000', telHref: 'tel:+61390000000' },
  websiteUrl: null,
  address: null,
  logoMediaId: null,
  faviconMediaId: null,
  shareImageMediaId: null,
  headerTopBarEnabled: false,
  social: { facebook: 'https://www.facebook.com/melbournesphere', instagram: null, x: null, youtube: null, pinterest: null },
  copyrightText: null,
  footerText: null,
  logo: null,
  favicon: null,
  shareImage: null,
  version: 2,
  updatedAt: '2026-09-07T00:00:00.000Z',
  updatedByAdminId: 'a1',
};

describe('general settings page', () => {
  const originalFetch = globalThis.fetch;
  const calls: { url: string; method: string; body?: string }[] = [];
  let puts = 0;

  beforeEach(() => {
    calls.length = 0;
    puts = 0;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
      if (url === '/api/v1/admin/settings/general' && method === 'GET') return jsonResponse(200, { data: record });
      if (url === '/api/v1/admin/settings/general' && method === 'PUT') {
        puts += 1;
        if (puts === 1) {
          return jsonResponse(400, {
            error: { code: 'VALIDATION_ERROR', message: 'Some settings are invalid', fields: { 'social.facebook': ['Enter a full https URL on facebook.com'] }, requestId: 'r' },
          });
        }
        return jsonResponse(200, { data: { ...record, version: 3 } });
      }
      return jsonResponse(200, { data: { status: 'ok' } });
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('loads the record, saves with the record version and shows the API field errors on the right inputs', async () => {
    const ue = user();
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/settings/general'] });

    expect(await screen.findByRole('heading', { level: 1, name: 'General settings' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Melbourne Sphere')).toBeInTheDocument();
    expect(screen.getByDisplayValue('listings@melbournesphere.com')).toBeInTheDocument();
    // The normalised phone comes back as its display form and is editable as text.
    expect(screen.getByDisplayValue('03 9000 0000')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://www.facebook.com/melbournesphere')).toBeInTheDocument();

    await ue.click(screen.getByRole('button', { name: /save settings/i }));
    // A per-field error from the API lands on the field it belongs to, not in a banner alone.
    expect(await screen.findByText('Enter a full https URL on facebook.com')).toBeInTheDocument();

    await ue.click(screen.getByRole('button', { name: /save settings/i }));
    const put = calls.filter((call) => call.method === 'PUT').at(-1)!;
    const body = JSON.parse(put.body!) as Record<string, unknown>;
    expect(body.expectedVersion).toBe(2);
    expect(body.applicationName).toBe('Melbourne Sphere');
    // Unset platforms are sent as null so the API clears them, never as "undefined".
    expect(body.social).toEqual({ facebook: 'https://www.facebook.com/melbournesphere', instagram: null, x: null, youtube: null, pinterest: null });
  });

  it('offers a field for every platform the public shell renders, Pinterest included', async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/settings/general'] });
    // Each field is labelled by the platform's name beside its mark, so the icon is never the only cue.
    for (const platform of ['Facebook', 'Instagram', 'X (Twitter)', 'YouTube', 'Pinterest']) {
      expect(await screen.findByLabelText(new RegExp(`${platform.replace('(', '\\(').replace(')', '\\)')} URL`, 'i'))).toBeInTheDocument();
    }
  });

  it('offers the contact bar toggle and the copyright template help', async () => {
    renderWithProviders(<AppRoutes />, { initialEntries: ['/admin/settings/general'] });
    expect(await screen.findByRole('switch', { name: /show the contact bar/i })).toBeInTheDocument();
    expect(screen.getByText(/\{year\} and \{name\} stay up to date/i)).toBeInTheDocument();
    // Branding is chosen from the media library rather than uploaded here, so
    // every image is processed and carries alt text (SRS MED 003).
    expect(screen.getAllByRole('button', { name: /choose image/i })).toHaveLength(3);
  });
});
