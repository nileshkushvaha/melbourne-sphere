import { shareTargets } from '@/lib/share';

/** Plain links only (SRS BLOG 004): no third-party widgets, no tracking scripts. */
export function ShareLinks({ url, title, tone = 'light' }: { url: string; title: string; tone?: 'light' | 'dark' }) {
  const chip =
    tone === 'dark'
      ? 'border-band-border bg-white/[0.06] text-white hover:border-sky-400 hover:bg-white/12'
      : 'border-border hover:bg-sky-50';
  return (
    <nav aria-label="Share this article" className="flex flex-wrap items-center gap-2 text-sm">
      <span className={tone === 'dark' ? 'text-band-muted' : 'text-text-muted'}>Share:</span>
      {shareTargets(url, title).map((target) => (
        <a key={target.label} href={target.href} target="_blank" rel="noopener noreferrer nofollow" className={`inline-flex min-h-9 items-center rounded-full border px-3.5 transition-colors ${chip}`}>
          {target.label.replace('Share on ', '').replace('Share by ', '')}
        </a>
      ))}
    </nav>
  );
}
