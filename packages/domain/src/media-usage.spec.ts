import { describe, expect, it } from 'vitest';
import { MEDIA_SETTING_REFERENCES, MEDIA_USAGE_RELATIONS, unusedMediaRelations } from './media-usage.js';

describe('media usage', () => {
  it('counts testimonials and partners as uses, not only listings, articles and authors', () => {
    expect(MEDIA_USAGE_RELATIONS).toEqual(expect.arrayContaining(['businesses', 'coverOf', 'authorOf', 'testimonials', 'partners']));
    expect(unusedMediaRelations()).toEqual({
      businesses: { none: {} },
      coverOf: { none: {} },
      authorOf: { none: {} },
      testimonials: { none: {} },
      partners: { none: {} },
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
