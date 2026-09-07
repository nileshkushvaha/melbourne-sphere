import type { Metadata } from 'next';
import { Geist, Instrument_Serif } from 'next/font/google';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import Script from 'next/script';
import { SITE_NAME, SITE_TAGLINE, siteOrigin, turnstileSiteKey } from '@/lib/site';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'], display: 'swap' });
/** Display face for the hero and section headings only — one weight, self-hosted by next/font, so the editorial voice costs one small file. */
const displaySerif = Instrument_Serif({ variable: '--font-display', subsets: ['latin'], weight: '400', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description: 'An independent directory of businesses across Melbourne, Victoria: cafes, trades, services and more, with opening hours and contact details.',
  openGraph: { siteName: SITE_NAME, locale: 'en_AU', type: 'website' },
  // Declared explicitly rather than through the app-directory file convention:
  // the generated icon module is pulled into every render, including error and
  // not-found responses, where it prevented the HTML from being produced.
  icons: { icon: '/favicon.ico' },
};

/**
 * Public shell: skip link, landmarks, header and footer (SRS UX 002, NFR 011).
 * `main` carries no width of its own — sections are full-bleed and bound their
 * own content with `.ms-container`, so the page can alternate light and dark
 * bands across the whole viewport instead of living in one narrow column.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-AU" className={`${geistSans.variable} ${displaySerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a className="ms-skip-link" href="#main-content">
          Skip to main content
        </a>
        <SiteHeader />
        <main id="main-content" className="w-full flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* Loaded only when a site key is configured; the widget renders itself into .cf-turnstile (SRS SEC 002). */}
        {turnstileSiteKey() && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />}
      </body>
    </html>
  );
}
