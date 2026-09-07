// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { HeroBanner, type HeroSlide } from './hero-banner';

const slide = (n: number): HeroSlide => ({
  url: `https://cdn.example/hero-${n}.webp`,
  previewUrl: `https://cdn.example/card-${n}.webp`,
  alt: `Melbourne scene ${n}`,
  caption: n === 1 ? 'Flinders Street' : null,
  focalX: 0.5,
  focalY: 0.4,
  width: 1600,
  height: 900,
});

const runAxe = async (container: HTMLElement) => {
  const results = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map((violation) => `${violation.id}: ${violation.help}`).join('\n');
};

describe('HeroBanner', () => {
  it('renders the content and the solid fallback when there are no slides', async () => {
    const { container } = render(
      <HeroBanner slides={[]}>
        <h1>Discover Melbourne businesses</h1>
      </HeroBanner>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    // No controls without slides to step through.
    expect(screen.queryByRole('button', { name: /next banner image/i })).not.toBeInTheDocument();
    expect(await runAxe(container)).toBe('');
  });

  it('offers keyboard-reachable previous, next, pause and per-image controls', async () => {
    const { container } = render(
      <HeroBanner slides={[slide(1), slide(2), slide(3)]}>
        <h1>Discover Melbourne businesses</h1>
      </HeroBanner>,
    );
    expect(screen.getByRole('button', { name: /previous banner image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next banner image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause the banner/i })).toHaveAttribute('aria-pressed', 'false');
    const dots = screen.getAllByRole('button', { name: /show banner image \d of 3/i });
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Flinders Street')).toBeInTheDocument();
    expect(await runAxe(container)).toBe('');
  });

  it('marks the images decorative so the headline is the accessible content', () => {
    render(
      <HeroBanner slides={[slide(1), slide(2)]}>
        <h1>Discover Melbourne businesses</h1>
      </HeroBanner>,
    );
    // Background photography carries no information the text does not; empty alt
    // keeps it out of the accessibility tree (SRS HERO 001, NFR 011).
    for (const image of document.querySelectorAll('img')) expect(image.getAttribute('alt')).toBe('');
  });
});
