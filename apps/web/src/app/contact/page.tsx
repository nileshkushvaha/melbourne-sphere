import type { Metadata } from 'next';
import Link from 'next/link';
import { MailIcon, PenLineIcon, PhoneIcon, ShieldCheckIcon, StoreIcon } from 'lucide-react';
import { InformationPage } from '@/components/information-page';
import { fetchSiteSettings } from '@/lib/api';
import { contactChannelFrom, turnstileSiteKey } from '@/lib/site';
import { ContactForm } from '@/components/contact-form';

export const dynamic = 'force-dynamic';

/**
 * `/contact` is a product route, not an editable document (SRS UX 003, and CFG
 * 002 as amended in SRS 1.6). It describes how the product actually works and
 * routes messages to the address configured in the site settings, so an editor
 * cannot redirect enquiries by typing a different address into page copy. The
 * contact details themselves come from settings and change without a release.
 */
export function generateMetadata(): Metadata {
  return {
    title: 'Contact us',
    description: 'How to reach the Melbourne Sphere editors about a listing, a correction or a review.',
    alternates: { canonical: '/contact' },
  };
}

const ROUTES = [
  {
    icon: StoreIcon,
    title: 'Add or update a business',
    body: 'There are no business accounts on Melbourne Sphere. Send us the name, address, contact details and what the business does, and an editor checks it against the Melbourne boundary before publishing. There is no charge.',
  },
  {
    icon: PenLineIcon,
    title: 'Correct a listing',
    body: 'Tell us which listing and what is wrong — hours, phone number, website or address. Every listing page also has a correction link beside its opening hours.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Report a review or comment',
    body: 'Each published review and comment carries a report action. Reports go to the moderation queue and are read by an editor; nothing is removed automatically.',
  },
];

export default async function ContactPage() {
  const settings = await fetchSiteSettings();
  // One source for the address: the site-wide support address (SRS CFG 001).
  const channel = contactChannelFrom(settings);
  const email = channel.email;
  const phone = settings.contact.phone;

  const aside = (
    <div className="rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm">
      <h2 className="text-base font-semibold tracking-tight">Email the editors</h2>
      {email ? (
        <>
          <a href={`mailto:${email}`} className="mt-3 inline-flex min-h-11 items-center gap-2 text-link underline-offset-4 hover:underline">
            <MailIcon aria-hidden="true" className="size-4 shrink-0" />
            {email}
          </a>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">One mailbox for listings, corrections and editorial questions. We read everything; we reply to what needs a reply.</p>
          {phone && (
            <p className="mt-3 text-sm">
              <a href={phone.telHref} className="inline-flex min-h-11 items-center gap-2 text-link underline-offset-4 hover:underline">
                <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
                {phone.display}
              </a>
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Our published contact address is being finalised and will appear here once it is confirmed. Until then, please use the report and correction actions on the listing, review or article itself.
        </p>
      )}
      <hr className="my-6 border-border" />
      <h2 className="text-base font-semibold tracking-tight">Where else to look</h2>
      <ul className="mt-3 flex flex-col gap-1.5 text-sm">
        <li>
          <Link href="/business" className="inline-flex min-h-9 items-center text-link underline-offset-4 hover:underline">
            Browse businesses
          </Link>
        </li>
        <li>
          <Link href="/blog" className="inline-flex min-h-9 items-center text-link underline-offset-4 hover:underline">
            Read the blog
          </Link>
        </li>
      </ul>
      {settings.contact.address && <address className="mt-6 whitespace-pre-line text-sm not-italic leading-relaxed text-text-muted">{settings.contact.address}</address>}
      <p className="mt-6 text-sm leading-relaxed text-text-muted">{settings.name} covers Melbourne, Victoria, Australia only. We do not add businesses outside the city.</p>
    </div>
  );

  const form = (
    <section aria-labelledby="contact-form-heading" className="mt-10">
      <h2 id="contact-form-heading" className="font-display text-2xl">
        Send us a message
      </h2>
      <p className="mt-2 max-w-prose leading-relaxed text-text-muted">
        Messages go straight to the editors’ queue. We store your name, email address and message so we can reply — nothing else, and nothing is published.
      </p>
      <div className="mt-6">
        <ContactForm turnstileSiteKey={turnstileSiteKey()} />
      </div>
    </section>
  );

  return (
    <InformationPage
      title="Contact us"
      intro="Melbourne Sphere is run by a small editorial team. Here is what we handle, and how to reach us."
      aside={aside}
    >
      <p>
        Everything on this site is published by editors: businesses do not create accounts, and nothing goes live without being checked. That means most of what you might want to do here starts with a message to us.
      </p>
      {ROUTES.map((route) => (
        <section key={route.title}>
          <h2 className="flex items-center gap-2.5">
            <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-card bg-sky-50 text-sky-700">
              <route.icon className="size-4.5" strokeWidth={1.8} />
            </span>
            {route.title}
          </h2>
          <p>{route.body}</p>
        </section>
      ))}
      <h2>Response times</h2>
      <p>
        We are a small team and read messages during Melbourne business hours. Listing requests are checked before publication, so a new listing usually takes a few days rather than minutes. Corrections to a published listing are prioritised.
      </p>
      {form}
    </InformationPage>
  );
}
