import type { ReactNode } from 'react';
import { Space, Typography } from 'antd';
import { brand, elevation } from '@/config/theme';

interface Props {
  /** Left-hand context: unsaved changes, current version, validation summary. */
  status?: ReactNode;
  children: ReactNode;
}

/**
 * Save bar pinned to the bottom of long forms, so the primary action is always
 * reachable without scrolling and unsaved state stays visible.
 */
export function StickyActions({ status, children }: Props) {
  return (
    <div
      style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 20,
        marginTop: 20,
        padding: '12px 16px',
        background: brand.surfaceRaised,
        border: `1px solid ${brand.border}`,
        borderRadius: 12,
        boxShadow: elevation.raised,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
        {status}
      </Typography.Text>
      <Space wrap>{children}</Space>
    </div>
  );
}
