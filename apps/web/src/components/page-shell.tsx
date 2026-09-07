import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Inner-page wrapper. `main` is full-bleed so home-page bands can span the
 * viewport; every other page opts back into the bounded content column here,
 * in one place, instead of repeating container classes per route.
 */
export function PageShell({ children, width = 'wide', className = '' }: { children: ReactNode; width?: 'wide' | 'tight'; className?: string }) {
  return <div className={`${width === 'tight' ? 'ms-container-tight' : 'ms-container'} py-10 sm:py-12 ${className}`}>{children}</div>;
}

/**
 * A full-bleed section. `tone` picks its place in the light/dark rhythm:
 * `page` (warm off-white), `plain` (white), `soft` (cool neutral) and the dark
 * bands, which carry `.ms-on-dark` so focus rings stay visible on them.
 */
export function Band({
  tone = 'page',
  children,
  className = '',
  ...rest
}: { tone?: 'page' | 'plain' | 'soft' | 'dark' | 'deep'; children: ReactNode; className?: string } & Omit<React.ComponentProps<'section'>, 'className' | 'children'>) {
  const tones = {
    page: 'bg-surface-muted text-text',
    plain: 'bg-surface text-text',
    soft: 'bg-surface-sunken text-text',
    dark: 'ms-on-dark bg-band text-band-text',
    deep: 'ms-on-dark bg-band-deep text-band-text',
  } as const;
  return (
    <section className={`ms-section ${tones[tone]} ${className}`} {...rest}>
      <div className="ms-container">{children}</div>
    </section>
  );
}

interface HeadingProps {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  tone?: 'light' | 'dark';
}

/** Section heading with an optional "see all" link, shared by the home page bands. */
export function SectionHeading({ id, eyebrow, title, description, href, linkLabel, tone = 'light' }: HeadingProps) {
  const muted = tone === 'dark' ? 'text-band-muted' : 'text-text-muted';
  const link = tone === 'dark' ? 'text-band-link' : 'text-link';
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl">
        {eyebrow && <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.18em] ${tone === 'dark' ? 'text-sky-400' : 'text-sky-700'}`}>{eyebrow}</p>}
        <h2 id={id} className="font-display text-3xl leading-tight tracking-tight sm:text-4xl">
          {title}
        </h2>
        {description && <p className={`mt-3 text-base leading-relaxed sm:text-lg ${muted}`}>{description}</p>}
      </div>
      {href && (
        <Link href={href} className={`inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline ${link}`}>
          {linkLabel ?? 'See all'}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

/**
 * Column count for a card grid, chosen from how many cards there actually are.
 * A fixed four-column grid looks unfinished when the directory has three
 * published listings, so the grid narrows to fit rather than leaving a hole.
 * The class strings are written out in full so Tailwind can see them.
 */
export function gridColumns(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 sm:grid-cols-2';
  if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
}
