import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InformationPage } from '@/components/information-page';
import { JsonLdScript } from '@/components/json-ld';
import { fetchFaqs } from '@/lib/api';
import { faqRichResultsEnabled } from '@/lib/site';
import { faqPageJsonLd } from '@/lib/structured-data';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description: 'Answers to common questions about listing a business, reviews and using Melbourne Sphere.',
  alternates: { canonical: '/faqs' },
};

/**
 * Published questions as a disclosure list (SRS 1.2 FAQ 004).
 *
 * `<details>`/`<summary>` rather than a scripted accordion: it is keyboard
 * operable, announced correctly and works with no JavaScript at all, which is
 * what NFR 011 asks for and what a scripted widget usually gets wrong. When
 * nothing is published the page is a 404 rather than an empty container — an
 * empty page would be indexed and would tell a visitor nothing.
 */
export default async function FaqsPage() {
  const faqs = await fetchFaqs();
  if (faqs.length === 0) notFound();

  const groups = new Map<string, typeof faqs>();
  for (const faq of faqs) {
    const key = faq.groupName ?? '';
    groups.set(key, [...(groups.get(key) ?? []), faq]);
  }

  return (
    <>
      {faqRichResultsEnabled() && <JsonLdScript data={faqPageJsonLd(faqs)} />}
      <InformationPage title="Frequently asked questions" intro="Answers to the questions we are asked most often.">
        {[...groups.entries()].map(([group, items]) => (
          <section key={group || 'general'} aria-labelledby={group ? `faq-group-${slugify(group)}` : undefined} className="mt-8 first:mt-0">
            {group && (
              <h2 id={`faq-group-${slugify(group)}`} className="font-display text-xl tracking-tight">
                {group}
              </h2>
            )}
            <ul className="mt-4 flex flex-col gap-3">
              {items.map((faq) => (
                <li key={faq.id}>
                  <details className="group rounded-card border border-border bg-surface-raised px-5 py-4 open:shadow-sm">
                    <summary className="cursor-pointer list-none text-base font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                      <span className="flex items-start justify-between gap-4">
                        {faq.question}
                        <span aria-hidden="true" className="mt-1 shrink-0 text-text-muted transition-transform group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>
                    {/* Sanitised server-side by the same allowlist as articles (SEC 001). */}
                    <div className="ms-prose mt-3" dangerouslySetInnerHTML={{ __html: faq.answerHtml }} />
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </InformationPage>
    </>
  );
}

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
