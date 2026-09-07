import { Alert, Button, Input, Space, Table } from 'antd';
import { useSearchParams } from 'react-router';
import { auditApi, type AuditEntry } from '@/api/admins';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

export function AuditLogPage() {
  useDocumentTitle('Audit log');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const action = params.get('action') ?? '';
  const [state, reload] = useAsync(() => auditApi.list({ page, pageSize: 25, action: action || undefined }), [page, action]);
  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'Audit log' }]}
        title="Audit log"
        description="Every administrator action, with the actor, target and request id. Entries are never edited or deleted."
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search aria-label="Filter by action (e.g. auth.* or admin.create)" placeholder="Action, e.g. auth.*" allowClear defaultValue={action} onSearch={(v) => setParam('action', v.trim() || undefined)} style={{ width: 280 }} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<AuditEntry>
        rowKey="id"
        size="small"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'When', dataIndex: 'createdAt', render: formatDateTime, width: 180 },
          { title: 'Action', dataIndex: 'action' },
          { title: 'Actor', dataIndex: 'actor', render: (a: AuditEntry['actor']) => (a ? `${a.displayName} (${a.email})` : 'system') },
          { title: 'Target', render: (_: unknown, r) => (r.targetType ? `${r.targetType} ${r.targetId ?? ''}` : '—') },
          { title: 'Details', render: (_: unknown, r) => [r.reason, r.metadata ? JSON.stringify(r.metadata) : null].filter(Boolean).join(' · ') || '—' },
          { title: 'IP', dataIndex: 'ipAddress', render: (v: string | null) => v ?? '—' },
        ]}
      />
    </div>
  );
}
