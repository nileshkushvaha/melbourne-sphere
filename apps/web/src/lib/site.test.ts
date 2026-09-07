import { contactChannel } from './site';

/**
 * A development address such as `listings@melbournesphere.local` is not a
 * mailbox anyone can write to. Publishing one would put a dead contact route on
 * every page of the site, so the helper refuses non-routable domains.
 */
describe('contactChannel', () => {
  const original = process.env.SITE_CONTACT_EMAIL;
  afterEach(() => {
    process.env.SITE_CONTACT_EMAIL = original;
  });

  it('publishes a routable address with a ready-made listing subject', () => {
    process.env.SITE_CONTACT_EMAIL = 'listings@melbournesphere.com.au';
    const channel = contactChannel();
    expect(channel.available).toBe(true);
    expect(channel.email).toBe('listings@melbournesphere.com.au');
    expect(channel.listingMailto).toContain('mailto:listings@melbournesphere.com.au?subject=');
  });

  it.each(['listings@melbournesphere.local', 'a@b.test', 'a@b.invalid', 'a@example.internal', 'not-an-email', ''])('withholds %s', (value) => {
    process.env.SITE_CONTACT_EMAIL = value;
    expect(contactChannel()).toEqual({ available: false, email: null, listingMailto: null });
  });
});
