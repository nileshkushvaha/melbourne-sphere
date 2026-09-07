/**
 * Star display for a rating (SRS NFR 011): decorative only. Every caller states
 * the rating in text beside it, so nothing here carries information by colour
 * or shape alone, and it is hidden from assistive technology.
 *
 * Partial stars are drawn by clipping a filled row over an outlined row, so a
 * 4.3 average looks like 4.3 rather than being rounded up to five.
 */
export function RatingStars({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' } as const;
  return (
    <span aria-hidden="true" className={`relative inline-block select-none whitespace-nowrap leading-none tracking-[0.1em] ${sizes[size]}`}>
      <span className="text-border-strong">★★★★★</span>
      <span className="absolute inset-y-0 left-0 overflow-hidden text-warning" style={{ width: `${percent}%` }}>
        ★★★★★
      </span>
    </span>
  );
}
