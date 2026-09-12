/**
 * Information pages (SRS CFG 002, amended in SRS 1.6 and 1.7).
 *
 * There are two kinds of page, and the difference is only who decided the
 * address:
 *
 *  - **System pages** are declared here. They exist because something in the
 *    product refers to them — the review form links to the review guidelines,
 *    the privacy policy is named in the forms' collection notice, and About has
 *    its own template and navigation item. They cannot be created, renamed or
 *    deleted from the interface, because the code that points at them would
 *    then point at nothing.
 *  - **Custom pages** are created by an administrator with any address that
 *    passes `pageSlugProblem`. Until SRS 1.7 the slug set was closed, which
 *    guaranteed that no one could publish an arbitrary top-level URL; that
 *    guarantee is now kept by validation instead — a reserved list, a strict
 *    pattern and a uniqueness check — so an editor can add a page without being
 *    able to shadow a product route or take an address the framework already
 *    serves.
 *
 * There is deliberately no `contact` page of either kind: `/contact` is a
 * product route whose routing address comes from the site settings (CFG 001),
 * so an editor cannot redirect enquiries by typing an address into a document.
 */
export type StaticPageTemplate = 'generic' | 'about';

export interface StaticPageDefinition {
  slug: string;
  defaultTitle: string;
  /** What the page is for; shown to editors, never published. */
  purpose: string;
  /** Which public template renders it, and therefore which editor opens it. */
  template: StaticPageTemplate;
}

/** Pages the product itself refers to. Not creatable, renameable or deletable. */
export const SYSTEM_PAGES: StaticPageDefinition[] = [
  {
    slug: 'about',
    defaultTitle: 'About Melbourne Sphere',
    purpose: 'Who publishes the directory, how listings are chosen and how editorial decisions are made. Written entirely in the admin: the page shows what an editor writes and nothing else.',
    template: 'generic',
  },
  { slug: 'privacy', defaultTitle: 'Privacy Policy', purpose: 'What personal data the site collects, why, how long it is kept and how to request deletion.', template: 'generic' },
  { slug: 'terms', defaultTitle: 'Terms of Use', purpose: 'The terms visitors accept by using the site, including listing accuracy and liability.', template: 'generic' },
  { slug: 'review-guidelines', defaultTitle: 'Review Guidelines', purpose: 'The rules reviewers agree to; linked from the review and comment forms.', template: 'generic' },
];

export const SYSTEM_PAGE_SLUGS = SYSTEM_PAGES.map((page) => page.slug);

export function systemPageDefinition(slug: string): StaticPageDefinition | undefined {
  return SYSTEM_PAGES.find((page) => page.slug === slug);
}

export function isSystemPage(slug: string): boolean {
  return SYSTEM_PAGE_SLUGS.includes(slug);
}

/** Editor-facing description of a page an administrator created. */
export const CUSTOM_PAGE_PURPOSE = 'A page you created. It is published at this address and listed in the site footer once it goes live.';

/**
 * Addresses a custom page may not take.
 *
 * Two groups, for two different failure modes. The first are routes the public
 * site already serves: Next.js resolves a static route before the dynamic page
 * route, so a page slugged `blog` would be created, published, listed in the
 * footer, and answer with the blog index — a page that exists everywhere except
 * where you look for it. The second are addresses that are not routes today but
 * would be surprising to hand to an editor: framework and infrastructure paths,
 * and the admin surface itself.
 */
export const RESERVED_SLUGS = [
  // Public routes.
  'about',
  'blog',
  'business',
  'businesses',
  'contact',
  'directory',
  'faqs',
  'privacy',
  'terms',
  'review-guidelines',
  'robots.txt',
  'sitemap.xml',
  'sitemaps',
  // Framework, infrastructure and the admin surface.
  '_next',
  'admin',
  'api',
  'assets',
  'account',
  'health',
  'images',
  'login',
  'logout',
  'media',
  'public',
  'search',
  'static',
  'well-known',
] as const;

/** Lower-case letters, digits and single hyphens; 2–64 characters. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_LENGTH = 64;

/**
 * Why this address cannot be used, or null when it can.
 *
 * Returns a sentence rather than a boolean because every one of these is shown
 * to the person typing: "invalid" tells an editor nothing they can act on.
 */
export function pageSlugProblem(input: string): string | null {
  const slug = input.trim().toLowerCase();
  if (slug.length < 2) return 'An address needs at least 2 characters';
  if (slug.length > MAX_SLUG_LENGTH) return `An address is at most ${MAX_SLUG_LENGTH} characters`;
  // Reserved before pattern: `sitemap.xml` and `robots.txt` fail both, and
  // "that address belongs to the site" is the more useful of the two answers.
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) return 'That address is used by the site itself, so a page there would never be seen';
  if (!SLUG_PATTERN.test(slug)) return 'Use lower-case letters, numbers and single hyphens, for example community-guidelines';
  return null;
}

/** The address as it will be stored, once `pageSlugProblem` has accepted it. */
export function normalisePageSlug(input: string): string {
  return input.trim().toLowerCase();
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
export function staticPageBlockers(input: { title: string; plainBody: string }): string[] {
  const blockers: string[] = [];
  if (input.title.trim().length < 3) blockers.push('Title must be at least 3 characters');
  const body = input.plainBody.trim();
  if (body.length < MIN_BODY_CHARACTERS) blockers.push(`Page content must be at least ${MIN_BODY_CHARACTERS} characters of real copy`);
  const placeholder = PLACEHOLDER_PATTERNS.find((pattern) => pattern.test(body) || pattern.test(input.title));
  if (placeholder) blockers.push('Remove placeholder or sample wording before publishing');
  return blockers;
}
