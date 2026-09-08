import Image from 'next/image';
import Link from 'next/link';
import type { PostCard as PostCardData } from '@/lib/api';
import { formatArticleDate } from '@/lib/share';

/**
 * Article card for the blog index and landing pages (SRS BLOG 005). Articles
 * without a processed cover get an editorial panel — the category set in the
 * display serif — instead of a blank frame, so a mixed grid stays even.
 */
export function PostCard({ post }: { post: PostCardData }) {
  const cover = post.cover.find((variant) => variant.kind === 'card') ?? post.cover[0];
  const href = `/blog/${encodeURIComponent(post.slug)}`;
  return (
    <article className="ms-card-lift group relative flex h-full flex-col overflow-hidden rounded-card-lg border border-white/80 bg-white/82 shadow-md backdrop-blur-sm">
      <div className="relative aspect-[16/10] overflow-hidden bg-navy-900">
        {cover ? (
          <Image src={cover.url} alt={post.coverAlt ?? ''} fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div aria-hidden="true" className="flex size-full items-center justify-center bg-[linear-gradient(135deg,#153260_0%,#08152b_100%)] px-6">
            <span className="font-display text-center text-2xl text-white/85">{post.category.name}</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 font-semibold text-sky-700">{post.category.name}</span>
          <time dateTime={post.publishedAt} className="text-text-muted">
            {formatArticleDate(post.publishedAt)}
          </time>
        </p>
        <h3 className="font-display text-xl leading-snug">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] group-hover:text-link">
            {post.title}
          </Link>
        </h3>
        <p className="line-clamp-3 text-sm leading-relaxed text-text-muted">{post.excerpt}</p>
        <p className="mt-auto flex items-center gap-2 pt-2 text-sm text-text-muted">
          {post.author.image && <Image src={post.author.image.url} alt="" width={28} height={28} className="size-7 rounded-full object-cover" />}
          <span>
            By <span className="font-medium text-text">{post.author.displayName}</span>
          </span>
        </p>
      </div>
    </article>
  );
}
