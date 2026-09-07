import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PUBLIC_ROUTE_KEY, SESSION_ONLY_KEY } from '../decorators.js';
import { PermissionsGuard } from './permissions.guard.js';

function make(metadata: Record<string, unknown>, admin?: { permissions: string[] }, path = '/api/v1/admin/things') {
  const reflector = { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
  const ctx = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ method: 'GET', path, admin }) }),
  } as never;
  return { guard: new PermissionsGuard(reflector), ctx };
}

describe('PermissionsGuard (default deny)', () => {
  it('passes non-admin routes and @Public admin routes', () => {
    expect(make({}, undefined, '/api/v1/health').guard.canActivate(make({}, undefined, '/api/v1/health').ctx)).toBe(true);
    const pub = make({ [PUBLIC_ROUTE_KEY]: true });
    expect(pub.guard.canActivate(pub.ctx)).toBe(true);
  });

  it('denies an admin route that declares no permission, even for a Super Admin', () => {
    const { guard, ctx } = make({}, { permissions: ['listings.read', 'admins.manage'] });
    expect(() => guard.canActivate(ctx)).toThrow(/Access denied/);
  });

  it('allows @SessionOnly routes with any active session', () => {
    const { guard, ctx } = make({ [SESSION_ONLY_KEY]: true }, { permissions: [] });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('requires every declared permission and rejects unknown keys', () => {
    const ok = make({ [PERMISSIONS_KEY]: ['listings.read', 'listings.write'] }, { permissions: ['listings.read', 'listings.write'] });
    expect(ok.guard.canActivate(ok.ctx)).toBe(true);
    const missing = make({ [PERMISSIONS_KEY]: ['listings.read', 'listings.publish'] }, { permissions: ['listings.read'] });
    expect(() => missing.guard.canActivate(missing.ctx)).toThrow(/permission/);
    const unknown = make({ [PERMISSIONS_KEY]: ['listings.everything'] }, { permissions: ['listings.everything'] });
    expect(() => unknown.guard.canActivate(unknown.ctx)).toThrow();
  });

  it('denies when no principal is attached', () => {
    const { guard, ctx } = make({ [PERMISSIONS_KEY]: ['listings.read'] });
    expect(() => guard.canActivate(ctx)).toThrow(/Access denied/);
  });
});
