import { DEFAULT_GENERAL_SETTINGS, renderCopyright, validateGeneralSettings } from './general-settings.js';

const complete = {
  applicationName: 'Melbourne Sphere',
  shortName: 'Sphere',
  organisationName: 'Melbourne Sphere Pty Ltd',
  tagline: 'Find local businesses across Melbourne',
  metaDescription: 'An independent directory of Melbourne businesses.',
  supportEmail: 'Listings@MelbourneSphere.com.au',
  supportPhone: '03 9000 0000',
  websiteUrl: 'https://melbournesphere.com',
  address: 'Level 2, 100 Collins Street\nMelbourne VIC 3000',
  headerTopBarEnabled: true,
  social: { facebook: 'https://www.facebook.com/melbournesphere', x: 'https://x.com/melbournesphere', pinterest: 'https://www.pinterest.com/melbournesphere' },
  copyrightText: '© {year} {name}. All rights reserved.',
  footerText: 'An independent directory for Melbourne, Victoria.',
};

describe('validateGeneralSettings', () => {
  it('normalises a complete document', () => {
    const { errors, value } = validateGeneralSettings(complete);
    expect(errors).toEqual({});
    expect(value.applicationName).toBe('Melbourne Sphere');
    // Addresses are stored as typed (up to four lines); everything else is one line.
    expect(value.address).toBe('Level 2, 100 Collins Street\nMelbourne VIC 3000');
    // The email is the identity of a mailbox: case is folded so it never differs between saves.
    expect(value.supportEmail).toBe('listings@melbournesphere.com.au');
    // Phone numbers are stored ready to render and dial (SRS BUS 003 formats).
    expect(value.supportPhone).toEqual({ display: '03 9000 0000', telHref: 'tel:+61390000000' });
    expect(value.social.facebook).toBe('https://www.facebook.com/melbournesphere');
    expect(value.social.pinterest).toBe('https://www.pinterest.com/melbournesphere');
    expect(value.social.instagram).toBeNull();
    expect(Object.keys(value.social)).toEqual(['facebook', 'instagram', 'x', 'youtube', 'pinterest']);
  });

  it('requires an application name and treats every other field as optional', () => {
    const { errors, value } = validateGeneralSettings({ applicationName: 'MS' });
    expect(errors).toEqual({});
    expect(value.supportEmail).toBeNull();
    expect(value.headerTopBarEnabled).toBe(false);
    expect(validateGeneralSettings({}).errors.applicationName).toBeDefined();
    expect(validateGeneralSettings({ applicationName: 'x'.repeat(81) }).errors.applicationName).toBeDefined();
  });

  it('refuses a support address on a development domain', () => {
    // Publishing listings@melbournesphere.local would put a dead address on
    // every page; this is the mistake the setting exists to prevent.
    const { errors } = validateGeneralSettings({ ...complete, supportEmail: 'listings@melbournesphere.local' });
    expect(errors.supportEmail?.[0]).toMatch(/development machine/);
    expect(validateGeneralSettings({ ...complete, supportEmail: 'not-an-email' }).errors.supportEmail).toBeDefined();
  });

  it('accepts Australian phone formats and rejects anything else', () => {
    expect(validateGeneralSettings({ ...complete, supportPhone: '0400 000 000' }).value.supportPhone?.display).toBe('0400 000 000');
    expect(validateGeneralSettings({ ...complete, supportPhone: '1300 000 000' }).value.supportPhone?.telHref).toBe('tel:+611300000000');
    expect(validateGeneralSettings({ ...complete, supportPhone: '+1 415 555 0100' }).errors.supportPhone).toBeDefined();
  });

  it('keeps each social link on its own platform', () => {
    // A header link that leaves the platform is how a phishing URL reaches
    // every page of the site, so the host is checked, not just the shape.
    const { errors } = validateGeneralSettings({ ...complete, social: { facebook: 'https://evil.example/melbournesphere' } });
    expect(errors['social.facebook']?.[0]).toMatch(/facebook\.com/);
    expect(validateGeneralSettings({ ...complete, social: { x: 'https://twitter.com/melbournesphere' } }).errors).toEqual({});
    expect(validateGeneralSettings({ ...complete, social: { youtube: 'javascript:alert(1)' } }).errors['social.youtube']).toBeDefined();
  });

  it('rejects URLs that are not public http(s) addresses', () => {
    expect(validateGeneralSettings({ ...complete, websiteUrl: 'javascript:alert(1)' }).errors.websiteUrl).toBeDefined();
    expect(validateGeneralSettings({ ...complete, websiteUrl: 'https://user:pass@example.com' }).errors.websiteUrl).toBeDefined();
  });

  it('only allows the placeholders the copyright line understands', () => {
    expect(validateGeneralSettings({ ...complete, copyrightText: '© {year} {name}' }).errors).toEqual({});
    // A mistyped placeholder would be printed literally on every page.
    expect(validateGeneralSettings({ ...complete, copyrightText: '© {yr} {name}' }).errors.copyrightText?.[0]).toMatch(/\{yr\}/);
  });

  it('refuses to show an empty contact bar', () => {
    const { errors } = validateGeneralSettings({ applicationName: 'Melbourne Sphere', headerTopBarEnabled: true });
    expect(errors.headerTopBarEnabled).toBeDefined();
    // One social link is enough for the bar to have something to say.
    expect(validateGeneralSettings({ applicationName: 'Melbourne Sphere', headerTopBarEnabled: true, social: { instagram: 'https://instagram.com/ms' } }).errors).toEqual({});
  });

  it('re-reads its own stored document without losing the phone number', () => {
    // The document stores the normalised {display, telHref} pair; validation
    // runs again on every read, so it has to accept its own output.
    const stored = validateGeneralSettings(complete).value;
    const reread = validateGeneralSettings(stored);
    expect(reread.errors).toEqual({});
    expect(reread.value).toEqual(stored);
  });

  it('limits the address to four lines', () => {
    expect(validateGeneralSettings({ ...complete, address: 'a\nb\nc\nd\ne' }).errors.address).toBeDefined();
  });

  it('clears optional fields when they are submitted empty', () => {
    const { value } = validateGeneralSettings({ ...complete, shortName: '   ', websiteUrl: '', footerText: '' });
    expect(value.shortName).toBeNull();
    expect(value.websiteUrl).toBeNull();
    expect(value.footerText).toBeNull();
  });

  it('never trusts a non-object payload', () => {
    const { errors, value } = validateGeneralSettings('nonsense');
    expect(errors.applicationName).toBeDefined();
    expect(value.social).toEqual(DEFAULT_GENERAL_SETTINGS.social);
  });
});

describe('renderCopyright', () => {
  it('substitutes the year and the application name', () => {
    expect(renderCopyright('© {year} {name}. All rights reserved.', { year: 2026, name: 'Melbourne Sphere' })).toBe('© 2026 Melbourne Sphere. All rights reserved.');
  });

  it('falls back to the built-in line when no template is set', () => {
    expect(renderCopyright(null, { year: 2026, name: 'Melbourne Sphere' })).toBe('© 2026 Melbourne Sphere. All rights reserved.');
    expect(renderCopyright('   ', { year: 2026, name: 'Melbourne Sphere' })).toBe('© 2026 Melbourne Sphere. All rights reserved.');
  });

  it('repeats a placeholder wherever it appears', () => {
    expect(renderCopyright('{name} · © {year} {name}', { year: 2026, name: 'MS' })).toBe('MS · © 2026 MS');
  });
});
