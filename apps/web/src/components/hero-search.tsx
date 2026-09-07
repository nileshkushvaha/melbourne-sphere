'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPinIcon, SearchIcon } from 'lucide-react';
import { MIN_SUGGESTION_LENGTH, SUGGESTION_DEBOUNCE_MS, flattenSuggestions, moveActiveIndex, suggestionHref, type FlatSuggestion, type SuggestionGroups } from '@/lib/suggestions';

interface CategoryOption {
  slug: string;
  label: string;
}

/**
 * Hero search panel (SRS HERO 004–006). It is a real GET form to /directory, so
 * it works without client JavaScript; suggestions are progressive enhancement
 * that fail silently. The location is fixed text, never an input, and no client
 * city parameter is ever sent.
 */
export function HeroSearch({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ term: string; groups: SuggestionGroups } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const requestSeq = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const term = query.trim();
  // Only suggestions fetched for the current term are shown, so a shrinking
  // query never displays stale options while the next request is in flight.
  const options: FlatSuggestion[] = term.length >= MIN_SUGGESTION_LENGTH && result?.term === term ? flattenSuggestions(result.groups) : [];

  useEffect(() => {
    if (term.length < MIN_SUGGESTION_LENGTH) return;
    const seq = ++requestSeq.current;
    const controller = new AbortController();
    const handle = setTimeout(async () => {
      try {
        const response = await fetch(`/api/v1/search/suggestions?q=${encodeURIComponent(term)}`, { signal: controller.signal, headers: { accept: 'application/json' } });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { data: SuggestionGroups };
        if (seq !== requestSeq.current) return; // stale response (SRS HERO 005)
        setResult({ term, groups: body.data });
        setOpen(true);
      } catch {
        // Suggestions are progressive: the form still submits without them.
      }
    }, SUGGESTION_DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [term]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const choose = (option: FlatSuggestion) => {
    setOpen(false);
    router.push(suggestionHref(option));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (options.length === 0) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActive((current) => moveActiveIndex(current, event.key === 'ArrowDown' ? 1 : -1, options.length));
      return;
    }
    // Enter submits the form unless an option is explicitly active (never on focus alone, SRS HERO 006).
    if (event.key === 'Enter' && open && active >= 0) {
      event.preventDefault();
      choose(options[active]!);
    }
  };

  return (
    <form
      action="/directory"
      method="get"
      role="search"
      aria-label="Search Melbourne businesses"
      className="mt-8 w-full max-w-4xl rounded-card-lg bg-panel p-2 text-panel-text shadow-lg"
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {/* Location is fixed text, never an input: the city is not client supplied (SRS HERO 004). */}
        <p className="flex min-h-14 shrink-0 flex-col justify-center rounded-card bg-panel-muted px-4 py-2 lg:rounded-none lg:rounded-l-card lg:pr-6">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-panel-text-muted">Location</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold">
            <MapPinIcon aria-hidden="true" className="size-4 text-sky-700" />
            Melbourne, Australia
          </span>
        </p>

        <div ref={boxRef} className="relative min-w-0 flex-1 lg:border-l lg:border-panel-border">
          <div className="flex min-h-14 flex-col justify-center px-4 py-2">
            <label htmlFor={inputId} className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-panel-text-muted">
              What are you looking for?
            </label>
            <input
              id={inputId}
              name="q"
              type="search"
              maxLength={120}
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              onFocus={() => options.length > 0 && setOpen(true)}
              placeholder="Business, category or service"
              role="combobox"
              aria-expanded={open && options.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              className="mt-0.5 w-full border-0 bg-transparent p-0 text-base text-panel-text outline-none placeholder:text-panel-text-muted"
            />
          </div>
          {open && options.length > 0 && (
            <ul id={listId} role="listbox" aria-label="Suggestions" className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-card border border-panel-border bg-panel py-1 shadow-lg">
              {options.map((option, i) => (
                <li key={`${option.kind}-${option.slug}`}>
                  {(i === 0 || options[i - 1]!.groupLabel !== option.groupLabel) && (
                    <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-panel-text-muted">{option.groupLabel}</p>
                  )}
                  <button
                    type="button"
                    id={`${listId}-${option.index}`}
                    role="option"
                    aria-selected={active === option.index}
                    onMouseEnter={() => setActive(option.index)}
                    onClick={() => choose(option)}
                    className={`flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm text-panel-text ${active === option.index ? 'bg-panel-muted' : ''}`}
                  >
                    <span>{option.label}</span>
                    {option.hint && <span className="text-xs text-panel-text-muted">{option.hint}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex min-h-14 flex-col justify-center px-4 py-2 lg:w-60 lg:border-l lg:border-panel-border">
          <label htmlFor={`${inputId}-category`} className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-panel-text-muted">
            Category (optional)
          </label>
          <select
            id={`${inputId}-category`}
            name="category"
            defaultValue=""
            className="mt-0.5 w-full truncate border-0 bg-transparent p-0 text-base text-panel-text outline-none"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-card bg-sky-700 px-7 text-base font-semibold text-white transition-colors hover:bg-navy-800 lg:rounded-card-lg"
        >
          <SearchIcon aria-hidden="true" className="size-5" />
          Search
        </button>
      </div>
    </form>
  );
}
