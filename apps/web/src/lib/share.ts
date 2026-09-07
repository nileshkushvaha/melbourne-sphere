/**
 * Share links (SRS BLOG 004): ordinary URLs and a copy-link control only — no
 * third-party social widgets or tracking scripts.
 */
export interface ShareTarget {
  label: string;
  href: string;
}

export function shareTargets(url: string, title: string): ShareTarget[] {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return [
    { label: 'Share by email', href: `mailto:?subject=${encodedTitle}&body=${encodedUrl}` },
    { label: 'Share on X', href: `https://x.com/intent/post?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: 'Share on LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];
}

const dateFormatter = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', day: 'numeric', month: 'long', year: 'numeric' });

export function formatArticleDate(iso: string): string {
  return dateFormatter.format(new Date(iso));
}
