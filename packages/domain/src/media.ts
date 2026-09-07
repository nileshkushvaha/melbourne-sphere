/** Media rules shared by the API (validation) and the worker (processing). */

export const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME)[number];

/** SRS MED 001 limits. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_MEGAPIXELS = 40;
export const MAX_PIXELS = MAX_MEGAPIXELS * 1_000_000;
export const MIN_DIMENSION = 200;

export const VARIANT_SIZES = {
  thumbnail: 320,
  card: 800,
  hero: 1600,
} as const;
export type VariantKind = keyof typeof VARIANT_SIZES;
export const VARIANT_KINDS = Object.keys(VARIANT_SIZES) as VariantKind[];
/** Variants are always re-encoded to WebP, which drops EXIF with the original container. */
export const VARIANT_MIME = 'image/webp';

export function isAllowedImageMime(value: string): value is AllowedImageMime {
  return (ALLOWED_IMAGE_MIME as readonly string[]).includes(value);
}

export interface ImageFacts {
  /** MIME detected from the magic bytes, not from the client. */
  detectedMime: string | null;
  width: number | null;
  height: number | null;
  /** True for animated GIF/WebP/APNG, which MVP rejects (SRS MED 001). */
  animated: boolean;
  bytes: number;
}

/** Every reason an upload can be refused, in the order they are checked. */
export function imageRejectionReason(facts: ImageFacts, declaredMime: string): string | null {
  if (facts.bytes <= 0) return 'The uploaded file is empty';
  if (facts.bytes > MAX_UPLOAD_BYTES) return `Images must be ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB or smaller`;
  if (!facts.detectedMime) return 'The file is not a recognised image';
  if (!isAllowedImageMime(facts.detectedMime)) return 'Only JPEG, PNG and WebP images are accepted';
  // The browser-supplied type must agree with the bytes; a mismatch is a red flag, not a formality.
  if (facts.detectedMime !== declaredMime) return 'The file contents do not match the declared file type';
  if (facts.animated) return 'Animated images are not accepted';
  if (!facts.width || !facts.height) return 'The image could not be decoded';
  if (facts.width * facts.height > MAX_PIXELS) return `Images must be ${MAX_MEGAPIXELS} megapixels or smaller`;
  if (facts.width < MIN_DIMENSION || facts.height < MIN_DIMENSION) return `Images must be at least ${MIN_DIMENSION}px on each side`;
  return null;
}

/** Target size for a variant: never upscales, and keeps the aspect ratio (SRS MED 003). */
export function variantDimensions(kind: VariantKind, width: number, height: number): { width: number; height: number } {
  const target = VARIANT_SIZES[kind];
  if (width <= target) return { width, height };
  const scaled = Math.max(1, Math.round((height * target) / width));
  return { width: target, height: scaled };
}

/**
 * Random, server-generated object key (SRS MED 002): clients never choose a key,
 * so they cannot overwrite or guess another asset's object.
 */
export function objectKeyFor(prefix: 'quarantine' | 'media', assetId: string, suffix: string, random: string): string {
  // Letters and digits only: dots and slashes can never re-enter the key.
  const safeSuffix = suffix.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'bin';
  return `${prefix}/${assetId}/${random}.${safeSuffix}`;
}

export function extensionForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}
