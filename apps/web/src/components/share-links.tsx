import { shareTargets } from '@/lib/share';
import { BrandIcon } from './brand-icon';

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
        <a key={target.label} href={target.href} target="_blank" rel="noopener noreferrer nofollow" title={target.label} className={`inline-flex size-11 items-center justify-center rounded-full border transition-colors ${chip}`}>
          <BrandIcon kind={target.kind} size={16} />
          {/* The mark is decorative; the full instruction stays the accessible name. */}
          <span className="sr-only">{target.label}</span>
        </a>
      ))}
    </nav>
  );
}
