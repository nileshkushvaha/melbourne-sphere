/**
 * Anchors for the sections of an editor-written page, so a long policy can be
 * navigated and linked to section by section.
 *
 * The body is HTML the API has already sanitised with an allowlist before
 * storing it (SRS SEC 001), so this only adds `id` attributes to the top-level
 * headings it finds; it never introduces markup of its own beyond that. An
 * `id` an editor set by hand is kept, and duplicate titles get a numeric
 * suffix, so two "Your choices" sections still have distinct addresses.
 */
export interface Heading {
  id: string;
  text: string;
}

const HEADING = /<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/gi;
const EXISTING_ID = /\bid\s*=\s*["']([^"']+)["']/i;

const text = (html: string): string =>
  html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

/** Returns the body with anchored headings, and the headings themselves in document order. */
export function withHeadingAnchors(body: string): { html: string; headings: Heading[] } {
  const headings: Heading[] = [];
  const used = new Set<string>();
  const html = body.replace(HEADING, (match, attributes: string | undefined, inner: string) => {
    const label = text(inner);
    if (!label) return match;
    const existing = attributes?.match(EXISTING_ID)?.[1];
    let id = existing ?? slugify(label) ?? '';
    if (!id) return match;
    if (!existing) {
      let n = 2;
      const base = id;
      while (used.has(id)) id = `${base}-${n++}`;
    }
    used.add(id);
    headings.push({ id, text: label });
    return existing ? match : `<h2${attributes ?? ''} id="${id}">${inner}</h2>`;
  });
  return { html, headings };
}
