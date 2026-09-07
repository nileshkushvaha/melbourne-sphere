import { Alert, Button, Col, List, Row, Skeleton, Space, Tag, Typography } from 'antd';
import { AlertOutlined, CommentOutlined, FileSearchOutlined, MailOutlined, PictureOutlined, ReadOutlined, ShopOutlined, StarOutlined, ReloadOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { dashboardApi, type DashboardMetric } from '@/api/dashboard';
import { ApiStatus } from '@/components/ApiStatus';
import { EmptyState, PageHeader, SectionCard, StatCard } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/** Icon per metric; falls back to a neutral glyph for anything new from the API. */
const ICONS: Record<string, ReactNode> = {
  pendingReviews: <StarOutlined aria-hidden="true" />,
  pendingComments: <CommentOutlined aria-hidden="true" />,
  openReports: <AlertOutlined aria-hidden="true" />,
  failedEnquiries: <MailOutlined aria-hidden="true" />,
  newEnquiries: <MailOutlined aria-hidden="true" />,
  draftListings: <ShopOutlined aria-hidden="true" />,
  quarantinedMedia: <PictureOutlined aria-hidden="true" />,
  duePosts: <ReadOutlined aria-hidden="true" />,
};

/** Readable sentence for an audit action key such as `blog.post.publish`. */
function describeAction(action: string): string {
  const words = action.replace(/[._]/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Operational overview (SRS ADM 003): what needs attention, and nothing private. */
export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const api = dashboardApi();
  const [state, reload] = useAsync((signal) => api.summary(signal), []);

  // The payload is defensive: a partial response must not blank the screen.
  const metrics: DashboardMetric[] = state.status === 'ready' ? (state.data.metrics ?? []) : [];
  const needsAttention = metrics.filter((metric) => metric.value > 0 && metric.tone !== 'neutral');

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="What is waiting for a decision right now. Counts respect your permissions, and no private message text appears here."
        meta={state.status === 'ready' ? <Tag>Updated {formatDateTime(state.data.generatedAt)}</Tag> : null}
        actions={
          <Button icon={<ReloadOutlined aria-hidden="true" />} onClick={reload} loading={state.status === 'loading'}>
            Refresh
          </Button>
        }
      />

      {state.status === 'error' && (
        <Alert type="error" showIcon style={{ marginBottom: 20 }} message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />
      )}

      {state.status === 'loading' && <Skeleton active paragraph={{ rows: 6 }} />}

      {state.status === 'ready' && (
        <>
          {needsAttention.length === 0 && metrics.length > 0 && (
            <Alert type="success" showIcon style={{ marginBottom: 20 }} message="Nothing is waiting for moderation or delivery" description="Reviews, comments, reports and enquiries are all clear." />
          )}
          <Row gutter={[16, 16]} style={{ marginBottom: 4 }}>
            {metrics.map((metric) => (
              <Col key={metric.key} xs={24} sm={12} lg={8} xxl={6}>
                <StatCard label={metric.label} value={metric.value} href={metric.href} tone={metric.tone} icon={ICONS[metric.key]} />
              </Col>
            ))}
          </Row>
          {metrics.length === 0 && (
            <SectionCard title="No metrics available">
              <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                Your account has no permissions that expose dashboard counts. Ask a Super Admin if you expect to moderate or publish content.
              </Typography.Paragraph>
            </SectionCard>
          )}

          <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
            <Col xs={24} xl={12}>
              <SectionCard title="Scheduled articles" description="Publishing runs automatically; overdue items mean the scheduler needs attention.">
                {(state.data.scheduledPosts ?? []).length === 0 ? (
                  <EmptyState title="Nothing scheduled" description="Articles you schedule for a future Melbourne time appear here until they publish." />
                ) : (
                  <List
                    dataSource={state.data.scheduledPosts ?? []}
                    renderItem={(post) => (
                      <List.Item
                        actions={[
                          <Link key="open" to={`/posts/${post.id}`}>
                            Open
                          </Link>,
                        ]}
                      >
                        <div>
                          <Typography.Text strong>{post.title}</Typography.Text>
                          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                            <Space size={8}>
                              <span>{formatDateTime(post.scheduledAt)}</span>
                              {post.overdue && <Tag color="red">overdue</Tag>}
                            </Space>
                          </Typography.Paragraph>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </SectionCard>
            </Col>
            <Col xs={24} xl={12}>
              <SectionCard
                title="Recent activity"
                description="The latest entries from the audit log."
                extra={
                  <Link to="/audit">
                    <Space size={6}>
                      <FileSearchOutlined aria-hidden="true" />
                      Full log
                    </Space>
                  </Link>
                }
              >
                {(state.data.activity ?? []).length === 0 ? (
                  <EmptyState title="No recent activity" description="Administrator actions appear here as soon as they happen." />
                ) : (
                  <List
                    dataSource={state.data.activity ?? []}
                    renderItem={(entry) => (
                      <List.Item>
                        <div>
                          <Typography.Text strong>{describeAction(entry.action)}</Typography.Text>
                          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
                            {entry.actorName ?? 'System'} · {formatDateTime(entry.createdAt)}
                          </Typography.Paragraph>
                        </div>
                      </List.Item>
                    )}
                  />
                )}
              </SectionCard>
            </Col>
          </Row>

          <SectionCard title="Service status">
            <ApiStatus />
          </SectionCard>
        </>
      )}
    </div>
  );
}
