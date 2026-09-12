import { describe, expect, it } from 'vitest';
import { MEDIA_SETTING_REFERENCES, MEDIA_USAGE_RELATIONS, unusedMediaRelations } from './media-usage.js';

describe('media usage', () => {
  it('counts every place an image can appear, not only listings, articles and authors', () => {
    // A share image is a use in its own right: an article can share one picture
    // and show another, so dropping the cover must not make the share image
    // look unused and collectable.
    expect(MEDIA_USAGE_RELATIONS).toEqual(
      expect.arrayContaining(['businesses', 'coverOf', 'shareImageOf', 'pageShareImageOf', 'authorOf', 'testimonials', 'partners', 'categoryImageOf', 'categoryShareImageOf', 'areaImageOf', 'areaShareImageOf']),
    );
    expect(unusedMediaRelations()).toEqual({
      businesses: { none: {} },
      coverOf: { none: {} },
      shareImageOf: { none: {} },
      pageShareImageOf: { none: {} },
      authorOf: { none: {} },
      testimonials: { none: {} },
      partners: { none: {} },
      categoryImageOf: { none: {} },
      categoryShareImageOf: { none: {} },
      areaImageOf: { none: {} },
      areaShareImageOf: { none: {} },
    });
  });

  it('finds the branding images and hero slides stored inside settings', () => {
    const general = MEDIA_SETTING_REFERENCES.find((ref) => ref.key === 'general')!;
    const home = MEDIA_SETTING_REFERENCES.find((ref) => ref.key === 'home')!;
    expect(general.mediaIds({ logoMediaId: 'm1', faviconMediaId: null, shareImageMediaId: ' m3 ' })).toEqual(['m1', 'm3']);
    expect(home.mediaIds({ heroSlides: [{ mediaId: 'h1' }, { mediaId: '' }, { caption: 'no image' }] })).toEqual(['h1']);
  });

  it('reads nothing, rather than throwing, from a document of an unexpected shape', () => {
    for (const ref of MEDIA_SETTING_REFERENCES) {
      expect(ref.mediaIds(null)).toEqual([]);
      expect(ref.mediaIds('text')).toEqual([]);
      expect(ref.mediaIds({ heroSlides: 'not a list' })).toEqual([]);
    }
  });
});
