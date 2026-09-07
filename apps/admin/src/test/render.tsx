import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { AuthProvider } from '@refinedev/core';
import { AppProviders } from '@/app/AppProviders';

interface Options extends Omit<RenderOptions, 'wrapper'> {
  /** Full URLs including the basename, e.g. '/admin/'. */
  initialEntries?: string[];
  basename?: string;
  authProvider?: AuthProvider;
  /**
   * Renders `ui` under a single route so a page component sees its own
   * `useParams`, without mounting the whole route tree.
   */
  routePath?: string;
}

const principal = {
  admin: { id: 'a1', email: 'admin@example.com', displayName: 'Test Admin', roles: ['super_admin'], permissions: ['listings.read', 'listings.write', 'listings.publish', 'admins.manage', 'audit.read', 'taxonomy.manage', 'settings.manage', 'reviews.moderate', 'reports.manage', 'enquiries.read', 'enquiries.manage', 'posts.write', 'posts.publish', 'comments.moderate', 'media.manage'], totpEnabled: false },
  session: { id: 's1', createdAt: '2026-09-06T00:00:00.000Z', idleExpiresAt: '2026-09-06T00:30:00.000Z', expiresAt: '2026-09-06T12:00:00.000Z' },
};

/** An always-authenticated provider for shell/page tests. */
export function authenticatedProvider(): AuthProvider {
  return {
    login: async () => ({ success: true, redirectTo: '/' }),
    logout: async () => ({ success: true, redirectTo: '/login' }),
    check: async () => ({ authenticated: true }),
    onError: async () => ({}),
    getIdentity: async () => principal.admin,
    getPermissions: async () => principal.admin.permissions,
  };
}

export function anonymousProvider(): AuthProvider {
  return { ...authenticatedProvider(), check: async () => ({ authenticated: false, redirectTo: '/login', logout: false }), getIdentity: async () => null };
}

/** Renders inside the real provider stack with a memory router at the admin basename. */
export function renderWithProviders(ui: ReactElement, { initialEntries = ['/admin/'], basename = '/admin', authProvider = authenticatedProvider(), routePath, ...options }: Options = {}) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter basename={basename} initialEntries={initialEntries}>
        <AppProviders authProvider={authProvider}>{routePath ? <Routes><Route path={routePath} element={children} /></Routes> : children}</AppProviders>
      </MemoryRouter>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * User-event instance without the per-keystroke delay. The default API waits
 * between keys, which makes dialog-heavy specs take tens of seconds; the
 * interactions themselves are unchanged.
 */
export function user() {
  return userEvent.setup({ delay: null });
}
