/**
 * How a stored activity code reads on screen.
 *
 * Two screens show the same events — the dashboard's recent-activity list and
 * the activity log — and each had grown its own way of turning `auth.login.
 * success` into English. Two renderings of one code is a small thing that reads
 * as a bug the first time someone compares them, so both now call this.
 *
 * Nothing here invents meaning: a code with no entry falls back to its own
 * words, which is stilted but always true to what was recorded.
 */

/** Codes whose plain reading is not derivable from their words. */
const EXACT: Record<string, string> = {
  'auth.login.success': 'Signed in',
  'auth.login.failure': 'Failed sign-in',
  'auth.logout': 'Signed out',
  'auth.password_reset.requested': 'Password reset requested',
  'auth.password_reset.completed': 'Password reset completed',
  'system.queue.pause': 'Queue paused',
  'system.queue.retry': 'Job retried',
  'system.queue.cancel': 'Job removed',
  'system.cache.invalidate': 'Cache cleared',
};

/** The trailing word of a code, in the tense an operator would use for it. */
const VERBS: Record<string, string> = {
  create: 'Created',
  created: 'Created',
  update: 'Updated',
  updated: 'Updated',
  delete: 'Deleted',
  deleted: 'Deleted',
  approve: 'Approved',
  reject: 'Rejected',
  publish: 'Published',
  unpublish: 'Unpublished',
  submitted: 'Submitted',
  accepted: 'Accepted',
  retry: 'Retried',
  redact: 'Redacted',
  reveal: 'Read in full',
  investigate: 'Investigating',
  resolve: 'Resolved',
  disable: 'Disabled',
  enable: 'Enabled',
  failed: 'Failed',
  denied: 'Refused',
};

function sentence(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * @param action the stored code, e.g. `enquiry.contact.reveal`.
 * @param withDomain whether the first segment belongs in the words. The activity
 *   log shows the area in its own column and would otherwise say it twice; the
 *   dashboard's one-line list has nowhere else to put it.
 */
export function readableAction(action: string, { withDomain = false }: { withDomain?: boolean } = {}): string {
  const exact = EXACT[action];
  if (exact) return exact;
  const parts = action.split('.');
  const rest = withDomain ? parts : parts.slice(1);
  if (rest.length === 0) return sentence(action.replace(/[._]/g, ' '));
  const last = rest[rest.length - 1]!;
  const verb = VERBS[last];
  if (!verb) return sentence(rest.join(' ').replace(/_/g, ' '));
  const subject = rest.slice(0, -1).join(' ').replace(/_/g, ' ');
  return subject ? `${sentence(subject)} — ${verb.toLowerCase()}` : verb;
}

/** A stored type name as a reader would say it: `abuse_report` → "Abuse report". */
export function readableTargetType(value: string): string {
  return sentence(value.replace(/[._]/g, ' '));
}
