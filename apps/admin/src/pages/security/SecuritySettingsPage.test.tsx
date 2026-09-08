import { screen } from '@testing-library/react';
import { SecuritySettingsPage } from '@/pages/security/SecuritySettingsPage';
import { renderWithProviders, providerWithPermissions } from '@/test/render';
import { jsonResponse } from '@/test/fetch-fakes';

const declaration = (key: string, label: string, min: number, max: number, consequence: string | null = null) => ({
  key,
  label,
  description: `${label} description`,
  type: 'integer',
  bounds: { min, max, boundedBy: 'AUTH 002' },
  default: max,
  visibility: 'private',
  effect: 'runtime',
  viewPermission: 'security.settings.view',
  updatePermission: 'security.settings.update',
  invalidates: [],
  consequence,
});

const registry = [
  {
    key: 'security',
    label: 'Security',
    description: 'Authentication, password policy, login security and session settings.',
    owner: 'AuthModule',
    viewPermission: 'security.settings.view',
    updatePermission: 'security.settings.update',
    note: 'Mandatory two-factor enrolment is deliberately absent: it is client decision D06.',
    settings: [
      declaration('sessionIdleMinutes', 'Sign out after inactivity', 5, 30, 'Shortening this signs out administrators who have been idle longer than the new limit.'),
      declaration('passwordMinLength', 'Minimum password length', 12, 64),
    ],
  },
];

const values = { group: 'security', values: { sessionIdleMinutes: 30, passwordMinLength: 12 }, version: 1, updatedAt: '2026-09-07T10:00:00.000Z', updatedByAdminId: null };

/**
 * The form is generated from the server's declarations (SRS 1.2 SET 002), so
 * these check that what the server says is what the screen offers — including
 * that a reader cannot edit, and that the D06 note is not quietly dropped.
 */
describe('SecuritySettingsPage', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/admin/settings/registry')) return jsonResponse(200, { data: registry });
      if (url.includes('/admin/settings/security')) return jsonResponse(200, { data: values });
      return jsonResponse(200, { data: [] });
    }) as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('builds the form from the declarations, with the bound the server states', async () => {
    renderWithProviders(<SecuritySettingsPage />, {
      initialEntries: ['/admin/security/settings'],
      authProvider: providerWithPermissions(['security.settings.view', 'security.settings.update']),
    });

    expect(await screen.findByRole('heading', { level: 1, name: 'Security settings' })).toBeInTheDocument();
    const idle = await screen.findByLabelText('Sign out after inactivity');
    expect(idle).toHaveValue('30');
    // One per declared setting: the bound is stated beside each field, not once for the form.
    expect(screen.getAllByText(/Bounded by AUTH 002/)).toHaveLength(registry[0]!.settings.length);
    expect(screen.getByRole('button', { name: /save settings/i })).toBeInTheDocument();
  });

  it('shows an administrator who may only read that they cannot change anything', async () => {
    renderWithProviders(<SecuritySettingsPage />, {
      initialEntries: ['/admin/security/settings'],
      authProvider: providerWithPermissions(['security.settings.view']),
    });

    expect(await screen.findByText(/see these settings but not change them/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save settings/i })).not.toBeInTheDocument();
    expect(await screen.findByLabelText('Sign out after inactivity')).toBeDisabled();
  });

  it('surfaces the note about what is deliberately absent rather than hiding it', async () => {
    renderWithProviders(<SecuritySettingsPage />, {
      initialEntries: ['/admin/security/settings'],
      authProvider: providerWithPermissions(['security.settings.view']),
    });

    expect(await screen.findByText(/two-factor enrolment is deliberately absent/i)).toBeInTheDocument();
  });

  it('says plainly that a password rule applies at the next change, not to stored passwords', async () => {
    renderWithProviders(<SecuritySettingsPage />, {
      initialEntries: ['/admin/security/settings'],
      authProvider: providerWithPermissions(['security.settings.view']),
    });

    expect(await screen.findByText(/never invalidates a password already in use/i)).toBeInTheDocument();
  });
});
