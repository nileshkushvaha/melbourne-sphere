/**
 * Static information pages (SRS CFG 002). The slug set is fixed so no one can
 * publish an arbitrary top-level URL, and each page carries the guidance an
 * editor needs before publishing legal or contact copy.
 */
export const STATIC_PAGE_SLUGS = ['about', 'contact', 'privacy', 'terms', 'review-guidelines'] as const;
export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number];

export interface StaticPageDefinition {
  slug: StaticPageSlug;
  defaultTitle: string;
  /** What the page is for; shown to editors, never published. */
  purpose: string;
  /** Contact routing lives on this page only (CFG 002). */
  routesContact?: boolean;
}

export const STATIC_PAGES: StaticPageDefinition[] = [
  { slug: 'about', defaultTitle: 'About Melbourne Sphere', purpose: 'Who publishes the directory, how listings are chosen and how editorial decisions are made.' },
  { slug: 'contact', defaultTitle: 'Contact us', purpose: 'How readers and businesses reach the editors. The contact address is validated before it can be activated.', routesContact: true },
  { slug: 'privacy', defaultTitle: 'Privacy', purpose: 'What personal data the site collects, why, how long it is kept and how to request deletion.' },
  { slug: 'terms', defaultTitle: 'Terms of use', purpose: 'The terms visitors accept by using the site, including listing accuracy and liability.' },
  { slug: 'review-guidelines', defaultTitle: 'Review guidelines', purpose: 'The rules reviewers agree to; linked from the review and comment forms.' },
];

export function staticPageDefinition(slug: string): StaticPageDefinition | undefined {
  return STATIC_PAGES.find((page) => page.slug === slug);
}

/** Minimum body length that counts as real content rather than a stub. */
export const MIN_BODY_CHARACTERS = 200;

/** Wording that must never reach production (CFG 002: no sample or placeholder copy). */
const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /\bTBD\b/i,
  /\bTBC\b/i,
  /to be (written|completed|confirmed)/i,
  /placeholder/i,
  /sample (text|content|address|email)/i,
  /your (company|business) name here/i,
  /example@example\.(com|org)/i,
];

/**
 * Publication gate for an information page. Returns the reasons it cannot be
 * published; an empty list means it is ready.
 */
export function staticPageBlockers(input: { title: string; plainBody: string; contactEmail?: string | null; routesContact?: boolean }): string[] {
  const blockers: string[] = [];
  if (input.title.trim().length < 3) blockers.push('Title must be at least 3 characters');
  const body = input.plainBody.trim();
  if (body.length < MIN_BODY_CHARACTERS) blockers.push(`Page content must be at least ${MIN_BODY_CHARACTERS} characters of real copy`);
  const placeholder = PLACEHOLDER_PATTERNS.find((pattern) => pattern.test(body) || pattern.test(input.title));
  if (placeholder) blockers.push('Remove placeholder or sample wording before publishing');
  if (input.routesContact) {
    const email = (input.contactEmail ?? '').trim();
    if (email === '') blockers.push('A contact address is required before the contact page can be published');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) blockers.push('The contact address is not a valid email address');
    else if (/example\.(com|org|net)$/i.test(email)) blockers.push('The contact address must not be an example domain');
  }
  return blockers;
}
