import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
import { fetchComments, fetchPost, reviewGuidelinesHref } from '@/lib/api';
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

/** Article page (SRS BLOG 004): byline, date, body, tags, share links, related articles and approved comments. */
export default async function ArticlePage({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = await fetchPost(slug);
  if (!post) notFound();
  const comments = await fetchComments(post.id);
  const hero = post.cover.find((variant) => variant.kind === 'hero') ?? post.cover.at(-1);
  // Reading time from the sanitised body; 200 words per minute is the usual editorial rule of thumb.
  const readingMinutes = Math.max(1, Math.round(post.body.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).length / 200));
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Blog', href: '/blog' }, { label: post.category.name, href: `/blog/category/${post.category.slug}` }, { label: post.title }];
  return (
    <article>
      <JsonLdScript data={[blogPostingJsonLd(post), breadcrumbJsonLd(crumbs)]} />

      {/* Dark editorial header, then the cover lifted into it: the article
          announces itself before the reading column begins. */}
      <div className="ms-on-dark bg-band text-band-text">
        <div className="ms-container-tight py-10 sm:py-14">
          <Breadcrumbs items={crumbs} tone="dark" />
          <Link
            href={`/blog/category/${post.category.slug}`}
            className="mt-6 inline-flex min-h-9 items-center rounded-full bg-white/10 px-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/20"
          >
            {post.category.name}
          </Link>
          <h1 className="font-display mt-5 max-w-3xl text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.06] tracking-tight">{post.title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-band-muted">{post.excerpt}</p>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
            <AuthorByline author={post.author} publishedAt={post.publishedAt} updatedAt={post.updatedAt} readingMinutes={readingMinutes} tone="dark" />
            <ShareLinks url={absoluteUrl(`/blog/${post.slug}`)} title={post.title} tone="dark" />
          </div>
        </div>
        {hero && <div aria-hidden="true" className="h-24" />}
      </div>

      {hero && (
        <div className="ms-container-tight -mt-24">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-card-lg bg-navy-900 shadow-lg">
            <Image src={hero.url} alt={post.coverAlt ?? ''} fill priority sizes="(min-width: 1120px) 1120px, 100vw" className="object-cover" />
          </div>
          {/* The caption and the credit are separate obligations: the caption
              describes the picture, while the credit is what a Creative Commons
              Attribution licence requires to be shown alongside it. */}
          {(post.coverAlt || post.coverCredit) && (
            <p className="mt-3 text-sm text-text-muted">
              {post.coverAlt}
              {post.coverAlt && post.coverCredit ? ' · ' : ''}
              {post.coverCredit && <span>Photograph: {post.coverCredit}</span>}
            </p>
          )}
        </div>
      )}

      <div className="ms-container-tight flex flex-col gap-10 py-12 sm:py-16">
        {/* Sanitised by the API with an allowlist before it was stored (SRS SEC 001). */}
        <div className="ms-prose text-[1.0625rem]" dangerouslySetInnerHTML={{ __html: post.body }} />

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

        <section aria-labelledby="comments-heading" className="flex flex-col gap-5">
          <h2 id="comments-heading" className="font-display text-2xl">
            Comments{post.approvedCommentCount > 0 ? ` (${post.approvedCommentCount})` : ''}
          </h2>
          <CommentList comments={comments.data} />
          {post.commentsEnabled ? (
            <div>
              <h3 className="mb-3 text-lg font-semibold">Leave a comment</h3>
              <CommentForm postId={post.id} turnstileSiteKey={turnstileSiteKey()} guidelinesHref={await reviewGuidelinesHref()} />
            </div>
          ) : (
            <p className="text-text-muted">Comments are closed on this article.</p>
          )}
        </section>
      </div>

      {post.related.length > 0 && (
        <section aria-labelledby="related-heading" className="ms-section bg-surface-sunken">
          <div className="ms-container">
            <h2 id="related-heading" className="font-display text-3xl tracking-tight">
              More from the blog
            </h2>
            <ul className={`mt-8 grid gap-6 ${gridColumns(post.related.length)}`}>
              {post.related.map((related) => (
                <li key={related.id}>
                  <PostCard post={related} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  );
}
