/**
 * Permission catalogue (SRS RBAC 001/002): codes are `<resource>.<action>` and
 * are declared here, in code. This module is the single source of truth — the
 * `permissions` table is synchronised from it, guards accept nothing outside it
 * and the admin interface offers nothing outside it, so a misspelt or unknown
 * code cannot exist to be granted.
 *
 * Naming: the codes below are the ones named in SRS RBAC 001 and already carried
 * by every route declaration, seed and test. Revision 1.1 extends the catalogue
 * with the access-control codes rather than renaming the established ones: a
 * rename would be a data migration across roles, assignments and audit history
 * with no behavioural gain, and RBAC 002 governs the convention, not a fixed list.
 *
 * Adding a module: add its entries here, run `pnpm --filter api admin:seed-rbac`
 * (idempotent, audited) and declare the code on the route with
 * `@RequirePermissions('…')`. Nothing becomes visible by default — a new
 * permission grants access only once a role or a direct assignment carries it.
 *
 * Retiring a permission: set `active: false` here and re-run the synchronisation.
 * The row and its history stay; it grants nothing and is not offered for
 * assignment. Delete the entry only once no assignment references it.
 */

export interface PermissionDefinition {
  /** Human-readable name shown in the admin permission matrix. */
  label: string;
  /** One sentence explaining what holding it allows. */
  description: string;
  /** Grouping for the admin interface. */
  module: PermissionModule;
  /** A retired permission stays in the catalogue but grants nothing (RBAC 002). */
  active?: false;
}

export const PERMISSION_MODULES = ['Overview', 'Directory', 'Editorial', 'Community', 'Media', 'Configuration', 'Access control'] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSIONS = {
  'listings.read': { label: 'View listings', description: 'View business listings', module: 'Directory' },
  'listings.write': { label: 'Edit listings', description: 'Create and edit business listings', module: 'Directory' },
  'listings.publish': { label: 'Publish listings', description: 'Publish, unpublish and archive business listings', module: 'Directory' },
  'taxonomy.manage': { label: 'Manage taxonomy', description: 'Manage categories, services and local areas', module: 'Directory' },
  'reviews.moderate': { label: 'Moderate reviews', description: 'Moderate reviews', module: 'Community' },
  'comments.moderate': { label: 'Moderate comments', description: 'Moderate comments', module: 'Community' },
  'reports.manage': { label: 'Handle abuse reports', description: 'Handle abuse reports', module: 'Community' },
  'enquiries.read': { label: 'View enquiries', description: 'View enquiries', module: 'Community' },
  'enquiries.manage': { label: 'Handle enquiries', description: 'Handle and retry enquiries', module: 'Community' },
  'posts.write': { label: 'Edit articles', description: 'Create and edit blog posts', module: 'Editorial' },
  'posts.publish': { label: 'Publish articles', description: 'Publish, schedule and archive blog posts', module: 'Editorial' },
  'media.manage': { label: 'Manage media', description: 'Upload and manage media', module: 'Media' },
  'settings.manage': { label: 'Manage settings', description: 'Manage site settings and static pages', module: 'Configuration' },
  'redirects.manage': { label: 'Manage redirects', description: 'Manage public URL redirects', module: 'Configuration' },
  'admins.manage': { label: 'Manage administrators', description: 'Create administrators, change their status and revoke their sessions', module: 'Access control' },
  'admins.access.manage': {
    label: 'Assign administrator access',
    description: "Assign an administrator's roles and direct permissions",
    module: 'Access control',
  },
  'roles.view': { label: 'View roles', description: 'View roles and the permissions they carry', module: 'Access control' },
  'roles.create': { label: 'Create roles', description: 'Create new roles', module: 'Access control' },
  'roles.update': { label: 'Edit roles', description: 'Edit role details, activation and the permissions a role carries', module: 'Access control' },
  'roles.delete': { label: 'Delete roles', description: 'Delete an unused role that is not a protected system role', module: 'Access control' },
  'permissions.view': { label: 'View the permission catalogue', description: 'View the registered permission catalogue', module: 'Access control' },
  'audit.read': { label: 'Read the audit log', description: 'Read the audit log, including authorization events', module: 'Access control' },
} as const satisfies Record<string, PermissionDefinition>;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

/** Keys that currently grant access; a retired entry is excluded. */
export const ACTIVE_PERMISSION_KEYS = ALL_PERMISSION_KEYS.filter((key) => (PERMISSIONS[key] as PermissionDefinition).active !== false);

export function isPermissionKey(value: string): value is PermissionKey {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

/** True when the code is registered *and* still granting access (RBAC 002). */
export function isActivePermissionKey(value: string): value is PermissionKey {
  return isPermissionKey(value) && (PERMISSIONS[value] as PermissionDefinition).active !== false;
}

export function permissionDefinition(key: PermissionKey): PermissionDefinition {
  return PERMISSIONS[key] as PermissionDefinition;
}

/** System roles. Only Super Admin is seeded; it is protected (SRS ADM 001/003, RBAC 011). */
export const SUPER_ADMIN_ROLE = {
  key: 'super_admin',
  name: 'Super Admin',
  description: 'Full access to all administration functions',
} as const;
