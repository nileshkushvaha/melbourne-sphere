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

export const PERMISSION_MODULES = ['Overview', 'Business', 'Editorial', 'Community', 'Media', 'Website', 'Configuration', 'Security', 'System', 'Access control'] as const;
export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export const PERMISSIONS = {
  'listings.read': { label: 'View listings', description: 'View business listings', module: 'Business' },
  'listings.write': { label: 'Edit listings', description: 'Create and edit business listings', module: 'Business' },
  'listings.publish': { label: 'Publish listings', description: 'Publish, unpublish and archive business listings', module: 'Business' },
  'taxonomy.manage': { label: 'Manage taxonomy', description: 'Manage categories, services and local areas', module: 'Business' },
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

  // ---- Operational administration (SRS 1.2, RBAC 013 · section 25) ----------
  // Viewing and acting are always separate codes, and revealing protected data
  // is separate again from viewing the record that contains it (MAIL 005).
  'system.settings.view': { label: 'View operational settings', description: 'View the settings registry and the email and operational settings groups', module: 'System' },
  'system.settings.update': { label: 'Change operational settings', description: 'Change the email and operational settings groups', module: 'System' },
  'system.email_logs.view': { label: 'View email delivery log', description: 'View transactional email deliveries with masked recipients', module: 'System' },
  'system.email_logs.recipients.view': { label: 'Reveal email recipients', description: 'Reveal the full recipient address on an email delivery record; every reveal is recorded', module: 'System' },
  'system.email_logs.resend': { label: 'Resend an email', description: 'Resend a transactional email that has not been delivered, complained about or suppressed', module: 'System' },
  // Retired before it was ever assignable (RBAC 002): the consolidated activity
  // log is read with `audit.read`, the code RBAC 001 already names, and two
  // names for one access is how a permission model starts to rot.
  'system.activity_logs.view': { label: 'View the activity log', description: 'Retired: use audit.read, which grants the consolidated activity log', module: 'System', active: false },
  'system.cache.view': { label: 'View cache status', description: 'View cache availability and the registered cache namespaces', module: 'System' },
  'system.cache.invalidate': { label: 'Invalidate caches', description: 'Invalidate a registered cache namespace or tag, and warm an approved cache', module: 'System' },
  'system.queues.view': { label: 'View queues', description: 'View queue depths, worker availability and redacted job detail', module: 'System' },
  'system.queues.retry': { label: 'Retry queue jobs', description: 'Retry an eligible failed job', module: 'System' },
  'system.queues.cancel': { label: 'Cancel queue jobs', description: 'Cancel or remove an eligible waiting or delayed job, and clean job metadata within retention bounds', module: 'System' },
  'system.queues.pause': { label: 'Pause queues', description: 'Pause and resume a queue where operational policy allows it', module: 'System' },
  'system.schedules.view': { label: 'View scheduled tasks', description: 'View registered scheduled tasks and their execution history', module: 'System' },
  'system.schedules.run': { label: 'Run scheduled tasks', description: 'Run a registered task that allows manual execution', module: 'System' },
  'system.schedules.manage': { label: 'Enable scheduled tasks', description: 'Enable or disable a registered task whose registry entry permits runtime control', module: 'System' },

  // ---- Security settings (SRS 1.2, SECS 001–008) ---------------------------
  'security.settings.view': { label: 'View security settings', description: 'View authentication, password policy, login security and session settings', module: 'Security' },
  'security.settings.update': { label: 'Change security settings', description: 'Change authentication, password policy, login security and session settings within their specified bounds', module: 'Security' },
  'security.sessions.view': { label: 'View administrator sessions', description: "View another administrator's active sessions", module: 'Security' },
  'security.sessions.revoke': { label: 'Revoke administrator sessions', description: "Revoke another administrator's sessions", module: 'Security' },

  // ---- Website content modules (SRS 1.2, section 26) -----------------------
  'website.faqs.view': { label: 'View FAQs', description: 'View frequently asked questions', module: 'Website' },
  'website.faqs.create': { label: 'Create FAQs', description: 'Create frequently asked questions', module: 'Website' },
  'website.faqs.update': { label: 'Edit FAQs', description: 'Edit frequently asked questions and their display order', module: 'Website' },
  'website.faqs.publish': { label: 'Publish FAQs', description: 'Publish and unpublish frequently asked questions', module: 'Website' },
  'website.faqs.delete': { label: 'Delete FAQs', description: 'Delete frequently asked questions', module: 'Website' },
  'website.alerts.view': { label: 'View service alerts', description: 'View service alerts', module: 'Website' },
  'website.alerts.create': { label: 'Create service alerts', description: 'Create service alerts', module: 'Website' },
  'website.alerts.update': { label: 'Edit service alerts', description: 'Edit service alerts, their severity, display window and order', module: 'Website' },
  'website.alerts.publish': { label: 'Publish service alerts', description: 'Publish and unpublish service alerts shown above the public header', module: 'Website' },
  'website.alerts.delete': { label: 'Delete service alerts', description: 'Delete service alerts', module: 'Website' },
  'website.testimonials.view': { label: 'View testimonials', description: 'View testimonials and their approval state', module: 'Website' },
  'website.testimonials.create': { label: 'Create testimonials', description: 'Create testimonials', module: 'Website' },
  'website.testimonials.update': { label: 'Edit testimonials', description: 'Edit testimonials and their display order', module: 'Website' },
  'website.testimonials.approve': { label: 'Approve testimonials', description: 'Record that a testimonial is consented and approved for use; publication is refused without it', module: 'Website' },
  'website.testimonials.publish': { label: 'Publish testimonials', description: 'Publish and unpublish approved testimonials', module: 'Website' },
  'website.testimonials.delete': { label: 'Delete testimonials', description: 'Delete testimonials', module: 'Website' },
  'website.clients.view': { label: 'View client and partner logos', description: 'View the client and partner organisations displayed on the website', module: 'Website' },
  'website.clients.create': { label: 'Create client and partner logos', description: 'Create client and partner organisation records', module: 'Website' },
  'website.clients.update': { label: 'Edit client and partner logos', description: 'Edit client and partner organisation records and their display order', module: 'Website' },
  'website.clients.approve': { label: 'Authorise logo display', description: "Record written authorisation to display an organisation's mark; publication is refused without it", module: 'Website' },
  'website.clients.publish': { label: 'Publish client and partner logos', description: 'Publish and unpublish authorised client and partner organisations', module: 'Website' },
  'website.clients.delete': { label: 'Delete client and partner logos', description: 'Delete client and partner organisation records', module: 'Website' },
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
