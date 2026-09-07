'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PauseIcon, PlayIcon } from 'lucide-react';
import { PHRASE_DWELL_MS, PHRASE_TRANSITION_MS, accessibleHeadline, nextPhraseIndex } from '@/lib/hero';

interface Props {
  headline: string;
  phrases: string[];
  /** Longest phrase, rendered invisibly to reserve height so rotation causes no layout shift (SRS HERO 002). */
  children?: never;
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void): () => void {
  const media = window.matchMedia(REDUCED_MOTION);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

function subscribeToVisibility(onChange: () => void): () => void {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

/**
 * Rotating hero phrase (SRS HERO 002/003). The accessible name is one stable
 * sentence; the visible phrase is `aria-hidden`, so screen readers never hear a
 * per-phrase announcement. Rotation stops under `prefers-reduced-motion`, while
 * the tab is hidden, and whenever the user pauses it.
 */
export function HeroHeadline({ headline, phrases }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Server render assumes reduced motion and a hidden document, so no rotation
  // is implied before hydration reads the real values.
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => true);
  const visible = useSyncExternalStore(subscribeToVisibility, () => !document.hidden, () => false);

  const rotating = phrases.length > 1 && !reducedMotion && !paused && visible;

  useEffect(() => {
    if (!rotating) return;
    timer.current = setTimeout(() => setIndex((i) => nextPhraseIndex(i, phrases.length)), PHRASE_DWELL_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [rotating, index, phrases.length]);

  const current = phrases[index] ?? phrases[0] ?? '';
  const canPause = phrases.length > 1 && !reducedMotion;

  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="font-display max-w-4xl text-[clamp(2rem,5.4vw,4.25rem)] leading-[1.05] tracking-tight text-white">
        <span className="sr-only">{accessibleHeadline(headline, phrases)}</span>
        <span aria-hidden="true">
          {headline}
          {phrases.length > 0 && (
            <>
              {' '}
              <span className="relative inline-grid align-bottom">
                {/* Invisible longest phrase reserves the height and width so nothing shifts. */}
                <span className="invisible col-start-1 row-start-1 whitespace-nowrap">{phrases.reduce((a, b) => (b.length > a.length ? b : a), '')}</span>
                <span
                  key={index}
                  className="col-start-1 row-start-1 text-sky-400 motion-safe:animate-[ms-fade_var(--ms-phrase-transition)_ease-out]"
                  style={{ ['--ms-phrase-transition' as string]: `${PHRASE_TRANSITION_MS}ms` }}
                >
                  {current}
                </span>
              </span>
            </>
          )}
        </span>
      </h1>
      {canPause && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-full border border-white/20 px-3.5 text-xs font-medium text-hero-text/90 transition-colors hover:border-white/40 hover:bg-white/10"
        >
          {paused ? <PlayIcon aria-hidden="true" className="size-4" /> : <PauseIcon aria-hidden="true" className="size-4" />}
          {paused ? 'Resume the rotating text' : 'Pause the rotating text'}
        </button>
      )}
    </div>
  );
}
