import { ArticleCollectionSkeleton } from '@/components/article-skeleton';

/**
 * Shown while the blog index is being rendered on the server. The heading band
 * is static text, so it is drawn for real and only the articles are placeholders
 * — a visitor navigating to the blog sees where they are immediately.
 */
export default function BlogIndexLoading() {
  return (
    <>
      <div className="ms-on-dark bg-band text-band-text">
        <div className="ms-container py-11 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400">Melbourne Sphere</p>
          <p className="font-display mt-3 max-w-3xl text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.06] tracking-tight">Stories from around the city</p>
        </div>
      </div>
      <div className="ms-container py-12 sm:py-16">
        <ArticleCollectionSkeleton />
      </div>
    </>
  );
}
