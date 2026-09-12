'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { RatingStars } from './rating-stars';
import type { PublicTestimonial } from '@/lib/api';

/** Gap between cards, matching the `gap-6` on the strip. */
const GAP_PX = 24;

/**
 * The testimonials as a slider: two cards at a time on a desktop, one on a
 * phone, moving **one card** per press rather than a whole screen — the
 * second card of a pair becomes the first of the next, so nothing is skipped
 * past.
 *
 * It is a scrolling list first and a carousel second. The cards sit in an
 * ordinary horizontally scrolling `<ul>` with scroll snapping, so a swipe, a
 * trackpad, the arrow keys on the focused strip and a screen reader all work
 * with no script at all; the controls only move that scroll. Nothing advances
 * on its own — a quote that slides away mid-sentence is the motion WCAG 2.2.2
 * exists to stop.
 */
export function TestimonialCarousel({ testimonials }: { testimonials: PublicTestimonial[] }) {
  const strip = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);

  // How many fit depends on the width, so it is measured rather than assumed.
  useEffect(() => {
    const element = strip.current;
    if (!element) return;
    const measure = () => {
      const card = element.firstElementChild as HTMLElement | null;
      if (!card) return;
      const step = card.offsetWidth + GAP_PX;
      setPerView(Math.max(1, Math.round((element.clientWidth + GAP_PX) / step)));
      setIndex(Math.round(element.scrollLeft / step));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', measure);
    };
  }, [testimonials.length]);

  /** The furthest left-hand card that still fills the strip. */
  const lastIndex = Math.max(0, testimonials.length - perView);

  const go = (next: number) => {
    const element = strip.current;
    const card = element?.firstElementChild as HTMLElement | null;
    if (!element || !card) return;
    const target = Math.min(lastIndex, Math.max(0, next));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: target * (card.offsetWidth + GAP_PX), behavior: reduced ? 'auto' : 'smooth' });
  };

  const control =
    'inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-border bg-white text-navy-900 shadow-sm transition-colors hover:border-sky-400 hover:text-link disabled:cursor-default disabled:opacity-35';

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 sm:gap-4">
        {testimonials.length > 1 && (
          <button type="button" className={`${control} hidden sm:inline-flex`} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous testimonial">
            <ChevronLeftIcon aria-hidden="true" className="size-5" />
          </button>
        )}

        <ul
          ref={strip}
          tabIndex={0}
          aria-label="What people say about Melbourne Sphere"
          className="ms-gallery-strip flex flex-1 snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-link motion-reduce:scroll-auto"
        >
          {testimonials.map((testimonial) => (
            <li key={testimonial.id} className="w-full shrink-0 snap-start lg:w-[calc(50%-0.75rem)]">
              <figure className="flex h-full items-center gap-5 rounded-card-lg border border-border bg-white p-6 sm:gap-7 sm:p-8">
                {testimonial.image && (
                  <div className="relative shrink-0 self-start">
                    <Image
                      src={testimonial.image.url}
                      alt=""
                      width={176}
                      height={176}
                      className="size-24 rounded-full object-cover sm:size-32 lg:size-36"
                    />
                    {/* The quotation mark sits on the corner of the portrait, as
                        in the reference. Decorative: the blockquote below
                        already says this is a quotation. */}
                    <span aria-hidden="true" className="absolute -right-1 top-2 font-display text-5xl leading-none text-sky-400 sm:-right-2">
                      &rdquo;
                    </span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <blockquote className="text-[1.0625rem] leading-relaxed text-text">{testimonial.quote}</blockquote>
                  {/* Only where the person actually gave a rating. */}
                  {testimonial.rating !== null && (
                    <div className="mt-4">
                      <RatingStars value={testimonial.rating} size="md" />
                      <span className="sr-only">{testimonial.rating} out of 5</span>
                    </div>
                  )}
                  <figcaption className="mt-3 flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-bold text-navy-900">{testimonial.displayName}</span>
                    {(testimonial.relationship || testimonial.business) && <span aria-hidden="true" className="text-border-strong">&middot;</span>}
                    {testimonial.relationship && <span className="italic text-text-muted">{testimonial.relationship}</span>}
                    {testimonial.business && (
                      <Link href={`/business/${testimonial.business.slug}`} className="italic text-link underline-offset-4 hover:underline">
                        {testimonial.business.name}
                      </Link>
                    )}
                  </figcaption>
                </div>
              </figure>
            </li>
          ))}
        </ul>

        {testimonials.length > 1 && (
          <button type="button" className={`${control} hidden sm:inline-flex`} onClick={() => go(index + 1)} disabled={index >= lastIndex} aria-label="Next testimonial">
            <ChevronRightIcon aria-hidden="true" className="size-5" />
          </button>
        )}
      </div>

      {lastIndex > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center">
          {Array.from({ length: lastIndex + 1 }, (_, position) => (
            <button
              key={position}
              type="button"
              onClick={() => go(position)}
              // A 44 px target with a small dot inside it (SRS NFR 011).
              className="inline-flex size-11 items-center justify-center"
              aria-label={`Show testimonial ${position + 1} of ${lastIndex + 1}`}
              aria-current={position === index ? 'true' : undefined}
            >
              <span aria-hidden="true" className={`rounded-full transition-all ${position === index ? 'size-3 bg-sky-500' : 'size-2.5 bg-border-strong'}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
