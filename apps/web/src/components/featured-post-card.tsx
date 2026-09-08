import Image from 'next/image';
import Link from 'next/link';
import type { PostCard as PostCardData } from '@/lib/api';
import { formatArticleDate } from '@/lib/share';

/**
 * Lead article: the same data as a card, given a two-column editorial layout.
 * Used on the blog index and as the anchor of the home page's story section, so
 * one real article still fills the band properly.
 *
 * `headingLevel` keeps the document outline correct: h2 on the blog index,
 * where it follows the page h1, and h3 inside the home page's blog section.
 */
export function FeaturedPostCard({ post, headingLevel = 2 }: { post: PostCardData; headingLevel?: 2 | 3 }) {
  const cover = post.cover.find((variant) => variant.kind === 'hero') ?? post.cover.at(-1);
  const Heading = `h${headingLevel}` as const;
  const href = `/blog/${encodeURIComponent(post.slug)}`;
  return (
    <article className="ms-card-lift group relative grid overflow-hidden rounded-card-lg border border-white/80 bg-white/82 shadow-md backdrop-blur-sm lg:grid-cols-2">
      <div className="relative aspect-[16/9] overflow-hidden bg-navy-900 lg:aspect-auto lg:h-full lg:min-h-80">
        {cover ? (
          <Image src={cover.url} alt={post.coverAlt ?? ''} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        ) : (
          <div aria-hidden="true" className="flex size-full items-center justify-center bg-[linear-gradient(135deg,#1d447f_0%,#08152b_100%)] px-8">
            <span className="font-display text-center text-3xl text-white/85">{post.category.name}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-4 p-6 sm:p-9">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="inline-flex items-center rounded-full bg-navy-900 px-2.5 py-1 font-semibold text-white">Latest</span>
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">{post.category.name}</span>
          <time dateTime={post.publishedAt} className="text-text-muted">
            {formatArticleDate(post.publishedAt)}
          </time>
        </p>
        <Heading className="font-display text-3xl leading-tight sm:text-4xl">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] group-hover:text-link">
            {post.title}
          </Link>
        </Heading>
        <p className="max-w-prose leading-relaxed text-text-muted">{post.excerpt}</p>
        <p className="mt-auto flex items-center gap-2 pt-2 text-sm text-text-muted">
          {post.author.image && <Image src={post.author.image.url} alt="" width={32} height={32} className="size-8 rounded-full object-cover" />}
          <span>
            By <span className="font-medium text-text">{post.author.displayName}</span>
            {post.author.role ? ` · ${post.author.role}` : ''}
          </span>
        </p>
      </div>
    </article>
  );
}
