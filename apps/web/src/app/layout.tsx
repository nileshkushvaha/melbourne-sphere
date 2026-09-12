import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Manrope, Sora } from 'next/font/google';
import { SiteAnalytics } from '@/components/site-analytics';
import { SiteFooter } from '@/components/site-footer';
import { ServiceAlertBar } from '@/components/service-alert-bar';
import { SiteHeader } from '@/components/site-header';
import { RouteProgress } from '@/components/route-progress';
import Script from 'next/script';
import { siteOrigin, siteTitle, turnstileSiteKey } from '@/lib/site';
import { fetchSiteSettings } from '@/lib/api';
import './globals.css';

const bodyFont = Manrope({ variable: '--font-body', subsets: ['latin'], display: 'swap' });
/** Sora gives display copy a confident contemporary voice while remaining highly legible. */
const displayFont = Sora({ variable: '--font-display', subsets: ['latin'], display: 'swap' });

/**
 * Site-wide metadata from the general settings (SRS CFG 001, SEO 001): the
 * name, title template, default description, browser icon and default share
 * image are all editable, and each falls back to a shipped default so the
 * document is never missing them.
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSiteSettings();
  const { favicon, shareImage } = settings.branding;
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: siteTitle(settings), template: `%s · ${settings.shortName ?? settings.name}` },
    description: settings.metaDescription ?? undefined,
    openGraph: {
      siteName: settings.name,
      locale: 'en_AU',
      type: 'website',
      ...(shareImage ? { images: [{ url: shareImage.url, width: shareImage.width, height: shareImage.height, alt: shareImage.alt || settings.name }] } : {}),
    },
    // Declared explicitly rather than through the app-directory file convention:
    // the generated icon module is pulled into every render, including error and
    // not-found responses, where it prevented the HTML from being produced.
    icons: { icon: favicon ? favicon.url : '/favicon.ico' },
    // A verification tag proves ownership to Google; it loads nothing and sets
    // no cookie. The analytics identifiers beside it in the settings are
    // deliberately not rendered — see the note on the SEO settings screen.
    ...(settings.seo?.googleSiteVerification ? { verification: { google: settings.seo.googleSiteVerification } } : {}),
  };
}

/**
 * Public shell: skip link, landmarks, header and footer (SRS UX 002, NFR 011).
 * `main` carries no width of its own — sections are full-bleed and bound their
 * own content with `.ms-container`, so the page can alternate light and dark
 * bands across the whole viewport instead of living in one narrow column.
 */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en-AU" className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <a className="ms-skip-link" href="#main-content">
          Skip to main content
        </a>
        {/* Reads the current address, so it needs its own boundary; it adds an
            indicator to client navigations and never gates the page itself. */}
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        {/* Above the header on every public page (SRS 1.2 ALRT 002). Rendered
            in document order rather than inside a Suspense boundary: a streamed
            boundary is swapped in after the header, which puts the alert in the
            wrong place and shifts the page as it arrives (NFR 001). */}
        <ServiceAlertBar />
        <SiteHeader />
        <main id="main-content" className="w-full flex-1">
          {children}
        </main>
        <SiteFooter />
        {/* The cookie question and the analytics it governs. Placed last so it
            is the final thing in the tab order: a visitor who ignores it can
            use the whole site first. */}
        <Suspense fallback={null}>
          <SiteAnalytics />
        </Suspense>
        {/* Loaded only when a site key is configured; the widget renders itself into .cf-turnstile (SRS SEC 002). */}
        {turnstileSiteKey() && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />}
      </body>
    </html>
  );
}
