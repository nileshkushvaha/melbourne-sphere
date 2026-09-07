import { linkHostsFor, parseAustralianPhone, validatePublicUrl, validatePlatformUrl } from '../directory/business-rules.js';

/**
 * General site settings (SRS CFG 001): the application's own identity, branding
 * assets, header contact bar and footer wording. Like every settings document
 * it is validated server-side, versioned and audited; administrators edit
 * wording and references, never markup, secrets or the fixed Melbourne context
 * (SCP 001–005 — city, timezone and routes are owned by the platform).
 *
 * Everything except the application name is optional, and an empty value means
 * "not published" rather than a blank in the interface: the public site omits
 * the element entirely, so a half-filled configuration never shows an empty
 * contact bar or a dead link.
 */

export const GENERAL_SETTINGS_KEY = 'general';

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'youtube', 'pinterest'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** An empty profile set, built from the platform list so adding one cannot leave a stale literal behind. */
const emptySocial = (): Record<SocialPlatform, string | null> =>
  Object.fromEntries(SOCIAL_PLATFORMS.map((platform) => [platform, null])) as Record<SocialPlatform, string | null>;

export const LIMITS = {
  applicationName: { min: 2, max: 80 },
  shortName: 20,
  organisationName: 120,
  tagline: 120,
  metaDescription: 300,
  supportEmail: 254,
  supportPhone: 30,
  websiteUrl: 200,
  address: 300,
  socialUrl: 300,
  copyrightText: 200,
  footerText: 600,
  mediaId: 64,
} as const;

/**
 * Domains that only resolve on a developer machine. A support address on one of
 * these is a configuration mistake, not a contact route, and publishing it puts
 * a dead address on every page.
 */
const NON_ROUTABLE = /(\.local|\.localhost|\.test|\.invalid|\.example|\.internal)$/i;

/** Placeholders the copyright line understands; anything else is a typo the visitor would see. */
export const COPYRIGHT_PLACEHOLDERS = ['year', 'name'] as const;

export interface GeneralSettings {
  /** Public name of the application; used in the header, titles and the copyright line. */
  applicationName: string;
  /** Compact name for tight spaces (mobile header, share cards). */
  shortName: string | null;
  /** Legal or trading entity behind the site, when it differs from the application name. */
  organisationName: string | null;
  /** Short phrase after the name in the browser title. */
  tagline: string | null;
  /** Default meta description for pages that do not set their own (SRS SEO 001). */
  metaDescription: string | null;
  /** Published contact address; must be routable, so a development domain is refused. */
  supportEmail: string | null;
  /** Australian phone number, stored normalised with its display form and tel: href (BUS 003 formats). */
  supportPhone: { display: string; telHref: string } | null;
  /** The organisation's own site, when it is not this one. */
  websiteUrl: string | null;
  /** Postal or visiting address, free text over at most four lines. */
  address: string | null;
  /** Ready media assets used as the logo, the browser icon and the default share image. */
  logoMediaId: string | null;
  faviconMediaId: string | null;
  shareImageMediaId: string | null;
  /** Contact strip above the public navigation. */
  headerTopBarEnabled: boolean;
  /** One optional profile URL per platform, each on that platform's own domain. */
  social: Record<SocialPlatform, string | null>;
  /** Footer copyright template; supports {year} and {name}. Empty means the built-in line. */
  copyrightText: string | null;
  /** Short paragraph under the footer brand. */
  footerText: string | null;
}

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = Object.freeze({
  applicationName: 'Melbourne Sphere',
  shortName: null,
  organisationName: null,
  tagline: 'Find local businesses across Melbourne',
  metaDescription: 'An independent directory of businesses across Melbourne, Victoria: cafes, trades, services and more, with opening hours and contact details.',
  supportEmail: null,
  supportPhone: null,
  websiteUrl: null,
  address: null,
  logoMediaId: null,
  faviconMediaId: null,
  shareImageMediaId: null,
  headerTopBarEnabled: false,
  social: Object.freeze(emptySocial()) as Record<SocialPlatform, string | null>,
  copyrightText: null,
  footerText: null,
}) as GeneralSettings;

export type FieldErrors = Record<string, string[]>;

const text = (value: unknown): string => (typeof value === 'string' ? value.replace(/[ \t]+/g, ' ').trim() : '');
const singleLine = (value: unknown): string => text(value).replace(/\s*\n\s*/g, ' ').trim();

/**
 * Renders the copyright line. Shared by the API's public payload contract and
 * the public site, so the template behaves identically wherever it is shown.
 */
export function renderCopyright(template: string | null, context: { year: number; name: string }): string {
  const line = template && template.trim() !== '' ? template : '© {year} {name}. All rights reserved.';
  return line.replace(/\{(year|name)\}/g, (_match, key: string) => (key === 'year' ? String(context.year) : context.name));
}

