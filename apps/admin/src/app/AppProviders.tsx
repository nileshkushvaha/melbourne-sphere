import { useMemo, type ReactNode } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import enAU from 'antd/locale/en_GB';
import { Refine } from '@refinedev/core';
import { useNotificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { dataProvider } from '@/api/data-provider';
import { createAuthProvider } from '@/auth/auth-provider';
import { createAccessControlProvider } from '@/auth/access-control';
import { CapabilityProvider } from '@/auth/CapabilityProvider';
import { withCapabilityLifecycle } from '@/auth/capability-lifecycle';
import { capabilityStore } from '@/auth/capability-store';
import type { AuthProvider } from '@refinedev/core';
import { APP_NAME } from '@/config/app-config';
import { createAdminTheme } from '@/config/theme';
import { usePrefersReducedMotion } from '@/shared/usePrefersReducedMotion';

interface AppProvidersProps {
  children: ReactNode;
  /** Test hook; the app uses the cookie-session provider. */
  authProvider?: AuthProvider;
}

const defaultAuthProvider = createAuthProvider();

/** Refine needs the antd App context for notifications, so it is mounted inside it. */
function RefineRoot({ children, authProvider }: AppProvidersProps) {
  const notificationProvider = useNotificationProvider();
  const provider = authProvider ?? defaultAuthProvider;
  // The capability store is the single owner of the codes the server returned;
  // the lifecycle wrapper keeps it in step with the session (SRS RBAC 010).
  const authProviderWithCapabilities = useMemo(() => withCapabilityLifecycle(provider, capabilityStore), [provider]);
  // The provider asks the auth provider for the codes the *server* calculated;
  // the admin never recreates role resolution (SRS RBAC 010).
  const accessControlProvider = useMemo(() => createAccessControlProvider(() => capabilityStore.get()), []);
  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      authProvider={authProviderWithCapabilities}
      accessControlProvider={accessControlProvider}
      notificationProvider={notificationProvider}
      resources={[{ name: 'businesses', list: '/businesses', create: '/businesses/new', edit: '/businesses/:id', meta: { label: 'Businesses' } }]}
      options={{
        disableTelemetry: true,
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        title: { text: APP_NAME },
      }}
    >
      {children}
    </Refine>
  );
}

/**
 * Provider stack: theme → antd App (message/notification context) → error
 * boundary → Refine. Must be rendered inside a router (BrowserRouter in the
 * app, MemoryRouter in tests).
 */
export function AppProviders({ children, authProvider }: AppProvidersProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <ConfigProvider theme={createAdminTheme(reducedMotion)} locale={enAU}>
      <AntdApp>
        <ErrorBoundary>
          <RefineRoot authProvider={authProvider}>
            <CapabilityProvider>{children}</CapabilityProvider>
          </RefineRoot>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}
