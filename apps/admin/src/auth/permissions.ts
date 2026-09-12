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

  // Operational administration (SRS 1.2 section 25, RBAC 013). Screens land
  // with their module; the codes are declared here as soon as the catalogue
  // carries them, so the contract test proves the two lists agree.
  systemSettingsView: 'system.settings.view',
  systemSettingsUpdate: 'system.settings.update',
  systemEmailLogsView: 'system.email_logs.view',
  systemEmailLogsRecipientsView: 'system.email_logs.recipients.view',
  systemEmailLogsResend: 'system.email_logs.resend',
  systemCacheView: 'system.cache.view',
  systemCacheInvalidate: 'system.cache.invalidate',
  systemQueuesView: 'system.queues.view',
  systemQueuesRetry: 'system.queues.retry',
  systemQueuesCancel: 'system.queues.cancel',
  systemQueuesPause: 'system.queues.pause',
  systemSchedulesView: 'system.schedules.view',
  systemSchedulesRun: 'system.schedules.run',
  systemSchedulesManage: 'system.schedules.manage',

  // Security settings (SECS 001–008).
  securitySettingsView: 'security.settings.view',
  securitySettingsUpdate: 'security.settings.update',
  securitySessionsView: 'security.sessions.view',
  securitySessionsRevoke: 'security.sessions.revoke',

  // Website content modules (SRS 1.2 section 26).
  websiteFaqsView: 'website.faqs.view',
  websiteFaqsCreate: 'website.faqs.create',
  websiteFaqsUpdate: 'website.faqs.update',
  websiteFaqsPublish: 'website.faqs.publish',
  websiteFaqsDelete: 'website.faqs.delete',
  websiteAlertsView: 'website.alerts.view',
  websiteAlertsCreate: 'website.alerts.create',
  websiteAlertsUpdate: 'website.alerts.update',
  websiteAlertsPublish: 'website.alerts.publish',
  websiteAlertsDelete: 'website.alerts.delete',
  websiteTestimonialsView: 'website.testimonials.view',
  websiteTestimonialsCreate: 'website.testimonials.create',
  websiteTestimonialsUpdate: 'website.testimonials.update',
  websiteTestimonialsApprove: 'website.testimonials.approve',
  websiteTestimonialsPublish: 'website.testimonials.publish',
  websiteTestimonialsDelete: 'website.testimonials.delete',
  websiteClientsView: 'website.clients.view',
  websiteClientsCreate: 'website.clients.create',
  websiteClientsUpdate: 'website.clients.update',
  websiteClientsApprove: 'website.clients.approve',
  websiteClientsPublish: 'website.clients.publish',
  websiteClientsDelete: 'website.clients.delete',
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
  { path: '/system/email-logs', permissions: [PERMISSION.systemEmailLogsView] },
  { path: '/website/faqs', permissions: [PERMISSION.websiteFaqsView] },
  { path: '/website/faqs/new', permissions: [PERMISSION.websiteFaqsCreate] },
  { path: '/website/faqs/:id', permissions: [PERMISSION.websiteFaqsUpdate] },
  { path: '/website/service-alerts', permissions: [PERMISSION.websiteAlertsView] },
  { path: '/website/service-alerts/new', permissions: [PERMISSION.websiteAlertsCreate] },
  { path: '/website/service-alerts/:id', permissions: [PERMISSION.websiteAlertsUpdate] },
  { path: '/website/testimonials', permissions: [PERMISSION.websiteTestimonialsView] },
  { path: '/website/testimonials/new', permissions: [PERMISSION.websiteTestimonialsCreate] },
  { path: '/website/testimonials/:id', permissions: [PERMISSION.websiteTestimonialsUpdate] },
  { path: '/website/partners', permissions: [PERMISSION.websiteClientsView] },
  { path: '/website/partners/new', permissions: [PERMISSION.websiteClientsCreate] },
  { path: '/website/partners/:id', permissions: [PERMISSION.websiteClientsUpdate] },
  { path: '/security/settings', permissions: [PERMISSION.securitySettingsView] },
  { path: '/system/cache', permissions: [PERMISSION.systemCacheView] },
  { path: '/system/queues', permissions: [PERMISSION.systemQueuesView] },
  { path: '/system/schedules', permissions: [PERMISSION.systemSchedulesView] },
  { path: '/businesses', permissions: [PERMISSION.listingsRead] },
  { path: '/businesses/featured', permissions: [PERMISSION.listingsRead] },
  { path: '/businesses/featured/new', permissions: [PERMISSION.listingsPublish] },
  { path: '/categories', permissions: [PERMISSION.taxonomyManage] },
  { path: '/categories/:id', permissions: [PERMISSION.taxonomyManage] },
  { path: '/services', permissions: [PERMISSION.taxonomyManage] },
  { path: '/services/:id', permissions: [PERMISSION.taxonomyManage] },
  { path: '/areas', permissions: [PERMISSION.taxonomyManage] },
  { path: '/areas/:id', permissions: [PERMISSION.taxonomyManage] },
  { path: '/posts', permissions: [PERMISSION.postsWrite] },
  { path: '/authors', permissions: [PERMISSION.postsWrite] },
  { path: '/blog-categories', permissions: [PERMISSION.postsWrite] },
  { path: '/blog-categories/:id', permissions: [PERMISSION.postsWrite] },
  { path: '/blog-tags', permissions: [PERMISSION.postsWrite] },
  { path: '/blog-tags/:id', permissions: [PERMISSION.postsWrite] },
  { path: '/media', permissions: [PERMISSION.mediaManage] },
  { path: '/media/:id', permissions: [PERMISSION.mediaManage] },
  { path: '/enquiries', permissions: [PERMISSION.enquiriesRead] },
  { path: '/reviews', permissions: [PERMISSION.reviewsModerate] },
  { path: '/comments', permissions: [PERMISSION.commentsModerate] },
  { path: '/reports', permissions: [PERMISSION.reportsManage] },
  { path: '/settings/general', permissions: [PERMISSION.settingsManage] },
  { path: '/settings/seo', permissions: [PERMISSION.settingsManage] },
  { path: '/settings', permissions: [PERMISSION.settingsManage] },
  { path: '/website/pages/new', permissions: [PERMISSION.settingsManage] },
  { path: '/website/pages/:slug', permissions: [PERMISSION.settingsManage] },
  { path: '/website/pages', permissions: [PERMISSION.settingsManage] },
  { path: '/pages', permissions: [PERMISSION.settingsManage] },
  { path: '/redirects', permissions: [PERMISSION.redirectsManage] },
  { path: '/redirects/new', permissions: [PERMISSION.redirectsManage] },
  { path: '/admins', permissions: [PERMISSION.adminsManage] },
  { path: '/admins/new', permissions: [PERMISSION.adminsManage] },
  { path: '/roles', permissions: [PERMISSION.rolesView] },
  { path: '/permissions', permissions: [PERMISSION.permissionsView] },
  { path: '/audit', permissions: [PERMISSION.auditRead] },
];

/** The permissions a path requires; the longest matching prefix wins. */
/** Segment-wise match allowing `:param` placeholders, e.g. `/website/faqs/:id`. */
function matchesPattern(pattern: string, path: string): boolean {
  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
}

export function permissionsForPath(path: string): PermissionCode[] {
  const candidates = [...ROUTE_PERMISSIONS].sort((a, b) => b.path.length - a.path.length);
  // A pattern that matches segment for segment wins over a prefix: an editor at
  // `/website/faqs/:id` needs the edit permission, not the list's read
  // permission, so opening it without that permission shows the forbidden state
  // rather than a form the server will refuse to save (SRS RBAC 010).
  const exact = candidates.find((entry) => matchesPattern(entry.path, path));
  if (exact) return exact.permissions;
  const prefix = candidates.find((entry) => path === entry.path || path.startsWith(`${entry.path}/`));
  return prefix?.permissions ?? [];
}

/** True when every required code is held. An empty requirement is not a grant of anything. */
export function holdsAll(held: readonly string[] | undefined, required: readonly string[]): boolean {
  if (!held) return false;
  return required.every((code) => held.includes(code));
}
