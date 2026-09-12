import type { Metadata } from 'next';
import { staticPageMetadata } from '@/lib/route-seo';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { InformationPage } from '@/components/information-page';
import { fetchStaticPage } from '@/lib/api';

/**
 * Every information page that shares the reading template (SRS CFG 002 as
 * amended in 1.6 and 1.7): the three policies, and any page an administrator
 * has created. Which addresses exist is the API's answer, not a list here — a
 * list would have to be edited every time an editor added a page, and would be
 * wrong until it was.
 *
 * An address nobody has published is a genuine 404. `/about` has its own
 * template and route, and `/contact` is a product route driven by the site
 * settings; both are refused as page addresses by the API, so a created page
 * can never shadow them.
 */
export async function generateMetadata({ params }: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = await fetchStaticPage(slug);
  if (!page) return { title: 'Page not found', robots: { index: false } };
  return staticPageMetadata(page);
}

/** Information page (SRS CFG 002): sanitised rich content, published only. */
export default async function StaticPage({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params;
  const page = await fetchStaticPage(slug);
  if (!page) notFound();
  return (
    <InformationPage
      title={page.title}
      updatedAt={page.updatedAt}
      aside={
        // One route for questions, so a policy page never carries a second
        // address that could drift from the configured one (SRS CFG 001).
        <div className="rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm">
          <h2 className="text-base font-semibold tracking-tight">Questions about this page?</h2>
          <p className="mt-3 text-sm leading-relaxed text-text-muted">The editors answer questions about our policies, and can correct anything on the site that is wrong.</p>
          <Link href="/contact" className="mt-3 inline-flex min-h-11 items-center text-link underline-offset-4 hover:underline">
            Contact the editors
          </Link>
        </div>
      }
    >
      {/* Sanitised by the API with an allowlist before storage (SRS SEC 001). */}
      <div dangerouslySetInnerHTML={{ __html: page.body }} />
    </InformationPage>
  );
}
