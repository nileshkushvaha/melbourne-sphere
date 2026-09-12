import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArticleMedia } from '@/components/article-media';
import { AuthorByline } from '@/components/author-byline';
import { AuthorCard } from '@/components/author-card';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLdScript } from '@/components/json-ld';
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/structured-data';
import { CommentForm } from '@/components/comment-form';
import { CommentList } from '@/components/comment-list';
import { PostCard } from '@/components/post-card';
import { cardGridColumns } from '@/components/page-shell';
import { ShareLinks } from '@/components/share-links';
import { fetchComments, fetchPost, privacyNoticeHref, reviewGuidelinesHref } from '@/lib/api';
import { formatArticleDate } from '@/lib/share';
import { absoluteUrl, turnstileSiteKey } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) return { title: 'Article not found', robots: { index: false } };
  return {
    title: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.firstPublishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.displayName],
      // The article's own share image when it sets one, otherwise its cover —
      // the same order the editor is shown.
      ...(post.shareImage ?? post.cover.length > 0
        ? { images: [(post.shareImage ?? post.cover.find((v) => v.kind === 'hero') ?? post.cover.at(-1))!.url] }
        : {}),
    },
  };
}

/**
 * The page grid, shared by the header, the article and the comments so all
 * three start on the same line as the site navigation: a reading column on the
 * left and a fixed sidebar on the right, with any spare width falling between
 * them rather than stretching the measure.
 */
const PAGE_GRID = 'ms-container grid gap-10 lg:grid-cols-[minmax(0,48rem)_19rem] lg:justify-between lg:gap-12';

