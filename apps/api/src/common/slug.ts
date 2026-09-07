/** Public URL slugs: lowercase, hyphen separated, ASCII (SRS SEO 001 / UX 003). */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SLUG_MAX_LENGTH = 100;

/** Derives a slug from a name; returns '' when nothing usable remains. */
const TRANSLITERATIONS: Record<string, string> = { ß: 'ss', æ: 'ae', Æ: 'ae', ø: 'o', Ø: 'o', œ: 'oe', Œ: 'oe', đ: 'd', Đ: 'd', ł: 'l', Ł: 'l' };

export function slugify(input: string): string {
  return input
    .replace(/[ßæÆøØœŒđĐłŁ]/g, (ch) => TRANSLITERATIONS[ch] ?? ch)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug);
}
