import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// Ant Design renders are slow in jsdom and the suite runs files in parallel, so
// the 1 s default for findBy* queries produces load-dependent flakes. Failing
// assertions still fail; they just get a realistic window to settle.
configure({ asyncUtilTimeout: 2_500 });

/**
 * jsdom lacks a few browser APIs that Ant Design's responsive helpers use.
 * `matchMedia` is controllable per test via `setViewport`.
 */
type MediaState = { desktop: boolean; reducedMotion: boolean };
const media: MediaState = { desktop: true, reducedMotion: false };
const listeners = new Set<(e: MediaQueryListEvent) => void>();

function evaluate(query: string): boolean {
  if (query.includes('prefers-reduced-motion')) return media.reducedMotion;
  // antd Grid breakpoints: lg = (min-width: 992px)
  const min = /min-width:\s*(\d+)px/.exec(query);
  if (min) return media.desktop ? true : Number(min[1]) < 768;
  const max = /max-width:\s*(\d+)px/.exec(query);
  if (max) return !media.desktop;
  return false;
}

window.matchMedia = (query: string): MediaQueryList => {
  const mql = {
    media: query,
    get matches() {
      return evaluate(query);
    },
    onchange: null,
    addListener: (cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeListener: (cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    addEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_type: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatchEvent: () => true,
  };
  return mql as unknown as MediaQueryList;
};

export function setViewport(state: Partial<MediaState>): void {
  Object.assign(media, state);
  for (const cb of listeners) cb({ matches: true, media: '' } as MediaQueryListEvent);
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// antd uses getComputedStyle for some measurements; jsdom supports it. Silence scrollTo.
window.scrollTo ??= () => undefined;

afterEach(() => {
  setViewport({ desktop: true, reducedMotion: false });
});
