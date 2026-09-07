import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/**
 * Editorial content pipeline (SRS BLOG 001, SEC 001). Authors write Markdown;
 * the server renders it and then removes everything outside an explicit
 * allowlist, so what is stored is already safe for both public pages and admin
 * previews. Sanitisation never trusts the renderer: raw HTML embedded in the
 * Markdown passes through the same allowlist.
 */
const ALLOWED_TAGS = [
  'h2', 'h3', 'h4', 'p', 'br', 'hr',
  'strong', 'em', 'del', 'sup', 'sub',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const SANITISE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'title', 'rel', 'target'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    th: ['scope', 'colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    code: ['class'],
  },
  // Only these protocols survive; javascript:, data: and vbscript: never do.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  transformTags: {
    // External links open safely; internal ones keep default behaviour (SRS BUS 003 style rules).
    a: (tagName, attribs) => {
      const href = attribs.href ?? '';
      const external = /^https?:\/\//i.test(href);
      return { tagName, attribs: { ...attribs, ...(external ? { rel: 'noopener noreferrer nofollow', target: '_blank' } : { rel: attribs.rel ?? 'noopener' }) } };
    },
    img: (tagName, attribs) => ({ tagName, attribs: { ...attribs, alt: attribs.alt ?? '', loading: 'lazy' } }),
  },
  exclusiveFilter: (frame) => frame.tag === 'a' && !frame.attribs.href,
};

marked.setOptions({ gfm: true, breaks: false, async: false });

/** Source format an article was written in; both end up as the same sanitised HTML. */
export type BodyFormat = 'markdown' | 'html';

/**
 * Renders an article body and returns sanitised HTML that is safe to store and
 * display. Markdown is rendered first; rich-editor HTML skips the renderer but
 * passes the identical allowlist, so neither route can introduce script,
 * style or event-handler content (SRS SEC 001).
 */
export function renderSanitisedBody(body: string, format: BodyFormat = 'markdown'): string {
  if (format === 'html') return sanitizeHtml(body ?? '', SANITISE_OPTIONS).trim();
  const rendered = marked.parse(body ?? '', { async: false }) as string;
  return sanitizeHtml(rendered, SANITISE_OPTIONS).trim();
}

/** Sanitises fragments that are already HTML (e.g. taxonomy landing content). */
export function sanitiseHtmlFragment(html: string): string {
  return sanitizeHtml(html ?? '', SANITISE_OPTIONS).trim();
}

/** Plain text for excerpts, search and length checks; never used for rendering. */
export function toPlainText(html: string): string {
  return sanitizeHtml(html ?? '', { allowedTags: [], allowedAttributes: {} }).replace(/\s+/g, ' ').trim();
}