/** Server-side validation (CFG 001); returns the normalised document and any field errors. */
export function validateGeneralSettings(input: unknown): { errors: FieldErrors; value: GeneralSettings } {
  const errors: FieldErrors = {};
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const value: GeneralSettings = {
    ...DEFAULT_GENERAL_SETTINGS,
    social: emptySocial(),
  };

  const applicationName = singleLine(raw.applicationName);
  if (applicationName.length < LIMITS.applicationName.min || applicationName.length > LIMITS.applicationName.max) {
    errors.applicationName = [`Application name must be ${LIMITS.applicationName.min}–${LIMITS.applicationName.max} characters`];
  }
  value.applicationName = applicationName;

  /** Optional single-line field: blank clears it, over-long is an error. */
  const optionalText = (key: keyof GeneralSettings, source: unknown, max: number, label: string): string | null => {
    const trimmed = singleLine(source);
    if (trimmed === '') return null;
    if (trimmed.length > max) {
      errors[key] = [`${label} must be ${max} characters or fewer`];
      return null;
    }
    return trimmed;
  };

  value.shortName = optionalText('shortName', raw.shortName, LIMITS.shortName, 'Short name');
  value.organisationName = optionalText('organisationName', raw.organisationName, LIMITS.organisationName, 'Organisation name');
  value.tagline = optionalText('tagline', raw.tagline, LIMITS.tagline, 'Tagline');
  value.metaDescription = optionalText('metaDescription', raw.metaDescription, LIMITS.metaDescription, 'Meta description');

  const email = singleLine(raw.supportEmail).toLowerCase();
  if (email !== '') {
    const domain = email.split('@')[1] ?? '';
    if (email.length > LIMITS.supportEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.supportEmail = ['Enter a valid email address'];
    else if (NON_ROUTABLE.test(domain)) errors.supportEmail = ['That domain only resolves on a development machine; use the address visitors can write to'];
    else value.supportEmail = email;
  }

  // Accepts what an editor types and what we stored last time: the document
  // keeps the normalised {display, telHref} pair, and re-reading it must not
  // silently drop the number.
  const phoneSource = typeof raw.supportPhone === 'object' && raw.supportPhone !== null ? (raw.supportPhone as { display?: unknown }).display : raw.supportPhone;
  const phone = singleLine(phoneSource);
  if (phone !== '') {
    if (phone.length > LIMITS.supportPhone) errors.supportPhone = [`Phone number must be ${LIMITS.supportPhone} characters or fewer`];
    else {
      const parsed = parseAustralianPhone(phone);
      if (!parsed) errors.supportPhone = ['Enter an Australian phone number, for example 03 9000 0000 or 0400 000 000'];
      else value.supportPhone = { display: parsed.display, telHref: parsed.telHref };
    }
  }

  const website = singleLine(raw.websiteUrl);
  if (website !== '') {
    const normalised = website.length > LIMITS.websiteUrl ? null : validatePublicUrl(website);
    if (!normalised) errors.websiteUrl = ['Enter a full http(s) URL without credentials'];
    else value.websiteUrl = normalised;
  }

  const address = typeof raw.address === 'string' ? raw.address.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() : '';
  if (address !== '') {
    if (address.length > LIMITS.address) errors.address = [`Address must be ${LIMITS.address} characters or fewer`];
    else if (address.split('\n').length > 4) errors.address = ['Use at most four lines'];
    else value.address = address;
  }

  for (const key of ['logoMediaId', 'faviconMediaId', 'shareImageMediaId'] as const) {
    const mediaId = singleLine(raw[key]);
    if (mediaId === '') continue;
    if (mediaId.length > LIMITS.mediaId) errors[key] = ['Choose an image from the media library'];
    else value[key] = mediaId;
  }

  const headerTopBarEnabled = raw.headerTopBarEnabled;
  if (headerTopBarEnabled !== undefined && typeof headerTopBarEnabled !== 'boolean') errors.headerTopBarEnabled = ['Choose whether the contact bar is shown'];
  value.headerTopBarEnabled = headerTopBarEnabled === true;

  const social = (typeof raw.social === 'object' && raw.social !== null ? raw.social : {}) as Record<string, unknown>;
  for (const platform of SOCIAL_PLATFORMS) {
    const url = singleLine(social[platform]);
    if (url === '') continue;
    const normalised = url.length > LIMITS.socialUrl ? null : validatePlatformUrl(platform, url);
    if (!normalised) errors[`social.${platform}`] = [`Enter a full https URL on ${linkHostsFor(platform).join(' or ')}`];
    else value.social[platform] = normalised;
  }

  const copyright = singleLine(raw.copyrightText);
  if (copyright !== '') {
    const unknown = [...copyright.matchAll(/\{([^}]*)\}/g)].map((match) => match[1]).filter((token) => !COPYRIGHT_PLACEHOLDERS.includes(token as (typeof COPYRIGHT_PLACEHOLDERS)[number]));
    if (copyright.length > LIMITS.copyrightText) errors.copyrightText = [`Copyright line must be ${LIMITS.copyrightText} characters or fewer`];
    // A mistyped placeholder would be printed literally on every page.
    else if (unknown.length > 0) errors.copyrightText = [`Unknown placeholder {${unknown[0]}}. Use {year} and {name} only.`];
    else value.copyrightText = copyright;
  }

  const footer = typeof raw.footerText === 'string' ? raw.footerText.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim() : '';
  if (footer !== '') {
    if (footer.length > LIMITS.footerText) errors.footerText = [`Footer text must be ${LIMITS.footerText} characters or fewer`];
    else value.footerText = footer;
  }

  // The header bar exists to show contact details; without one it would be an empty strip.
  if (value.headerTopBarEnabled && !value.supportEmail && !value.supportPhone && SOCIAL_PLATFORMS.every((platform) => value.social[platform] === null)) {
    errors.headerTopBarEnabled = ['Add a support email, phone number or social link before showing the contact bar'];
  }

  return { errors, value };
}
