import { Tag } from 'antd';

/** Shared status vocabulary so a state always looks the same wherever it appears. */
const TONES: Record<string, { color: string; label?: string }> = {
  published: { color: 'green' },
  active: { color: 'green' },
  approved: { color: 'green' },
  ready: { color: 'green' },
  sent: { color: 'green' },
  draft: { color: 'default' },
  inactive: { color: 'default' },
  archived: { color: 'default' },
  closed: { color: 'default' },
  scheduled: { color: 'blue' },
  new: { color: 'blue' },
  quarantined: { color: 'gold' },
  pending: { color: 'gold' },
  open: { color: 'gold' },
  inProgress: { color: 'blue', label: 'in progress' },
  failed: { color: 'red' },
  rejected: { color: 'red' },
  spam: { color: 'red' },
  gone: { color: 'red' },
};

export function StatusTag({ status }: { status: string }) {
  const tone = TONES[status] ?? { color: 'default' };
  return (
    <Tag color={tone.color} style={{ textTransform: 'none', marginInlineEnd: 0 }}>
      {tone.label ?? status.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()}
    </Tag>
  );
}
