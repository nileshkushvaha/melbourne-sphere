/**
 * Typed permission codes and the canonical resource → permission mapping (SRS
 * RBAC 010). The server calculates and enforces access; this file exists so no
 * component compares raw strings, and so a new screen has exactly one place to
 * declare what it needs.
 *
 * Keep in step with `apps/api/src/identity/permissions.ts`. The contract test in
 * `permissions.test.ts` fails if the API's catalogue gains a code this list does
 * not know, so the two cannot drift silently.
 */
export const PERMISSION = {
  listingsRead: 'listings.read',
  listingsWrite: 'listings.write',
  listingsPublish: 'listings.publish',
  taxonomyManage: 'taxonomy.manage',
  reviewsModerate: 'reviews.moderate',
  commentsModerate: 'comments.moderate',
  reportsManage: 'reports.manage',
  enquiriesRead: 'enquiries.read',
  enquiriesManage: 'enquiries.manage',
  postsWrite: 'posts.write',
  postsPublish: 'posts.publish',
  mediaManage: 'media.manage',
  settingsManage: 'settings.manage',
  redirectsManage: 'redirects.manage',
  adminsManage: 'admins.manage',
  adminsAccessManage: 'admins.access.manage',
  rolesView: 'roles.view',
  rolesCreate: 'roles.create',
  rolesUpdate: 'roles.update',
  rolesDelete: 'roles.delete',
  permissionsView: 'permissions.view',
  auditRead: 'audit.read',
} as const;

export type PermissionCode = (typeof PERMISSION)[keyof typeof PERMISSION];

export const ALL_PERMISSION_CODES = Object.values(PERMISSION) as PermissionCode[];

/**
 * What each admin route needs. One mapping, consulted by the route guard, the
 * navigation and the access-control provider, so a screen cannot be protected in
 * one place and open in another.
 *
 * A path not listed here needs a session only (the dashboard, the account
 * screens). A path listed with several codes needs all of them.
 */
export const ROUTE_PERMISSIONS: { path: string; permissions: PermissionCode[] }[] = [
  { path: '/businesses', permissions: [PERMISSION.listingsRead] },
  { path: '/businesses/featured', permissions: [PERMISSION.listingsRead] },
  { path: '/categories', permissions: [PERMISSION.taxonomyManage] },
  { path: '/services', permissions: [PERMISSION.taxonomyManage] },
  { path: '/areas', permissions: [PERMISSION.taxonomyManage] },
  { path: '/posts', permissions: [PERMISSION.postsWrite] },
  { path: '/authors', permissions: [PERMISSION.postsWrite] },
  { path: '/blog-categories', permissions: [PERMISSION.postsWrite] },
  { path: '/blog-tags', permissions: [PERMISSION.postsWrite] },
  { path: '/media', permissions: [PERMISSION.mediaManage] },
  { path: '/enquiries', permissions: [PERMISSION.enquiriesRead] },
  { path: '/reviews', permissions: [PERMISSION.reviewsModerate] },
  { path: '/comments', permissions: [PERMISSION.commentsModerate] },
  { path: '/reports', permissions: [PERMISSION.reportsManage] },
  { path: '/settings/general', permissions: [PERMISSION.settingsManage] },
  { path: '/settings', permissions: [PERMISSION.settingsManage] },
  { path: '/pages', permissions: [PERMISSION.settingsManage] },
  { path: '/redirects', permissions: [PERMISSION.redirectsManage] },
  { path: '/admins', permissions: [PERMISSION.adminsManage] },
  { path: '/roles', permissions: [PERMISSION.rolesView] },
  { path: '/permissions', permissions: [PERMISSION.permissionsView] },
  { path: '/audit', permissions: [PERMISSION.auditRead] },
];

/** The permissions a path requires; the longest matching prefix wins. */
export function permissionsForPath(path: string): PermissionCode[] {
  const match = [...ROUTE_PERMISSIONS]
    .sort((a, b) => b.path.length - a.path.length)
    .find((entry) => path === entry.path || path.startsWith(`${entry.path}/`));
  return match?.permissions ?? [];
}

/** True when every required code is held. An empty requirement is not a grant of anything. */
export function holdsAll(held: readonly string[] | undefined, required: readonly string[]): boolean {
  if (!held) return false;
  return required.every((code) => held.includes(code));
}
