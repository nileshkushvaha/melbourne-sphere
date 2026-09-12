import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * The query, filters, sort and page of a list screen, kept in the address bar.
 *
 * Every list screen had written this by hand — read a parameter, write it back,
 * remember to drop `page` so changing a filter does not land the reader on page
 * four of a shorter result. Ten copies of those four lines is ten chances to
 * forget the last one, and the screens that used local state instead could not
 * be linked to, bookmarked, or returned to with the browser's Back button.
 *
 * The filter keys are declared once, which is also what lets the screen know
 * whether anything is filtered at all — the difference between "nothing here
 * yet" and "nothing matches what you asked for".
 *
 * `E` names parameters that belong in the address bar but do not narrow the
 * result set — sort field and direction. They are readable and writable, but
 * "clear filters" leaves them alone and a sorted-but-unfiltered list is still
 * everything, so it gets the ordinary empty state.
 */
export function useListParams<K extends string, E extends string = never>(
  keys: readonly K[],
) {
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number(params.get('page') ?? '1') || 1);

  const get = useCallback((key: K | E) => params.get(key) ?? undefined, [params]);

  /** Writes one value; any change other than the page itself returns to page 1. */
  const set = useCallback(
    (key: K | E | 'page', value: string | undefined) => {
      const next = new URLSearchParams(params);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setPage = useCallback((next: number) => set('page', next > 1 ? String(next) : undefined), [set]);

  /** The filters currently in force, for chips and for "clear filters". */
  const active = useMemo(() => keys.filter((key) => Boolean(params.get(key))), [keys, params]);

  const clear = useCallback(() => {
    const next = new URLSearchParams(params);
    for (const key of keys) next.delete(key);
    next.delete('page');
    setParams(next, { replace: true });
  }, [keys, params, setParams]);

  return { page, get, set, setPage, active, filtered: active.length > 0, clear };
}
