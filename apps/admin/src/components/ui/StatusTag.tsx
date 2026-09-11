import { PALETTE, TONES } from './statusTone';

/**
 * A status pill. The dot repeats the state in shape as well as colour, so the
 * meaning survives greyscale and colour vision differences (WCAG 1.4.1), and the
 * soft tint keeps a table of statuses from reading as a row of traffic lights.
 */
export function StatusTag({ status }: { status: string }) {
  const { tone, label } = TONES[status] ?? { tone: 'neutral' as const };
  const colours = PALETTE[tone];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 500,
        lineHeight: 1.6,
        color: colours.fg,
        background: colours.bg,
        border: `1px solid ${colours.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="ms-status-dot" aria-hidden="true" />
      {label ?? status.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}
    </span>
  );
}
