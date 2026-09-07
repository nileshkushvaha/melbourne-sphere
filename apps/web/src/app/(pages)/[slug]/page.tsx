import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InformationPage } from '@/components/information-page';
import { fetchStaticPage } from '@/lib/api';

/**
 * Only these slugs are pages; anything else is a genuine 404 (SRS CFG 002).
 * `contact` is absent because it has its own route (`app/contact`), which
 * renders the published page when there is one and explains how to reach the
 * editors when there is not.
 */
const SLUGS = ['about', 'privacy', 'terms', 'review-guidelines'];

export async function generateMetadata({ params }: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  if (!SLUGS.includes(slug)) return { title: 'Page not found', robots: { index: false } };
  const page = await fetchStaticPage(slug);
  if (!page) return { title: 'Page not found', robots: { index: false } };
  return {
    title: page.seoTitle ?? page.title,
    description: page.seoDescription ?? undefined,
    alternates: { canonical: `/${page.slug}` },
  };
}

/** Information page (SRS CFG 002): sanitised rich content, published only. */
export default async function StaticPage({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params;
  if (!SLUGS.includes(slug)) notFound();
  const page = await fetchStaticPage(slug);
  if (!page) notFound();
  return (
    <InformationPage
      title={page.title}
      updatedAt={page.updatedAt}
      aside={
        page.contactEmail ? (
          <div className="rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm">
            <h2 className="text-base font-semibold tracking-tight">Questions about this page?</h2>
            <a href={`mailto:${page.contactEmail}`} className="mt-3 inline-flex min-h-11 items-center text-link underline-offset-4 hover:underline">
              {page.contactEmail}
            </a>
          </div>
        ) : undefined
      }
    >
      {/* Sanitised by the API with an allowlist before storage (SRS SEC 001). */}
      <div dangerouslySetInnerHTML={{ __html: page.body }} />
    </InformationPage>
  );
}
