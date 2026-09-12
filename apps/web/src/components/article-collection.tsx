import Link from 'next/link';
import type { PostCard as PostCardData } from '@/lib/api';
import { articleColumns } from './page-shell';
import { PostCard } from './post-card';

interface Props {
  posts: PostCardData[];
  /** An accessible name for the list, e.g. "Articles in City guides". */
  label: string;
  /**
   * Off on a category or tag archive: the term is already the page heading, and
   * repeating it on every card is the redundancy the archive is criticised for.
   */
  showCategory?: boolean;
  headingLevel?: 2 | 3;
  /** True when this collection is the first thing under the page heading, so its lead picture may load eagerly. */
  leadIsAboveFold?: boolean;
}

/**
 * A collection of articles, laid out for the number of articles there actually
 * are (SRS BLOG 005).
 *
 * A single article is given the lead layout — picture beside the words — rather
 * than a grid card stretched across the section. Stretching it was the defect
 * behind the archive screenshots: one `grid-cols-1` card filled the 1520px
 * content width, and a 16:9 frame at that width is an 850px-tall block of
 * whatever is behind the picture. Two articles sit side by side; three or more
 * take the three-column grid.
 */
export function ArticleCollection({ posts, label, showCategory = true, headingLevel = 2, leadIsAboveFold = false }: Props) {
  if (posts.length === 0) return null;

  if (posts.length === 1) {
    return (
      <PostCard post={posts[0]!} variant="featured" headingLevel={headingLevel} showCategory={showCategory} priority={leadIsAboveFold} />
    );
  }

  return (
    <ul aria-label={label} className={`grid grid-cols-1 gap-6 ${articleColumns(posts.length)}`}>
      {posts.map((post, index) => (
        <li key={post.id}>
          <PostCard post={post} headingLevel={headingLevel} showCategory={showCategory} priority={leadIsAboveFold && index === 0} />
        </li>
      ))}
    </ul>
  );
}

/**
 * What a blog page shows when it has nothing to list. Separate messages for
 * "nothing published anywhere yet" and "nothing in this collection" — the second
 * can offer a way onwards, and the first cannot pretend there is one.
 */
export function BlogEmptyState({ message, action }: { message: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-card-lg border border-dashed border-border-strong bg-surface-raised px-6 py-14 text-center">
      <p className="mx-auto max-w-md text-text-muted">{message}</p>
      {action && (
        <Link href={action.href} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-navy-900 px-5 text-sm font-semibold text-text-inverse transition-colors hover:bg-navy-800">
          {action.label}
        </Link>
      )}
    </div>
  );
}
