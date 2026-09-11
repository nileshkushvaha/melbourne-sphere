import { brand } from '@/config/theme';

interface BrandProps {
  compact?: boolean;
  /** The rail is narrow and the top bar already says where you are. */
  showSuffix?: boolean;
}

/** Text wordmark; a licensed logo asset replaces the glyph in a later design pass (SRS UX 001). */
export function Brand({ compact = false, showSuffix = true }: BrandProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: 17,
        letterSpacing: 0.2,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${brand.primarySolidHover}, ${brand.primarySolid})`,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {compact ? <span className="sr-only">Melbourne Sphere</span> : <span>Melbourne Sphere</span>}
      {!compact && showSuffix && (
        <span style={{ fontWeight: 500, fontSize: 13, color: brand.navyMuted, marginLeft: 2 }}>Admin</span>
      )}
    </span>
  );
}
