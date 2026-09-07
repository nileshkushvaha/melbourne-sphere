import { brand, createAdminTheme } from './theme';

/** Relative luminance per WCAG 2.x. */
function luminance(hex: string): number {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/.{2}/g)!
    .map((c) => parseInt(c, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1! + 0.05) / (l2! + 0.05);
}

describe('theme', () => {
  it('meets WCAG AA contrast for core colour pairs', () => {
    expect(contrast('#FFFFFF', brand.primary)).toBeGreaterThanOrEqual(4.5); // white text on primary buttons
    expect(contrast(brand.primary, '#FFFFFF')).toBeGreaterThanOrEqual(4.5); // links on white
    expect(contrast(brand.navyText, brand.navy)).toBeGreaterThanOrEqual(4.5); // nav text on navy
    expect(contrast(brand.focus, brand.navy)).toBeGreaterThanOrEqual(3); // focus ring on navy (non-text)
    expect(contrast(brand.focus, '#FFFFFF')).toBeGreaterThanOrEqual(3); // focus ring on white (non-text)
  });

  it('disables motion when the user prefers reduced motion', () => {
    expect(createAdminTheme(true).token?.motion).toBe(false);
    expect(createAdminTheme(false).token?.motion).toBe(true);
  });
});
