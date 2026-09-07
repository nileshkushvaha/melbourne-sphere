import Link from 'next/link';
import { Button } from '@melbourne-sphere/ui';

interface Props {
  title?: string;
  description?: string;
}

/**
 * The 404 body, shared by the root boundary and the per-segment ones. Segment
 * boundaries matter: without them Next serves its bare error document for a
 * `notFound()` thrown inside a dynamic page, which would leave the page without
 * server-rendered content or the site shell (SRS SEO 001).
 */
export function NotFoundContent({ title = 'Page not found', description = 'This page does not exist or is no longer published.' }: Props) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-text-muted">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/directory">Browse the directory</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/blog">Read the blog</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Home</Link>
        </Button>
      </div>
    </div>
  );
}
