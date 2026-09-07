import { isValidSlug, slugify } from './slug.js';

describe('slugify', () => {
  it.each([
    ['Cafés & Bars', 'cafes-and-bars'],
    ['  North   Melbourne ', 'north-melbourne'],
    ["Joe's Plumbing!", 'joe-s-plumbing'],
    ['Health & Wellness', 'health-and-wellness'],
    ['---', ''],
    ['Ünïcödé Straße', 'unicode-strasse'],
    ['Smørrebrød & Œufs', 'smorrebrod-and-oeufs'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('caps length without leaving a trailing hyphen', () => {
    const slug = slugify('a '.repeat(120));
    expect(slug.length).toBeLessThanOrEqual(100);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('isValidSlug', () => {
  it('accepts lowercase-hyphen slugs and rejects everything else', () => {
    expect(isValidSlug('melbourne-cbd')).toBe(true);
    expect(isValidSlug('cafes')).toBe(true);
    for (const bad of ['', 'Cafes', 'cafes-', '-cafes', 'ca--fes', 'ca fes', 'café', 'a'.repeat(101)]) expect(isValidSlug(bad)).toBe(false);
  });
});
