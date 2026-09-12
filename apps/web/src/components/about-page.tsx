import Image from 'next/image';
import { CheckIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLdScript } from '@/components/json-ld';
import { Band, SectionHeading } from '@/components/page-shell';
import { breadcrumbJsonLd } from '@/lib/structured-data';
import { pageSections } from '@/lib/headings';
import type { StaticPageContent } from '@/lib/api';

/**
 * The About page (SRS CFG 002 as amended in SRS 1.6).
 *
 * Every word, heading, list and photograph is the editor's, read from the page
 * they write in the admin — this file decides only how those pieces sit on the
 * screen. A section with a picture becomes a band with the picture beside the
 * words and the sides alternate down the page; a section written as a list of
 * points becomes the cards; the closing section becomes the dark band that ends
 * the page. Rename a heading, swap a photograph or add a section and the page
 * changes; nothing here has to be touched.
 *
 * That is the difference from the About page this replaced, which assembled a
 * fixed hero and four fixed sections around a couple of editable paragraphs.
 */
export function AboutPage({ page }: { page: StaticPageContent }) {
  const crumbs = [{ label: 'Home', href: '/' }, { label: page.title }];
  const { intro, sections } = pageSections(page.body);
  const hero = page.ogImage;
  // The last section closes the page; when it is the only one it stays in the
  // flow rather than becoming a closing band with nothing before it.
  const closing = sections.length > 1 ? sections.at(-1) : undefined;
  const body = closing ? sections.slice(0, -1) : sections;
  let picture = 0;

  return (
    <article>
      <JsonLdScript data={breadcrumbJsonLd(crumbs)} />

      <div className="ms-on-dark relative isolate overflow-hidden bg-band-deep text-band-text">
        {hero && (
          <>
            {/* The page's own picture, behind the title. Decorative here: the
                same photograph carries its description where it is the subject. */}
            <Image src={hero.url} alt="" aria-hidden="true" fill priority sizes="100vw" className="absolute inset-0 -z-10 object-cover opacity-35" />
            <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgba(7,20,38,.96)_18%,rgba(7,20,38,.72)_58%,rgba(7,20,38,.55))]" />
          </>
        )}
        <div className="ms-container py-16 sm:py-24">
          <Breadcrumbs items={crumbs} tone="dark" />
          <h1 className="font-display mt-7 max-w-3xl text-[clamp(2.5rem,5vw,4rem)] leading-[1.04] tracking-tight">{page.title}</h1>
          {intro && <div className="ms-prose ms-prose-intro mt-6 max-w-2xl text-lg leading-relaxed text-band-muted [&_a]:text-band-link" dangerouslySetInnerHTML={{ __html: intro }} />}
          {/* Attribution for the photograph behind the title, which is what the
              licences it is used under ask for. */}
          {hero && page.ogImageCredit && <p className="mt-10 text-xs text-band-muted/80">Photograph: {page.ogImageCredit}</p>}
        </div>
      </div>

      {body.map((section) => {
        if (section.cards.length > 0) {
          return (
            <Band key={section.id} tone="soft">
              <SectionHeading id={section.id} title={section.title} />
              {section.html && <div className="ms-prose mt-4 max-w-2xl" dangerouslySetInnerHTML={{ __html: section.html }} />}
              <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {section.cards.map((card) => (
                  <li key={card.title || card.body.slice(0, 40)} className="ms-card-lift flex h-full flex-col rounded-card-lg border border-border bg-surface p-7 shadow-sm">
                    <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                      <CheckIcon className="size-5" />
                    </span>
                    {card.title && <h3 className="mt-5 text-lg font-semibold tracking-tight">{card.title}</h3>}
                    <div className="ms-prose mt-2 text-[0.975rem] text-text-muted" dangerouslySetInnerHTML={{ __html: card.body }} />
                  </li>
                ))}
              </ul>
            </Band>
          );
        }
        if (section.image) {
          // Alternating sides, counted over the sections that actually have a
          // picture, so adding a picture to one of them keeps the rhythm.
          const flipped = picture++ % 2 === 1;
          return (
            <Band key={section.id} tone={flipped ? 'page' : 'plain'}>
              <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={flipped ? 'lg:order-2' : ''}>
                  <SectionHeading id={section.id} title={section.title} />
                  <div className="ms-prose mt-5" dangerouslySetInnerHTML={{ __html: section.html }} />
                </div>
                {/* The picture's own dimensions are not in the page body, so it
                    is sized by its frame rather than by attributes that would be
                    wrong the moment an editor swapped the photograph. */}
                <figure className={flipped ? 'lg:order-1' : ''}>
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card-lg border border-white/70 shadow-lg">
                    <Image src={section.image.src} alt={section.image.alt} fill sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
                  </div>
                  {section.image.credit && <figcaption className="mt-2 text-xs text-text-muted">{section.image.credit}</figcaption>}
                </figure>
              </div>
            </Band>
          );
        }
        return (
          <Band key={section.id} tone="plain">
            <SectionHeading id={section.id} title={section.title} />
            <div className="ms-prose mt-5 max-w-3xl" dangerouslySetInnerHTML={{ __html: section.html }} />
          </Band>
        );
      })}

      {closing && (
        <Band tone="dark">
          <div className="max-w-3xl">
            <SectionHeading id={closing.id} title={closing.title} tone="dark" />
            <div
              className="ms-prose mt-5 text-lg leading-relaxed text-band-muted [&_a]:text-band-link [&_strong]:text-white"
              dangerouslySetInnerHTML={{ __html: closing.html }}
            />
          </div>
        </Band>
      )}
    </article>
  );
}
