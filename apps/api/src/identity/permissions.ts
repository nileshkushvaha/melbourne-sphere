/**
 * Permission catalogue (SRS RBAC 001): "<resource>.<action>". This is the
 * single source of truth; the database rows are seeded from it and guards
 * only accept keys declared here.
 */
export const PERMISSIONS = {
  'listings.read': 'View business listings',
  'listings.write': 'Create and edit business listings',
  'listings.publish': 'Publish, unpublish and archive business listings',
  'taxonomy.manage': 'Manage categories, services and local areas',
  'reviews.moderate': 'Moderate reviews',
  'comments.moderate': 'Moderate comments',
  'reports.manage': 'Handle abuse reports',
  'enquiries.read': 'View enquiries',
  'enquiries.manage': 'Handle and retry enquiries',
  'posts.write': 'Create and edit blog posts',
  'posts.publish': 'Publish, schedule and archive blog posts',
  'media.manage': 'Upload and manage media',
  'settings.manage': 'Manage site settings and static pages',
  'admins.manage': 'Manage administrator accounts',
  'redirects.manage': 'Manage public URL redirects',
  'audit.read': 'Read the audit log',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export const ALL_PERMISSION_KEYS = Object.keys(PERMISSIONS) as PermissionKey[];

export function isPermissionKey(value: string): value is PermissionKey {
  return Object.prototype.hasOwnProperty.call(PERMISSIONS, value);
}

/** System roles. Only Super Admin is seeded in MVP (SRS ADM 001/003). */
export const SUPER_ADMIN_ROLE = {
  key: 'super_admin',
  name: 'Super Admin',
  description: 'Full access to all administration functions',
} as const;
