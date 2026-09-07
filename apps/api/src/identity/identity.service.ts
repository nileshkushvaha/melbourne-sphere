import { Injectable, Logger } from '@nestjs/common';
import type { AdminUser } from '@melbourne-sphere/database';
import { DatabaseService } from '../database/database.service.js';
import { ALL_PERMISSION_KEYS, PERMISSIONS, SUPER_ADMIN_ROLE } from './permissions.js';

export interface AdminPrincipal {
  id: string;
  email: string;
  displayName: string;
  status: 'invited' | 'active' | 'disabled';
  totpEnabled: boolean;
  roles: string[];
  permissions: string[];
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

  constructor(private readonly database: DatabaseService) {}

  /** Idempotent: creates missing permissions and the Super Admin role with every permission. */
  async seedRbac(): Promise<{ permissionsCreated: number; roleCreated: boolean }> {
    const db = await this.database.client();
    const before = await db.permission.count({ where: { key: { in: ALL_PERMISSION_KEYS } } });
    for (const key of ALL_PERMISSION_KEYS) {
      await db.permission.upsert({
        where: { key },
        create: { key, description: PERMISSIONS[key] },
        update: { description: PERMISSIONS[key] },
      });
    }
    const permissionsCreated = (await db.permission.count({ where: { key: { in: ALL_PERMISSION_KEYS } } })) - before;
    const existingRole = await db.role.findUnique({ where: { key: SUPER_ADMIN_ROLE.key } });
    const role =
      existingRole ??
      (await db.role.create({
        data: { key: SUPER_ADMIN_ROLE.key, name: SUPER_ADMIN_ROLE.name, description: SUPER_ADMIN_ROLE.description, isSystem: true },
      }));
    const permissions = await db.permission.findMany({ where: { key: { in: ALL_PERMISSION_KEYS } }, select: { id: true } });
    await db.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    return { permissionsCreated, roleCreated: !existingRole };
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

  /** Principal projection (no password hash) with resolved permissions. */
  async getPrincipal(adminId: string): Promise<AdminPrincipal | null> {
    const db = await this.database.client();
    const admin = await db.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        displayName: true,
        status: true,
        totpEnabledAt: true,
        roles: { select: { role: { select: { key: true, permissions: { select: { permission: { select: { key: true } } } } } } } },
      },
    });
    if (!admin) return null;
    const roles = admin.roles.map((r) => r.role.key);
    const permissions = [...new Set(admin.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key)))].sort();
    return { id: admin.id, email: admin.email, displayName: admin.displayName, status: admin.status, totpEnabled: admin.totpEnabledAt !== null, roles, permissions };
  }
}