/** Article page (SRS BLOG 004): byline, date, cover, body, optional tags, share links, related articles and approved comments. */
export default async function ArticlePage({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();
  const comments = await fetchComments(post.id);
  // Reading time from the sanitised body; 200 words per minute is the usual editorial rule of thumb.
  const readingMinutes = Math.max(1, Math.round(post.body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length / 200));
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.category.name, href: `/blog/category/${post.category.slug}` }, { label: post.title }];
  // The API returns up to four (SRS BLOG 004), shown in the same four-column
  // card grid as the blog index so the row keeps its shape with fewer cards.
  const related = post.related.slice(0, 4);
  const hasCover = post.cover.length > 0;
  const showUpdated = new Date(post.updatedAt).getTime() - new Date(post.publishedAt).getTime() > 24 * 3_600_000;

  return (
    <article>
      <JsonLdScript data={[blogPostingJsonLd(post), breadcrumbJsonLd(crumbs)]} />

      <header className="ms-on-dark ms-editorial-band text-band-text">
        <div className={`${PAGE_GRID} pt-9 sm:pt-14 ${hasCover ? 'pb-28 sm:pb-36' : 'pb-9 sm:pb-14'}`}>
          <div className="min-w-0">
            <Breadcrumbs items={crumbs} tone="dark" />
            <Link
              href={`/blog/category/${post.category.slug}`}
              className="mt-7 inline-flex min-h-9 items-center rounded-full border border-sky-400/30 bg-sky-400/10 px-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-400 transition-colors hover:border-sky-400/60 hover:bg-sky-400/20 hover:text-white"
            >
              {post.category.name}
            </Link>
            {/* `text-balance` keeps a long headline from leaving one word alone on
                the last line; `break-words` keeps an unbroken one inside the column. */}
            <h1 className="font-display mt-5 text-balance break-words text-[clamp(2rem,1.5rem+2.6vw,3.15rem)] leading-[1.06] tracking-tight">{post.title}</h1>
            <p className="mt-5 text-lg leading-relaxed text-band-muted sm:text-xl sm:leading-relaxed">{post.excerpt}</p>
            <div className="mt-8 border-t border-band-border pt-6">
              <AuthorByline author={post.author} publishedAt={post.publishedAt} updatedAt={post.updatedAt} readingMinutes={readingMinutes} tone="dark" />
            </div>
          </div>
        </div>
      </header>

      {/*
        The article and its sidebar. When there is a cover the whole grid is
        lifted into the band, so the picture and the sidebar's first card both
        overlap it and start level with each other.
      */}
      <div className={`${PAGE_GRID} relative z-10 pb-12 sm:pb-16 ${hasCover ? '-mt-20 sm:-mt-28' : 'pt-12 sm:pt-16'}`}>
        <div className="flex min-w-0 flex-col gap-10 sm:gap-12">
          {/*
            The cover is only rendered when the article has one. A cover reaches
            the public API only once the worker has processed it, so an
            unprocessed upload publishes no renditions and there is no
            picture-shaped hole to fill.
          */}
          {hasCover && (
            <figure>
              <ArticleMedia
                cover={post.cover}
                coverAlt={post.coverAlt}
                categorySlug={post.category.slug}
                ratio="16/9"
                prefer="hero"
                priority
                sizes="(min-width: 1024px) 768px, 100vw"
                className="rounded-card-lg shadow-lg"
              />
              {/* The photographer credit, which a CC Attribution licence requires
                  wherever the image appears. The alt text is not printed: it is
                  already carried by the image, and the data model has no caption. */}
              {post.coverCredit && <figcaption className="mt-3 text-sm text-text-muted">Photograph: {post.coverCredit}</figcaption>}
            </figure>
          )}

          {/* Sanitised by the API with an allowlist before it was stored (SRS SEC 001). */}
          <div className="ms-prose ms-prose-article" dangerouslySetInnerHTML={{ __html: post.body }} />

          <AuthorCard author={post.author} />
        </div>

        {/*
          The sidebar follows the body in source order, so on a phone it reads
          after the article; from `lg` it sits beside it and stays in view while
          the body scrolls (the site navigation above is about 4.5rem tall).
        */}
        <aside aria-label="About this article" className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-card border border-border bg-surface-raised p-5 shadow-sm">
            <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-sky-700">Article details</h2>
            <dl className="mt-4 divide-y divide-border text-sm">
              <div className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
                <dt className="text-text-muted">Category</dt>
                <dd className="text-right">
                  <Link href={`/blog/category/${post.category.slug}`} className="font-medium text-link underline-offset-2 hover:underline">
                    {post.category.name}
                  </Link>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-text-muted">Published</dt>
                <dd className="text-right">
                  <time dateTime={post.publishedAt}>{formatArticleDate(post.publishedAt)}</time>
                </dd>
              </div>
              {showUpdated && (
                <div className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt className="text-text-muted">Updated</dt>
                  <dd className="text-right">
                    <time dateTime={post.updatedAt}>{formatArticleDate(post.updatedAt)}</time>
                  </dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-text-muted">Reading time</dt>
                <dd className="text-right">{readingMinutes} min</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5 last:pb-0">
                <dt className="text-text-muted">Comments</dt>
                <dd className="text-right">
                  <a href="#comments-heading" className="text-link underline-offset-2 hover:underline">
                    {post.approvedCommentCount}
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-card border border-border bg-surface-raised p-5 shadow-sm">
            <ShareLinks url={absoluteUrl(`/blog/${post.slug}`)} title={post.title} />
          </div>

          {post.tags.length > 0 && (
            <nav aria-label="Tags" className="rounded-card border border-border bg-surface-raised p-5 shadow-sm">
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-sky-700">Tagged</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <li key={tag.slug}>
                    <Link href={`/blog/tag/${tag.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-border px-3.5 text-sm transition-colors hover:border-border-strong hover:bg-sky-50">
                      {tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>
      </div>

      {/*
        Related articles sit between the article and its comments: the reader has
        finished the piece and is offered another before the conversation about
        this one. The relationship is the API's — shared category, then shared
        tags, never itself or unpublished content (SRS BLOG 004) — and the front
        end invents none of it.
      */}
      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="border-y border-border bg-surface-sunken py-12 sm:py-16">
          <div className="ms-container">
            <h2 id="related-heading" className="font-display text-2xl tracking-tight sm:text-3xl">
              More from Melbourne Sphere
            </h2>
            <ul className={`mt-8 grid gap-6 ${cardGridColumns}`}>
              {related.map((item) => (
                <li key={item.id}>
                  <PostCard post={item} headingLevel={3} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className={`${PAGE_GRID} py-12 sm:py-16`}>
        <section aria-labelledby="comments-heading" className="flex min-w-0 scroll-mt-24 flex-col gap-6">
          <div>
            <h2 id="comments-heading" className="font-display scroll-mt-24 text-2xl tracking-tight sm:text-3xl">
              Comments{post.approvedCommentCount > 0 ? ` (${post.approvedCommentCount})` : ''}
            </h2>
            {comments.data.length === 0 && post.commentsEnabled && (
              <p className="mt-2 text-text-muted">No comments yet. Be the first to join the conversation.</p>
            )}
          </div>

          {comments.data.length > 0 && <CommentList comments={comments.data} />}

          {post.commentsEnabled ? (
            <div className="border-t border-border pt-8">
              <h3 className="font-display text-xl tracking-tight">Leave a comment</h3>
              <p className="mt-2 text-sm text-text-muted">
                Every comment is read by a moderator before it appears. Your email address is never published; it is used only to contact you about this comment.
              </p>
              <div className="mt-5">
                <CommentForm postId={post.id} turnstileSiteKey={turnstileSiteKey()} guidelinesHref={await reviewGuidelinesHref()} privacyHref={await privacyNoticeHref()} />
              </div>
            </div>
          ) : (
            <p className="border-t border-border pt-8 text-text-muted">Comments are closed on this article.</p>
          )}
        </section>
      </div>
    </article>
  );
}
