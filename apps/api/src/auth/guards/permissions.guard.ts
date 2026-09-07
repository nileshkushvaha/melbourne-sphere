import { ForbiddenException, Injectable, Logger, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { isPermissionKey } from '../../identity/permissions.js';
import { PERMISSIONS_KEY, PUBLIC_ROUTE_KEY, SESSION_ONLY_KEY, type AuthenticatedRequest } from '../decorators.js';
import { isAdminPath } from './admin-path.js';

/**
 * Default-deny authorisation (SRS RBAC 001, MOD 002 acceptance): an admin
 * route must declare @Public, @SessionOnly or @RequirePermissions; anything
 * else is refused and logged as a programming error. Permission keys are
 * validated against the catalogue so typos cannot silently grant access.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!isAdminPath(req)) return true;
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, targets)) return true;
    if (!req.admin) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied' });
    if (this.reflector.getAllAndOverride<boolean>(SESSION_ONLY_KEY, targets)) return true;

    const required = this.reflector.getAllAndOverride<string[] | undefined>(PERMISSIONS_KEY, targets);
    if (!required || required.length === 0) {
      this.logger.error(`route ${req.method} ${req.path} declares no permission; denied by default`);
      throw new ForbiddenException({ code: 'PERMISSION_UNDECLARED', message: 'Access denied' });
    }
    const missing = required.filter((key) => !isPermissionKey(key) || !req.admin!.permissions.includes(key));
    if (missing.length > 0) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to do that' });
    }
    return true;
  }
}
