import type { ReactNode } from 'react';
import { Breadcrumb, Space, Typography } from 'antd';
import { Link } from 'react-router';

export interface Crumb {
  label: string;
  href?: string;
}

interface Props {
  title: string;
  /** One sentence explaining what the screen is for; shown under the title. */
  description?: ReactNode;
  crumbs?: Crumb[];
  /** Primary and secondary actions, right-aligned on wide screens. */
  actions?: ReactNode;
  /** Status chips or counts rendered beside the title. */
  meta?: ReactNode;
}

/**
 * One page heading pattern for every screen: breadcrumbs, a single H1, an
 * optional explanation and the page actions. Consistency here is what makes the
 * admin feel like one product rather than a pile of forms.
 */
export function PageHeader({ title, description, crumbs, actions, meta }: Props) {
  return (
    // A plain div, not <header>: inside the page it must not become a second banner landmark.
    <div style={{ marginBottom: 20 }}>
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={crumbs.map((crumb) => ({ title: crumb.href ? <Link to={crumb.href}>{crumb.label}</Link> : crumb.label }))}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <Space align="center" size={10} wrap>
            <Typography.Title level={1} style={{ fontSize: 26, margin: 0, letterSpacing: '-0.01em' }}>
              {title}
            </Typography.Title>
            {meta}
          </Space>
          {description && (
            <Typography.Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 720 }}>
              {description}
            </Typography.Paragraph>
          )}
        </div>
        {actions && <Space wrap>{actions}</Space>}
      </div>
    </div>
  );
}
