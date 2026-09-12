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

export interface PageSection {
  id: string;
  title: string;
  /** The section's prose, with the picture and the card list taken out of it. */
  html: string;
  image: { src: string; alt: string; credit: string | null } | null;
  /** A list of points, when the section is one; each item's bold opening becomes its title. */
  cards: { title: string; body: string }[];
}

const FIGURE = /<figure[^>]*>[\s\S]*?<\/figure>|<img\b[^>]*>/i;
const IMG_ATTR = (html: string, name: string) => html.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? '';
const LIST = /<ul[^>]*>([\s\S]*?)<\/ul>/i;
/** A picture's caption, which is where a photographer's credit lives. */
const caption = (figure: string): string | null => {
  const text = figure.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1];
  return text ? text.replace(/<[^>]+>/g, '').trim() || null : null;
};
const ITEM = /<li[^>]*>([\s\S]*?)<\/li>/gi;

/**
 * Reads an editor's page as a sequence of sections, so a template can lay it
 * out instead of printing it as one column of text.
 *
 * The shape is the editor's: a section is an `<h2>` and everything under it, a
 * picture they put in a section belongs to that section, and a list of points
 * is a list of points. Nothing is invented — a section with no picture is
 * rendered as words, and a page with no headings comes back as no sections at
 * all, which the caller renders as ordinary prose.
 */
export function pageSections(body: string): { intro: string; sections: PageSection[] } {
  const { html, headings } = withHeadingAnchors(body);
  if (headings.length === 0) return { intro: html, sections: [] };
  const parts = html.split(/(?=<h2\b)/i);
  const intro = parts[0]?.startsWith('<h2') ? '' : (parts.shift() ?? '');
  const sections = parts.map((part, index): PageSection => {
    const heading = headings[index];
    let rest = part.replace(/^<h2[\s\S]*?<\/h2>/i, '');
    const figure = rest.match(FIGURE)?.[0] ?? null;
    if (figure) rest = rest.replace(FIGURE, '');
    const src = figure ? IMG_ATTR(figure, 'src') : '';
    const list = rest.match(LIST);
    const cards: { title: string; body: string }[] = [];
    if (list) {
      for (const match of list[1]!.matchAll(ITEM)) {
        const item = match[1]!.trim();
        const lead = item.match(/^<strong[^>]*>([\s\S]*?)<\/strong>/i);
        // The full stop that ends a card's opening words belongs to the
        // sentence, not to the heading it becomes.
        cards.push({ title: lead ? lead[1]!.replace(/<[^>]+>/g, '').trim().replace(/[.:—–-]$/, '').trim() : '', body: (lead ? item.slice(lead[0].length) : item).replace(/^[\s—–-]+/, '').trim() });
      }
      rest = rest.replace(LIST, '');
    }
    return {
      id: heading?.id ?? `section-${index + 1}`,
      title: heading?.text ?? '',
      html: rest.trim(),
      image: src ? { src, alt: IMG_ATTR(figure ?? '', 'alt'), credit: caption(figure ?? '') } : null,
      cards: cards.length >= 2 ? cards : [],
    };
  });
  return { intro, sections };
}
