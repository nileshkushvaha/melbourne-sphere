import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import { Link } from 'react-router';
import { brand } from '@/config/theme';

export type StatTone = 'neutral' | 'attention' | 'critical';

const TONE_COLOURS: Record<StatTone, string> = {
  neutral: brand.textMuted,
  attention: brand.warning,
  critical: brand.danger,
};

interface Props {
  label: string;
  value: number;
  href?: string;
  tone?: StatTone;
  icon?: ReactNode;
  /** Optional context line, e.g. "oldest waiting 3 days". */
  hint?: ReactNode;
}

/** A single number with its meaning, its severity and a way to act on it. */
export function StatCard({ label, value, href, tone = 'neutral', icon, hint }: Props) {
  const colour = TONE_COLOURS[tone];
  const body = (
    <Card
      style={{ height: '100%', borderColor: tone === 'neutral' ? undefined : colour }}
      styles={{ body: { padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start' } }}
    >
      {icon && (
        <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: tone === 'neutral' ? brand.primarySoft : `${colour}1A`, color: tone === 'neutral' ? brand.primary : colour, fontSize: 18 }}>
          {icon}
        </span>
      )}
      <span style={{ minWidth: 0 }}>
        <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
          {label}
        </Typography.Text>
        <Typography.Text style={{ display: 'block', fontSize: 28, fontWeight: 650, lineHeight: 1.2, color: value > 0 ? colour : brand.text }}>{value}</Typography.Text>
        {hint && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {hint}
          </Typography.Text>
        )}
      </span>
    </Card>
  );
  return href ? (
    <Link to={href} style={{ display: 'block', height: '100%', color: 'inherit' }} aria-label={`${label}: ${value}`}>
      {body}
    </Link>
  ) : (
    body
  );
}
