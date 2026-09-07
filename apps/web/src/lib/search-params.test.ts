import { describe, expect, it } from 'vitest';
import { buildChips, isFiltered, pageHref, parseSearchParams, toQueryString } from './search-params';

describe('search params', () => {
  it('parses tolerant URL state and drops invalid values', () => {
    expect(parseSearchParams({ q: '  little   collins ', category: 'cafes', area: 'Bad Slug', minRating: '4', sort: 'rating', page: '3' })).toEqual({ q: 'little collins', category: 'cafes', area: null, minRating: 4, sort: 'rating', page: 3 });
    expect(parseSearchParams({ q: ['a', 'b'], minRating: '9', sort: 'nope', page: '0' })).toEqual({ q: 'a', category: null, area: null, minRating: null, sort: null, page: 1 });
    expect(parseSearchParams({ q: 'x'.repeat(200) }).q).toHaveLength(120);
  });

  it('serialises without defaults and round-trips', () => {
    const state = parseSearchParams({ q: 'cafe', area: 'carlton', page: '2' });
    expect(toQueryString(state)).toBe('?q=cafe&area=carlton&page=2');
    expect(toQueryString({ page: 1 })).toBe('');
    expect(parseSearchParams(Object.fromEntries(new URLSearchParams(toQueryString(state))))).toEqual(state);
  });

  it('builds removable chips that reset the page and resolve names', () => {
    const state = parseSearchParams({ q: 'cafe', category: 'cafes', minRating: '4', page: '3' });
    const chips = buildChips(state, '/directory', { categories: { cafes: 'Cafés' } });
    expect(chips.map((c) => [c.label, c.href])).toEqual([
      ['“cafe”', '/directory?category=cafes&minRating=4'],
      ['Cafés', '/directory?q=cafe&minRating=4'],
      ['4+ stars', '/directory?q=cafe&category=cafes'],
    ]);
    expect(isFiltered(state)).toBe(true);
    expect(isFiltered(parseSearchParams({ sort: 'name', page: '2' }))).toBe(false);
    expect(pageHref(state, '/directory', 4)).toBe('/directory?q=cafe&category=cafes&minRating=4&page=4');
  });
});
