/**
 * Pure redirect rules (SRS SEO 004). Sources and targets are always
 * site-relative paths on the single configured origin; nothing here touches the
 * database so the rules can be tested in isolation.
 */

/** Longest path we store; matches the VARCHAR(255) columns. */
export const MAX_PATH_LENGTH = 255;

/** Paths that must never be redirected or become a redirect target. */
const RESERVED_PREFIXES = ['/admin', '/api', '/_next'];

export class RedirectRuleError extends Error {
  constructor(
    readonly field: 'sourcePath' | 'targetPath',
    message: string,
  ) {
    super(message);
    this.name = 'RedirectRuleError';
  }
}

/**
 * Canonical form of a public path: lowercase, single leading slash, no query,
 * no fragment, no duplicate or trailing slash. Returns null when the input is
 * not a site-relative path we are willing to store or match.
 */
export function normalisePath(input: string): string | null {
  const raw = input.trim();
  if (raw === '') return null;
  // Reject absolute URLs, protocol-relative URLs and scheme-like values before
  // any normalisation, so "//evil.example" can never become a target.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) || raw.startsWith('//') || raw.startsWith('\\')) return null;
  if (!raw.startsWith('/')) return null;
  const withoutQuery = raw.split(/[?#]/, 1)[0] ?? '';
  const lower = withoutQuery.toLowerCase();
  if (lower.includes('..') || /[\s<>"'`]/.test(lower) || /%2f/i.test(lower)) return null;
  if (!/^[a-z0-9/_.~-]*$/.test(lower)) return null;
  const collapsed = lower.replace(/\/{2,}/g, '/');
  const trimmed = collapsed.length > 1 ? collapsed.replace(/\/+$/, '') : collapsed;
  const path = trimmed === '' ? '/' : trimmed;
  return path.length > MAX_PATH_LENGTH ? null : path;
}

/** True for paths that are never public content (admin, API, framework assets). */
export function isReservedPath(path: string): boolean {
  return RESERVED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export interface RedirectPair {
  sourcePath: string;
  targetPath: string | null;
}

/**
 * Validates a redirect before it is written. `gone` entries have no target;
 * permanent entries need a distinct, non-reserved, site-relative target.
 * Cycles longer than one hop cannot exist because the service repoints
 * existing aliases instead of chaining them.
 */
export function validateRedirect(source: string, target: string | null, kind: 'permanent' | 'gone'): RedirectPair {
  const sourcePath = normalisePath(source);
  if (!sourcePath) throw new RedirectRuleError('sourcePath', 'Source must be a site-relative path such as /business/old-slug');
  if (sourcePath === '/') throw new RedirectRuleError('sourcePath', 'The home page cannot be redirected');
  if (isReservedPath(sourcePath)) throw new RedirectRuleError('sourcePath', 'That path is reserved and cannot be redirected');
  if (kind === 'gone') return { sourcePath, targetPath: null };
  const targetPath = target === null || target === undefined ? null : normalisePath(target);
  if (!targetPath) throw new RedirectRuleError('targetPath', 'Target must be a site-relative path on this site');
  if (isReservedPath(targetPath)) throw new RedirectRuleError('targetPath', 'That path is reserved and cannot be a redirect target');
  if (targetPath === sourcePath) throw new RedirectRuleError('targetPath', 'A path cannot redirect to itself');
  return { sourcePath, targetPath };
}
