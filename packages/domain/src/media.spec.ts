import { imageRejectionReason, objectKeyFor, variantDimensions, type ImageFacts } from './media.js';

const facts = (over: Partial<ImageFacts> = {}): ImageFacts => ({ detectedMime: 'image/jpeg', width: 1600, height: 1200, animated: false, bytes: 500_000, ...over });

describe('media validation (SRS MED 001)', () => {
  it('accepts a normal JPEG, PNG or WebP', () => {
    expect(imageRejectionReason(facts(), 'image/jpeg')).toBeNull();
    expect(imageRejectionReason(facts({ detectedMime: 'image/png' }), 'image/png')).toBeNull();
    expect(imageRejectionReason(facts({ detectedMime: 'image/webp' }), 'image/webp')).toBeNull();
  });

  it('rejects every disallowed shape with a specific reason', () => {
    expect(imageRejectionReason(facts({ bytes: 0 }), 'image/jpeg')).toMatch(/empty/);
    expect(imageRejectionReason(facts({ bytes: 11 * 1024 * 1024 }), 'image/jpeg')).toMatch(/10 MB/);
    expect(imageRejectionReason(facts({ detectedMime: null }), 'image/jpeg')).toMatch(/not a recognised image/);
    expect(imageRejectionReason(facts({ detectedMime: 'image/svg+xml' }), 'image/svg+xml')).toMatch(/JPEG, PNG and WebP/);
    expect(imageRejectionReason(facts({ detectedMime: 'application/x-msdownload' }), 'application/x-msdownload')).toMatch(/JPEG, PNG and WebP/);
    // A PNG renamed as a JPEG: the bytes win.
    expect(imageRejectionReason(facts({ detectedMime: 'image/png' }), 'image/jpeg')).toMatch(/do not match/);
    expect(imageRejectionReason(facts({ animated: true }), 'image/jpeg')).toMatch(/Animated/);
    expect(imageRejectionReason(facts({ width: null }), 'image/jpeg')).toMatch(/could not be decoded/);
    expect(imageRejectionReason(facts({ width: 9000, height: 9000 }), 'image/jpeg')).toMatch(/40 megapixels/);
    expect(imageRejectionReason(facts({ width: 100, height: 100 }), 'image/jpeg')).toMatch(/200px/);
  });
});

describe('variant sizing and keys (SRS MED 002–003)', () => {
  it('never upscales and keeps the aspect ratio', () => {
    expect(variantDimensions('card', 1600, 1200)).toEqual({ width: 800, height: 600 });
    expect(variantDimensions('hero', 1600, 1200)).toEqual({ width: 1600, height: 1200 });
    expect(variantDimensions('thumbnail', 1000, 250)).toEqual({ width: 320, height: 80 });
    expect(variantDimensions('hero', 400, 400)).toEqual({ width: 400, height: 400 });
  });

  it('builds random server-side keys and ignores client-supplied path characters', () => {
    expect(objectKeyFor('quarantine', 'asset1', 'jpg', 'abc123')).toBe('quarantine/asset1/abc123.jpg');
    expect(objectKeyFor('media', 'asset1', '../../etc/passwd', 'abc123')).toBe('media/asset1/abc123.etcpasswd');
    expect(objectKeyFor('media', 'asset1', '', 'abc123')).toBe('media/asset1/abc123.bin');
  });
});
