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
import { gridColumns } from '@/components/page-shell';
import { ShareLinks } from '@/components/share-links';
import { fetchComments, fetchPost, privacyNoticeHref, reviewGuidelinesHref } from '@/lib/api';
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

/** Article page (SRS BLOG 004): byline, date, cover, body, optional tags, share links, related articles and approved comments. */
export default async function ArticlePage({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();
  const comments = await fetchComments(post.id);
  // Reading time from the sanitised body; 200 words per minute is the usual editorial rule of thumb.
  const readingMinutes = Math.max(1, Math.round(post.body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length / 200));
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.category.name, href: `/blog/category/${post.category.slug}` }, { label: post.title }];
  // The API returns up to four; a row of three keeps them readable at the width
  // this section uses (SRS BLOG 004 sets the maximum, not the presentation).
  const related = post.related.slice(0, 3);

  return (
    <article>
      <JsonLdScript data={[blogPostingJsonLd(post), breadcrumbJsonLd(crumbs)]} />

      {/*
        The editorial header. The words are set in the reading column so the
        title, the standfirst and the first paragraph of the body all begin on
        the same line; the picture below is allowed to be wider than them.
      */}
      <header className="ms-on-dark bg-band text-band-text">
        <div className="ms-container-read py-9 sm:py-12">
          <Breadcrumbs items={crumbs} tone="dark" />
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="mt-6 inline-flex min-h-9 items-center rounded-full bg-white/10 px-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20"
          >
            {post.category.name}
          </Link>
          {/* `text-balance` keeps a long headline from leaving one word alone on
              the last line; `break-words` keeps an unbroken one inside the column. */}
          <h1 className="font-display mt-5 text-balance break-words text-[clamp(2rem,1.5rem+2.6vw,3.15rem)] leading-[1.08] tracking-tight">{post.title}</h1>
          <p className="mt-5 text-[1.0625rem] leading-relaxed text-band-muted sm:text-lg">{post.excerpt}</p>
          {/* The byline leads and the share row follows it, rather than sitting
              level with the title and competing with it. */}
          <div className="mt-8 flex flex-col gap-5 border-t border-band-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <AuthorByline author={post.author} publishedAt={post.publishedAt} updatedAt={post.updatedAt} readingMinutes={readingMinutes} tone="dark" />
            <ShareLinks url={absoluteUrl(`/blog/${post.slug}`)} title={post.title} tone="dark" />
          </div>
        </div>
        {/* The band runs on behind the picture, which is then lifted into it. */}
        {post.cover.length > 0 && <div aria-hidden="true" className="h-20 sm:h-24" />}
      </header>

      {/*
        The cover is only rendered when the article has one. A cover reaches the
        public API only once the worker has processed it, so an unprocessed
        upload publishes no renditions and this section is simply absent — the
        page does not reserve a picture-shaped hole and fill it with a panel.
      */}
      {post.cover.length > 0 && (
        <figure className="ms-container-tight -mt-20 sm:-mt-24">
          <ArticleMedia
            cover={post.cover}
            coverAlt={post.coverAlt}
            categorySlug={post.category.slug}
            ratio="16/9"
            prefer="hero"
            priority
            sizes="(min-width: 1120px) 1008px, 100vw"
            className="rounded-card-lg shadow-lg"
          />
          {/*
            The photographer credit, and only that. A Creative Commons
            Attribution licence requires it to appear wherever the image does, so
            it is labelled as what it is. The alternative text is deliberately
            *not* printed here: it is the description a screen reader announces
            in place of the picture, already carried by the image itself, and
            printing it put bare metadata — an editor's own name, in the
            screenshots — under the photograph as if it were a caption. The data
            model has no caption field, and this redesign does not invent one.
          */}
          {post.coverCredit && <figcaption className="mt-3 text-sm text-text-muted">Photograph: {post.coverCredit}</figcaption>}
        </figure>
      )}

      <div className="ms-container-read flex flex-col gap-10 py-12 sm:gap-12 sm:py-16">
        {/* Sanitised by the API with an allowlist before it was stored (SRS SEC 001). */}
        <div className="ms-prose ms-prose-article" dangerouslySetInnerHTML={{ __html: post.body }} />

        {post.tags.length > 0 && (
          <nav aria-label="Tags" className="flex flex-wrap items-center gap-2 border-t border-border pt-8">
            <span className="text-sm text-text-muted">Tagged:</span>
            {post.tags.map((tag) => (
              <Link key={tag.slug} href={`/blog/tag/${tag.slug}`} className="inline-flex min-h-9 items-center rounded-full border border-border px-3.5 text-sm transition-colors hover:border-border-strong hover:bg-sky-50">
                {tag.name}
              </Link>
            ))}
          </nav>
        )}

        <AuthorCard author={post.author} />
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
          <div className="ms-container-tight">
            <h2 id="related-heading" className="font-display text-2xl tracking-tight sm:text-3xl">
              More from Melbourne Sphere
            </h2>
            <ul className={`mt-8 grid gap-6 ${gridColumns(related.length)}`}>
              {related.map((item) => (
                <li key={item.id}>
                  <PostCard post={item} headingLevel={3} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="ms-container-read py-12 sm:py-16">
        <section aria-labelledby="comments-heading" className="flex flex-col gap-6">
          <div>
            <h2 id="comments-heading" className="font-display text-2xl tracking-tight sm:text-3xl">
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
