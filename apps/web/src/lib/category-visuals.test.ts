import { categoryGradient, categoryVisual, initials } from './category-visuals';

/**
 * The listing grid falls back to these visuals whenever a business has no
 * photograph, which is most of the directory at launch. The mapping has to be
 * deterministic (the same listing must not change appearance between renders)
 * and it must never leave a card without a background.
 */
describe('categoryVisual', () => {
  it.each([
    ['cafes', 'food'],
    ['restaurants', 'food'],
    ['bars', 'drink'],
    ['shopping', 'shopping'],
    ['health-and-wellness', 'health'],
    ['home-services', 'home'],
    ['professional-services', 'professional'],
    ['hair-and-beauty', 'beauty'],
    ['auto-repair', 'auto'],
    ['tutoring-and-education', 'education'],
  ])('maps %s to the %s family', (slug, expected) => {
    expect(categoryVisual(slug)).toBe(expected);
  });

  it('falls back to the general family for an unknown category and is stable', () => {
    expect(categoryVisual('something-brand-new')).toBe('general');
    expect(categoryGradient('something-brand-new')).toBe(categoryGradient('something-brand-new'));
    expect(categoryGradient('something-brand-new')).toMatch(/^linear-gradient/);
  });

  it('is case-insensitive', () => {
    expect(categoryVisual('Cafes')).toBe('food');
  });
});

describe('initials', () => {
  it.each([
    ['Carlton Corner Bakery', 'CC'],
    ['Runtime Check Cafe', 'RC'],
    ['Kew', 'K'],
    ['  spaced   out  name ', 'SO'],
    ['—', '?'],
  ])('reduces %s to %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
