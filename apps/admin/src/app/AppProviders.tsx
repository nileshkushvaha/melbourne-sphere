import type { ReactNode } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import enAU from 'antd/locale/en_GB';
import { Refine } from '@refinedev/core';
import { useNotificationProvider } from '@refinedev/antd';
import routerProvider from '@refinedev/react-router';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { dataProvider } from '@/api/data-provider';
import { createAuthProvider } from '@/auth/auth-provider';
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
  return (
    <Refine
      routerProvider={routerProvider}
      dataProvider={dataProvider}
      authProvider={authProvider ?? defaultAuthProvider}
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
          <RefineRoot authProvider={authProvider}>{children}</RefineRoot>
        </ErrorBoundary>
      </AntdApp>
    </ConfigProvider>
  );
}
