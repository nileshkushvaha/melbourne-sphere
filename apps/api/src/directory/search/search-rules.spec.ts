import { directionsUrl, effectiveSort, escapeLike, normaliseQuery, ratingAverage } from './search-rules.js';

describe('search rules', () => {
  it('normalises keywords and escapes LIKE wildcards', () => {
    expect(normaliseQuery('  Little   COLLINS ')).toBe('little collins');
    expect(normaliseQuery(undefined)).toBe('');
    expect(escapeLike('100%_free\\')).toBe('100\\%\\_free\\\\');
  });

  it('applies the DIR 004 default sort rules', () => {
    expect(effectiveSort(undefined, '')).toBe('name');
    expect(effectiveSort(undefined, 'cafe')).toBe('relevance');
    expect(effectiveSort('relevance', '')).toBe('name');
    expect(effectiveSort('rating', '')).toBe('rating');
  });

  it('rounds rating averages and returns null when unrated', () => {
    expect(ratingAverage(0, 0)).toBeNull();
    expect(ratingAverage(13, 3)).toBe(4.3);
  });

  it('builds directions from coordinates or the address text', () => {
    expect(directionsUrl({ line1: '1 Swanston St', suburb: 'Melbourne', postcode: '3000', latitude: -37.8136, longitude: 144.9631 })).toBe('https://www.google.com/maps/dir/?api=1&destination=-37.8136%2C144.9631');
    expect(directionsUrl({ line1: '1 Swanston St', suburb: 'Melbourne', postcode: '3000', latitude: null, longitude: null })).toContain('destination=1%20Swanston%20St%2C%20Melbourne%20VIC%203000%2C%20Australia');
  });
});
