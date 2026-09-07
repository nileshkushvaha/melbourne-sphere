import 'server-only';

export const SITE_NAME = 'Melbourne Sphere';
export const SITE_TAGLINE = 'Find local businesses across Melbourne';

const ORIGIN_RE = /^https?:\/\/[^/\s]+$/;

/**
 * Absolute public origin used for canonical URLs and metadata (SRS SEO 001,
 * ARC 004: the hostname is configured, never assumed). Defaults to the local
 * dev origin outside production; production must set it explicitly.
 */
export function siteOrigin(): string {
  const value = (process.env.SITE_ORIGIN ?? (process.env.NODE_ENV === 'production' ? '' : 'http://127.0.0.1:3000')).replace(/\/+$/, '');
  if (!ORIGIN_RE.test(value)) throw new Error('SITE_ORIGIN must be set to the public https origin without a path (e.g. https://melbournesphere.example)');
  return value;
}

export function absoluteUrl(path: string): string {
  return `${siteOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Turnstile site key for public forms; null when unset, so forms explain they are closed instead of failing silently (SRS SEC 003). */
export function turnstileSiteKey(): string | null {
  const value = (process.env.TURNSTILE_SITE_KEY ?? '').trim();
  return value.length > 0 ? value : null;
}

/** Domains that only ever resolve on a developer machine; an address on one of these must never be shown as a public contact route. */
const NON_ROUTABLE = /(\.local|\.localhost|\.test|\.invalid|\.example|\.internal)$/i;

export interface ContactChannel {
  /** True only when the configured address is publicly routable, so it is safe to publish. */
  available: boolean;
  email: string | null;
  /** Ready-made mailto for the "Add or update a business" action, or null when no publishable address exists. */
  listingMailto: string | null;
}

/**
 * Public contact route (SRS UX 002, CFG 002). The address is configuration, and
 * a development value such as `listings@melbournesphere.local` is not a real
 * mailbox — publishing it would put a dead address on every page. When the
 * configured value is non-routable the site says the contact route is being
 * finalised instead, and the missing approved address is tracked as content the
 * client still owes.
 */
export function contactChannel(): ContactChannel {
  const value = (process.env.SITE_CONTACT_EMAIL ?? '').trim();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !NON_ROUTABLE.test(value.split('@')[1] ?? '');
  if (!valid) return { available: false, email: null, listingMailto: null };
  return { available: true, email: value, listingMailto: `mailto:${value}?subject=${encodeURIComponent('Add or update a business on Melbourne Sphere')}` };
}
