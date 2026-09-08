import { Alert, App, Button, Card, Space, Table, Tag, Typography } from 'antd';
import { cacheApi, type CacheNamespaceStatus, type CacheTagStatus } from '@/api/system';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/**
 * Cache manager (SRS 1.2 CMGR 001–005).
 *
 * Only the caches the server registers can be seen or cleared, and each entry is
 * named rather than typed: there is no field here that takes a key or a pattern,
 * and no control that clears everything. Sessions, sign-in limits and the queue
 * are deliberately not here — they have their own screens and their own
 * permissions.
 */
export function CacheManagerPage() {
  useDocumentTitle('Cache manager');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const [state, reload] = useAsync(() => cacheApi.status(), []);
  const mayClear = can(PERMISSION.systemCacheInvalidate);

  const clear = (kind: 'namespace' | 'tag', key: string, label: string, consequence: string) => {
    modal.confirm({
      title: `Clear ${label.toLowerCase()}?`,
      content: consequence,
      okText: 'Clear',
      onOk: async () => {
        try {
          const result = await cacheApi.clear(kind, key);
          message.success(kind === 'namespace' ? `Cleared ${result.cleared ?? 0} entr${result.cleared === 1 ? 'y' : 'ies'}` : 'Pages queued for refresh');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'System' }, { label: 'Cache manager' }]}
        title="Cache manager"
        description="What the site is holding in memory, and how to clear it. Clearing a cache only makes pages slower for a moment — it never signs anyone out, resets a sign-in limit or touches the queue."
        actions={<Button onClick={reload}>Refresh</Button>}
      />

      {state.status === 'error' && (
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}

      {state.status === 'ready' && (
        <>
          <Alert
            type={state.data.redis.available ? 'success' : 'warning'}
            showIcon
            message={state.data.redis.available ? 'Cache connected' : 'Cache unavailable'}
            description={state.data.redis.detail}
            style={{ marginBottom: 16 }}
          />

          <Card title="Data this API holds" size="small" style={{ marginBottom: 24 }}>
            <Table<CacheNamespaceStatus>
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={state.data.namespaces}
              columns={[
                { title: 'Cache', dataIndex: 'label', width: 220 },
                { title: 'What it holds', dataIndex: 'description' },
                {
                  title: 'Entries',
                  dataIndex: 'entries',
                  width: 140,
                  render: (value: number | null) => (value === null ? '—' : <span>about {value.toLocaleString('en-AU')}</span>),
                },
                { title: 'Expires after', dataIndex: 'ttlSeconds', width: 130, render: (value: number) => `${value}s` },
                { title: 'Last cleared', dataIndex: 'lastClearedAt', width: 190, render: (value: string | null) => (value ? formatDateTime(value) : 'Never') },
                {
                  title: '',
                  width: 110,
                  render: (_: unknown, record) =>
                    mayClear ? (
                      <Button size="small" onClick={() => clear('namespace', record.key, record.label, 'These entries are rebuilt from the database the next time someone asks for them. Nothing is lost.')}>
                        Clear
                      </Button>
                    ) : null,
                },
              ]}
            />
            <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
              Entry counts are approximate: they are sampled and capped, not counted exactly.
            </Typography.Paragraph>
          </Card>

          <Card title="Public pages" size="small">
            <Table<CacheTagStatus>
              rowKey="key"
              size="small"
              pagination={false}
              dataSource={state.data.tags}
              columns={[
                { title: 'Pages', dataIndex: 'label', width: 220 },
                { title: 'What it covers', dataIndex: 'description' },
                { title: 'Last cleared', dataIndex: 'lastClearedAt', width: 190, render: (value: string | null) => (value ? formatDateTime(value) : 'Never') },
                {
                  title: '',
                  width: 110,
                  render: (_: unknown, record) =>
                    mayClear ? (
                      <Button size="small" onClick={() => clear('tag', record.key, record.label, 'These pages are refreshed in the background, the same way publishing refreshes them.')}>
                        Refresh
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Card>

          {!mayClear && (
            <Space style={{ marginTop: 16 }}>
              <Tag>You can see the caches but not clear them.</Tag>
            </Space>
          )}
        </>
      )}
    </div>
  );
}
