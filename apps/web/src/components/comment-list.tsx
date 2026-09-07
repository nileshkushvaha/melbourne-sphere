import type { PublicComment } from '@/lib/api';
import { formatArticleDate } from '@/lib/share';

/** Approved comments only, oldest first (SRS COM 001–002). */
export function CommentList({ comments }: { comments: PublicComment[] }) {
  if (comments.length === 0) return <p className="text-text-muted">No comments yet.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {comments.map((comment) => (
        <li key={comment.id} className="rounded-card border border-border bg-surface-raised p-4">
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold">{comment.displayName}</span>
            <time dateTime={comment.createdAt} className="text-sm text-text-muted">
              {formatArticleDate(comment.createdAt)}
            </time>
          </p>
          <p className="mt-2 whitespace-pre-line leading-relaxed">{comment.text}</p>
          {comment.redacted && <p className="mt-1 text-xs text-text-muted">This comment was edited by our moderators.</p>}
        </li>
      ))}
    </ul>
  );
}
