import { validatePublicUrl } from '../directory/business-rules.js';

/**
 * Service alert rules (SRS 1.2 ALRT 002/003/005).
 *
 * Kept apart from the service so the two things worth proving on their own —
 * which alert wins, and which link is safe — are testable without a database.
 */

export type AlertSeverity = 'informational' | 'warning' | 'emergency';

/** Highest first. Severity outranks priority: an emergency is never queued behind a promotion. */
const SEVERITY_RANK: Record<AlertSeverity, number> = { emergency: 3, warning: 2, informational: 1 };

/** At most this many alerts render at once; more would bury the page they sit above (ALRT 002). */
export const MAX_VISIBLE_ALERTS = 2;

export interface SelectableAlert {
  id: string;
  severity: AlertSeverity;
  priority: number;
  displayOrder: number;
  createdAt: Date;
  startsAt: Date | null;
  endsAt: Date | null;
}

/** Inside its display window: an absent bound means "from now on" or "until further notice". */
export function isWithinWindow(alert: Pick<SelectableAlert, 'startsAt' | 'endsAt'>, now: Date): boolean {
  if (alert.startsAt && alert.startsAt.getTime() > now.getTime()) return false;
  if (alert.endsAt && alert.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

/**
 * The deterministic order of ALRT 002: severity, then priority, then display
 * order, then creation time, then id. The last two exist so that two alerts
 * that are equal in every editorial sense still order the same way on every
 * request — a selection that flickers between requests is a caching bug waiting
 * to be filed.
 */
export function selectVisibleAlerts<T extends SelectableAlert>(alerts: readonly T[], now: Date, limit = MAX_VISIBLE_ALERTS): T[] {
  return [...alerts]
    .filter((alert) => isWithinWindow(alert, now))
    .sort(
      (a, b) =>
        SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
        b.priority - a.priority ||
        a.displayOrder - b.displayOrder ||
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    )
    .slice(0, limit);
}

export interface ValidatedLink {
  /** A site-relative path, or an absolute http(s) URL. */
  url: string;
  external: boolean;
}

/**
 * Validates a link destination at write time (ALRT 005). Internal destinations
 * are site-relative paths; external ones must be http or https. Everything else
 * — `javascript:`, `data:`, protocol-relative `//host`, credentials in the URL —
 * is refused on save rather than filtered at render, because a renderer that
 * has to decide is a renderer that will eventually decide wrong.
 */
export function validateAlertLink(value: string): ValidatedLink | null {
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 300) return null;
  // A protocol-relative URL reads as a path and behaves as a host.
  if (trimmed.startsWith('//')) return null;
  if (trimmed.startsWith('/')) {
    // One leading slash, no scheme, no backslashes, no control characters.
    if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#[\]]*$/.test(trimmed)) return null;
    return { url: trimmed, external: false };
  }
  const absolute = validatePublicUrl(trimmed);
  return absolute ? { url: absolute, external: true } : null;
}

/**
 * Accessible semantics by severity (ALRT 004). An assertive live region
 * interrupts a screen reader mid-sentence, so it is reserved for a genuine
 * emergency; everything else is polite.
 */
export function ariaLiveFor(severity: AlertSeverity): 'assertive' | 'polite' {
  return severity === 'emergency' ? 'assertive' : 'polite';
}

export function alertRoleFor(severity: AlertSeverity): 'alert' | 'status' {
  return severity === 'emergency' ? 'alert' : 'status';
}
