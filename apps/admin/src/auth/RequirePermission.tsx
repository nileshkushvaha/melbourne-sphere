import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { PageLoader } from '@/components/ui';
import { ForbiddenPage } from '@/pages/ForbiddenPage';
import { useCapabilities } from './access-control';
import { permissionsForPath, type PermissionCode } from './permissions';

/**
 * Route guard (SRS RBAC 010). While capabilities are unknown it renders a
 * waiting state — never the page, and never the forbidden state, so nothing
 * flashes that the administrator may not have. Requirements come from the one
 * canonical route mapping unless a route states its own.
 *
 * This is presentation, not security: the API enforces the same permission on
 * every request the page would make.
 */
export function RequirePermission({ children, permissions }: { children: ReactNode; permissions?: PermissionCode[] }) {
  const location = useLocation();
  const { can, loading } = useCapabilities();
  const required = permissions ?? permissionsForPath(location.pathname);
  if (loading) return <PageLoader label="Checking your permissions…" />;
  if (required.length > 0 && !can(...required)) return <ForbiddenPage />;
  return <>{children}</>;
}
