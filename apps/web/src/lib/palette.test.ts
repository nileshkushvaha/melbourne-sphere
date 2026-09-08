import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Guards the public palette (SRS UX 001, NFR 006/011). It exists because a
 * regression here is invisible in behavioural tests but obvious to a visitor:
 * the site once rendered every band in nearly the same navy, so the whole page
 * read as one flat field with no hierarchy.
 */
const css = readFileSync(resolve(process.cwd(), '../../packages/ui/src/styles.css'), 'utf8');

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css);
  if (!match) throw new Error(`token --${name} is not defined`);
  return match[1]!.toLowerCase();
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const [r, g, b] = (full.match(/.{2}/g) ?? []).map((c) => parseInt(c, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high! + 0.05) / (low! + 0.05);
}

describe('light surfaces', () => {
  const backgrounds = ['ms-surface', 'ms-surface-muted', 'ms-surface-sunken'].map(token);

  it('meets WCAG AA for body text, muted text and links on every light background', () => {
    for (const background of backgrounds) {
      expect(contrast(token('ms-text'), background), `text on ${background}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token('ms-text-muted'), background), `muted text on ${background}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token('ms-link'), background), `link on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('separates cards from the page and the soft band', () => {
    // A card must be visibly distinct from whatever section it sits on.
    expect(Math.abs(luminance(token('ms-surface-raised')) - luminance(token('ms-surface-muted')))).toBeGreaterThan(0.004);
    expect(Math.abs(luminance(token('ms-surface-raised')) - luminance(token('ms-surface-sunken')))).toBeGreaterThan(0.004);
  });

  it('keeps borders visible against the surfaces they divide', () => {
    expect(Math.abs(luminance(token('ms-border')) - luminance(token('ms-surface')))).toBeGreaterThan(0.01);
  });

  it('keeps the keyboard focus indicator visible on every light surface', () => {
    for (const background of backgrounds) {
      expect(contrast(token('ms-focus'), background), `focus on ${background}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('dark bands', () => {
  const bands = ['ms-band', 'ms-band-deep', 'ms-band-raised'].map(token);

  it('meets WCAG AA for band text, muted text and links on every band shade', () => {
    for (const band of bands) {
      expect(contrast(token('ms-band-text'), band), `band text on ${band}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token('ms-band-muted'), band), `band muted text on ${band}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(token('ms-band-link'), band), `band link on ${band}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('is unmistakably darker than the light surfaces it alternates with', () => {
    // The light/dark rhythm is the composition; a band that drifts light
    // collapses the page back into one flat field.
    expect(luminance(token('ms-surface-muted')) - luminance(token('ms-band'))).toBeGreaterThan(0.5);
  });

  it('keeps the hero panel readable over photography', () => {
    expect(contrast(token('ms-panel-text'), token('ms-panel'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('ms-panel-text-muted'), token('ms-panel'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(token('ms-hero-text'), token('ms-band-deep'))).toBeGreaterThanOrEqual(4.5);
  });
});

it('does not reintroduce an operating-system dark scheme', () => {
  // The light/dark rhythm is designed per section. A `prefers-color-scheme`
  // override would repaint every band in the same colour again, which is the
  // exact defect this palette replaced; reintroducing one is a design decision
  // that has to be made deliberately, not by editing a token block.
  expect(css).not.toContain('prefers-color-scheme');
});
