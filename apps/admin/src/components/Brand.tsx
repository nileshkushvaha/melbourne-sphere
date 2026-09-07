import { brand } from '@/config/theme';

interface BrandProps {
  compact?: boolean;
}

/** Text wordmark; a licensed logo asset replaces the glyph in a later design pass (SRS UX 001). */
export function Brand({ compact = false }: BrandProps) {
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
          background: `linear-gradient(135deg, ${brand.primaryHover}, ${brand.primary})`,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {compact ? <span className="sr-only">Melbourne Sphere</span> : <span>Melbourne Sphere</span>}
      {!compact && (
        <span style={{ fontWeight: 500, fontSize: 13, color: brand.navyMuted, marginLeft: 2 }}>Admin</span>
      )}
    </span>
  );
}
