import type { Metadata } from 'next';
import { ClockIcon, Link2Icon, ListChecksIcon, LockKeyholeIcon, MailIcon, MapPinIcon, MessageSquareTextIcon, PenLineIcon, PhoneIcon, RefreshCwIcon, ShieldCheckIcon, StoreIcon } from 'lucide-react';
import { ContactForm } from '@/components/contact-form';
import { InformationHero } from '@/components/information-page';
import { AsideCard, ContentSection, IconPoints, IconTile, LinkList, ProductPageLayout, type IconPoint } from '@/components/product-page';
import { fetchFaqs, fetchSiteSettings, privacyNoticeHref } from '@/lib/api';
import { routeMetadata } from '@/lib/route-seo';
import { contactChannelFrom, turnstileSiteKey } from '@/lib/site';

export const dynamic = 'force-dynamic';

/**
 * `/contact` is a product route, not an editable document (SRS UX 003, and CFG
 * 002 as amended in SRS 1.6). It describes how the product actually works and
 * routes messages to the address configured in the site settings, so an editor
 * cannot redirect enquiries by typing a different address into page copy. The
 * contact details themselves come from settings and change without a release.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { name } = await fetchSiteSettings();
  return routeMetadata('contact', {
    title: `Contact ${name}`,
    description: `Contact ${name} for business listing requests, corrections, editorial enquiries and other questions.`,
    alternates: { canonical: '/contact' },
  });
}

/** What a message can be about. Each is a route that exists today; none promises self-service publication. */
const HELP_TOPICS: IconPoint[] = [
  { icon: StoreIcon, title: 'Add or update a business', text: 'Name, address, contact details and what it does.' },
  { icon: PenLineIcon, title: 'Correct a listing', text: 'Which listing, and what needs changing.' },
  { icon: ShieldCheckIcon, title: 'Report a review or comment', text: 'Use its report button where you can.' },
  { icon: MessageSquareTextIcon, title: 'General enquiry', text: 'Anything else about the site or our articles.' },
];

const GOOD_TO_KNOW: IconPoint[] = [
  { icon: ClockIcon, title: 'Read during Melbourne business hours' },
  { icon: ListChecksIcon, title: 'New listings take a few days to check' },
  { icon: RefreshCwIcon, title: 'Corrections are prioritised' },
  { icon: Link2Icon, title: 'Include the page name or link' },
  { icon: LockKeyholeIcon, title: 'Never send passwords or payment details' },
];

const linkClass = 'break-words text-link underline-offset-4 hover:underline [overflow-wrap:anywhere]';

export default async function ContactPage() {
  const [settings, faqs, privacyHref] = await Promise.all([fetchSiteSettings(), fetchFaqs(), privacyNoticeHref()]);
  // One source for the address: the site-wide support address (SRS CFG 001).
  const { email } = contactChannelFrom(settings);
  const { phone, address } = settings.contact;

  // Only routes that answer today: FAQs and the privacy policy are linked once
  // they are published, on the same rule as the footer.
  const links = [
    { href: '/business', label: 'Browse businesses' },
    { href: '/about', label: `About ${settings.name}` },
    ...(faqs.length > 0 ? [{ href: '/faqs', label: 'Frequently asked questions' }] : []),
    ...(privacyHref ? [{ href: privacyHref, label: 'How we handle your information' }] : []),
  ];

  return (
    <article>
      <InformationHero
        title={`Contact ${settings.name}`}
        eyebrow="Get in touch"
        intro={`Questions about a listing, a correction or ${settings.name} itself? Our editorial team is here to help.`}
        className="ms-editorial-band"
      />

      <ProductPageLayout
        lead={
          <section aria-labelledby="contact-details-heading" className="flex flex-col gap-6">
            <div>
              <h2 id="contact-details-heading" className="font-display text-2xl tracking-tight sm:text-3xl">
                How to reach us
              </h2>
              <p className="mt-2 max-w-2xl leading-relaxed text-text-muted">No account needed — every request is read and checked by an editor.</p>
            </div>
            <ul className="flex flex-col divide-y divide-border rounded-card-lg border border-border bg-surface-raised shadow-sm">
              <li className="flex items-center gap-4 p-5">
                <IconTile icon={MailIcon} />
                <div className="min-w-0">
                  <p className="text-sm text-text-muted">Email</p>
                  {email ? (
                    <a href={`mailto:${email}`} className={`text-base font-semibold ${linkClass}`}>
                      {email}
                    </a>
                  ) : (
                    <p className="text-sm">Use the form while our published address is being finalised.</p>
                  )}
                </div>
              </li>
              {phone && (
                <li className="flex items-center gap-4 p-5">
                  <IconTile icon={PhoneIcon} />
                  <div className="min-w-0">
                    <p className="text-sm text-text-muted">Phone</p>
                    <a href={phone.telHref} className={`text-base font-semibold ${linkClass}`}>
                      {phone.display}
                    </a>
                  </div>
                </li>
              )}
              <li className="flex items-center gap-4 p-5">
                <IconTile icon={MapPinIcon} />
                <div className="min-w-0">
                  <p className="text-sm text-text-muted">Coverage</p>
                  {address ? (
                    <address className="whitespace-pre-line break-words text-base font-semibold not-italic">{address}</address>
                  ) : (
                    <p className="text-base font-semibold">Melbourne, Victoria only</p>
                  )}
                </div>
              </li>
            </ul>
          </section>
        }
        aside={
          <AsideCard anchorId="contact-form" id="contact-form-heading" icon={MailIcon} title="Send us a message" description="Tell us what you need and an editor will reply by email.">
            <ContactForm turnstileSiteKey={turnstileSiteKey()} privacyHref={privacyHref} />
          </AsideCard>
        }
      >
        <ContentSection id="help-heading" title="What can we help with?" intro="Pick the closest topic in the form.">
          <IconPoints items={HELP_TOPICS} />
        </ContentSection>
        <ContentSection id="good-to-know-heading" title="Good to know">
          <IconPoints items={GOOD_TO_KNOW} />
        </ContentSection>
        <LinkList id="useful-links-heading" title="Useful links" links={links} />
      </ProductPageLayout>
    </article>
  );
}
