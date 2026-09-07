import Image from 'next/image';
import type { PostDetail } from '@/lib/api';
import { formatArticleDate } from '@/lib/share';

interface Props {
  author: PostDetail['author'];
  publishedAt: string;
  updatedAt?: string;
  readingMinutes?: number;
  /** `dark` when the byline sits on a navy band. */
  tone?: 'light' | 'dark';
}

/** Byline with the author's photo, role and dates (SRS BLOG 004). */
export function AuthorByline({ author, publishedAt, updatedAt, readingMinutes, tone = 'light' }: Props) {
  const muted = tone === 'dark' ? 'text-band-muted' : 'text-text-muted';
  const strong = tone === 'dark' ? 'text-white' : 'text-text';
  const fallback = tone === 'dark' ? 'bg-white/12 text-white' : 'bg-sky-100 text-sky-700';
  const showUpdated = updatedAt && new Date(updatedAt).getTime() - new Date(publishedAt).getTime() > 24 * 3_600_000;
  return (
    <div className="flex items-center gap-3">
      {author.image ? (
        <Image src={author.image.url} alt="" width={44} height={44} className="size-11 rounded-full object-cover" />
      ) : (
        <span aria-hidden="true" className={`grid size-11 place-items-center rounded-full text-sm font-semibold ${fallback}`}>
          {author.displayName.slice(0, 1)}
        </span>
      )}
      <p className={`text-sm ${muted}`}>
        <span className={`font-semibold ${strong}`}>{author.displayName}</span>
        {author.role && <span> · {author.role}</span>}
        <br />
        <time dateTime={publishedAt}>{formatArticleDate(publishedAt)}</time>
        {showUpdated && <span> · updated {formatArticleDate(updatedAt!)}</span>}
        {readingMinutes ? <span> · {readingMinutes} min read</span> : null}
      </p>
    </div>
  );
}
