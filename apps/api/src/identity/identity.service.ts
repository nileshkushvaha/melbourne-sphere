import { Injectable, Logger } from '@nestjs/common';
import type { AdminUser } from '@melbourne-sphere/database';
import { DatabaseService } from '../database/database.service.js';
import { EffectivePermissionsService } from '../authorization/effective-permissions.service.js';
import { ACTIVE_PERMISSION_KEYS, ALL_PERMISSION_KEYS, permissionDefinition, SUPER_ADMIN_ROLE } from './permissions.js';

export interface AdminPrincipal {
  id: string;
  email: string;
  displayName: string;
  status: 'invited' | 'active' | 'disabled';
  totpEnabled: boolean;
  roles: string[];
  /** Effective permissions: role-inherited ∪ direct, active only (SRS RBAC 005). */
  permissions: string[];
  /** The two halves of the union, so the interface can show where access comes from. */
  inheritedPermissions: string[];
  directPermissions: string[];
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Administrator accounts, roles and permissions (IdentityModule per SRS
 * section 16). Password handling lives in the authentication module; this
 * service never sees plaintext passwords.
 */
@Injectable()
export class IdentityService {
  private readonly logger = new Logger(IdentityService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly effective: EffectivePermissionsService,
  ) {}

  /**
   * Synchronises the code catalogue into the database and keeps the protected
   * Super Admin role carrying every active permission (SRS RBAC 002/011).
   * Idempotent: safe to run on every deployment.
   *
   * Retired entries are deactivated rather than deleted, so history and any
   * existing assignment survive while granting nothing.
   */
  async seedRbac(): Promise<{ permissionsCreated: number; permissionsRetired: number; roleCreated: boolean }> {
    const db = await this.database.client();
    const before = await db.permission.count({ where: { key: { in: ALL_PERMISSION_KEYS } } });
    for (const key of ALL_PERMISSION_KEYS) {
      const definition = permissionDefinition(key);
      const row = { label: definition.label, description: definition.description, module: definition.module, isActive: definition.active !== false, isSystem: true };
      await db.permission.upsert({ where: { key }, create: { key, ...row }, update: row });
    }
    const permissionsCreated = (await db.permission.count({ where: { key: { in: ALL_PERMISSION_KEYS } } })) - before;
    // A permission no longer declared in code cannot grant access; the row stays
    // for the audit trail and for any assignment still pointing at it.
    const retired = await db.permission.updateMany({ where: { key: { notIn: ALL_PERMISSION_KEYS }, isActive: true }, data: { isActive: false } });

    const existingRole = await db.role.findUnique({ where: { key: SUPER_ADMIN_ROLE.key } });
    const role =
      existingRole ??
      (await db.role.create({
        data: { key: SUPER_ADMIN_ROLE.key, name: SUPER_ADMIN_ROLE.name, description: SUPER_ADMIN_ROLE.description, isSystem: true },
      }));
    // The protected role is repaired if it was tampered with: it is always active
    // and always carries every active permission (RBAC 011).
    if (existingRole && (!existingRole.isActive || !existingRole.isSystem)) {
      await db.role.update({ where: { id: role.id }, data: { isActive: true, isSystem: true, version: { increment: 1 } } });
    }
    const permissions = await db.permission.findMany({ where: { key: { in: ACTIVE_PERMISSION_KEYS }, isActive: true }, select: { id: true } });
    await db.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    // Everyone holding the repaired role must see the change on their next request.
    await db.adminUser.updateMany({ where: { roles: { some: { roleId: role.id } } }, data: { authzVersion: { increment: 1 } } });
    return { permissionsCreated, permissionsRetired: retired.count, roleCreated: !existingRole };
  }

  async countAdmins(): Promise<number> {
    const db = await this.database.client();
    return db.adminUser.count();
  }

  async findByEmail(email: string): Promise<AdminUser | null> {
    const db = await this.database.client();
    return db.adminUser.findUnique({ where: { email: normaliseEmail(email) } });
  }

  /**
   * Creates an administrator with the given role keys. Used by the bootstrap
   * procedure now and by admins.manage flows in the next phase.
   */
  async createAdmin(input: {
    email: string;
    displayName: string;
    passwordHash: string;
    roleKeys: string[];
  }): Promise<Pick<AdminUser, 'id' | 'email' | 'displayName' | 'status' | 'createdAt'>> {
    const db = await this.database.client();
    const roles = await db.role.findMany({ where: { key: { in: input.roleKeys } } });
    if (roles.length !== input.roleKeys.length) throw new Error('Unknown role key');
    return db.adminUser.create({
      data: {
        email: normaliseEmail(input.email),
        displayName: input.displayName.trim(),
        passwordHash: input.passwordHash,
        roles: { create: roles.map((r) => ({ roleId: r.id })) },
      },
      select: { id: true, email: true, displayName: true, status: true, createdAt: true },
    });
  }

  /**
   * Principal projection (no password hash). Permissions come from the one
   * resolver (SRS RBAC 005); this service never recalculates the union itself.
   */
  async getPrincipal(adminId: string): Promise<AdminPrincipal | null> {
    const db = await this.database.client();
    const admin = await db.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, email: true, displayName: true, status: true, totpEnabledAt: true },
    });
    if (!admin) return null;
    const access = await this.effective.resolve(adminId);
    return {
      id: admin.id,
      email: admin.email,
      displayName: admin.displayName,
      status: admin.status,
      totpEnabled: admin.totpEnabledAt !== null,
      roles: access.roles.map((role) => role.key),
      permissions: access.effective,
      inheritedPermissions: access.inherited,
      directPermissions: access.direct,
    };
  }
}
