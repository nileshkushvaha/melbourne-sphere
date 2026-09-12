import type { PublicComment } from '@/lib/api';
import { formatArticleDate } from '@/lib/share';

/**
 * Approved comments, oldest first (SRS COM 001–002). The API publishes a display
 * name, the text and the time only — no email address and no moderation
 * metadata — so there is nothing here that could expose either.
 *
 * The initial is a mark, not an identity: it is `aria-hidden` because the name
 * it was taken from is read out on the line beside it.
 */
export function CommentList({ comments }: { comments: PublicComment[] }) {
  if (comments.length === 0) return null;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-3.5 py-5 first:pt-0 sm:gap-4">
          <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-sky-50 text-sm font-semibold text-sky-700">
            {comment.displayName.trim().slice(0, 1).toUpperCase() || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-semibold">{comment.displayName}</span>
              <time dateTime={comment.createdAt} className="text-sm text-text-muted">
                {formatArticleDate(comment.createdAt)}
              </time>
            </p>
            <p className="mt-1.5 whitespace-pre-line break-words leading-relaxed">{comment.text}</p>
            {comment.redacted && <p className="mt-1.5 text-xs text-text-muted">This comment was edited by our moderators.</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
