import Image from 'next/image';
import type { PostDetail } from '@/lib/api';
import { BrandIcon, brandLabel } from './brand-icon';

/**
 * Author card shown under an article (SRS BLOG 004/005: author information
 * appears with the article rather than on an empty archive page). Every field
 * is optional and omitted when the editor has not filled it in.
 */
export function AuthorCard({ author }: { author: PostDetail['author'] }) {
  const hasDetail = Boolean(author.bio || author.shortBio || author.role || author.expertise.length > 0 || author.links.length > 0);
  if (!hasDetail) return null;
  return (
    <aside aria-labelledby="author-heading" className="rounded-card border border-border bg-surface-raised p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row">
        {author.image && <Image src={author.image.url} alt="" width={80} height={80} className="size-20 shrink-0 rounded-full object-cover" />}
        <div className="min-w-0">
          <h2 id="author-heading" className="text-lg font-semibold">
            {author.displayName}
          </h2>
          <p className="text-sm text-text-muted">
            {[author.role, author.pronouns, author.location].filter(Boolean).join(' · ')}
          </p>
          {author.bio ? (
            // Sanitised by the API with the editorial allowlist before storage (SRS SEC 001).
            <div className="ms-prose mt-3 text-sm" dangerouslySetInnerHTML={{ __html: author.bio }} />
          ) : (
            author.shortBio && <p className="mt-3 text-sm text-text-muted">{author.shortBio}</p>
          )}
          {author.expertise.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="Topics">
              {author.expertise.map((topic) => (
                <li key={topic} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                  {topic}
                </li>
              ))}
            </ul>
          )}
          {author.links.length > 0 && (
            // The mark identifies the network at a glance; the name is still the
            // accessible name, so the row does not depend on recognising a glyph.
            <ul aria-label={`${author.displayName} elsewhere`} className="mt-3 flex flex-wrap gap-1.5">
              {author.links.map((link) => {
                const name = link.label ?? brandLabel(link.kind);
                return (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      rel="noopener noreferrer nofollow"
                      target="_blank"
                      title={name}
                      className="inline-flex size-11 items-center justify-center rounded-full border border-border text-text-muted transition-colors hover:border-border-strong hover:bg-sky-50 hover:text-link"
                    >
                      <BrandIcon kind={link.kind} size={18} />
                      <span className="sr-only">{name}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
