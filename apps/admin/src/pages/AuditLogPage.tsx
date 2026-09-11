import { Alert, Button, Input, Select, Table, Tag } from 'antd';
import { useSearchParams } from 'react-router';
import { auditApi, type AuditEntry } from '@/api/admins';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { PageHeader, TableCard } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const CATEGORIES = ['authentication', 'access_control', 'content', 'moderation', 'communication', 'configuration', 'system'] as const;

const CATEGORY_LABEL: Record<string, string> = {
  authentication: 'Authentication',
  access_control: 'Access control',
  content: 'Content',
  moderation: 'Moderation',
  communication: 'Communication',
  configuration: 'Configuration',
  system: 'System',
  unknown: 'Uncategorised',
};

/**
 * The consolidated activity log (SRS 1.2 ACT 001–005). One surface for
 * administrative actions, authorization changes and operational events: they
 * share a store, and the server gives each event a category and an outcome from
 * the activity catalogue. Read-only — nothing here edits or deletes an event.
 */
export function AuditLogPage() {
  useDocumentTitle('Activity log');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const action = params.get('action') ?? '';
  const category = params.get('category') ?? '';
  const outcome = params.get('outcome') ?? '';
  const requestId = params.get('requestId') ?? '';

  const [state, reload] = useAsync(
    () =>
      auditApi.list({
        page,
        pageSize: 25,
        action: action || undefined,
        category: category || undefined,
        outcome: (outcome || undefined) as 'success' | 'failure' | undefined,
        requestId: requestId || undefined,
      }),
    [page, action, category, outcome, requestId],
  );

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
        crumbs={[{ label: 'Configuration' }, { label: 'Activity log' }]}
        title="Activity log"
        description="Every change and operational event, with who did it. Entries are never edited or deleted."
      />
      <TableCard
        toolbar={
          <>
            <Select
              aria-label="Filter by category"
              placeholder="Category"
              allowClear
              value={category || undefined}
              style={{ width: 180 }}
              onChange={(value?: string) => setParam('category', value)}
              options={CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }))}
            />
            <Select
              aria-label="Filter by outcome"
              placeholder="Outcome"
              allowClear
              value={outcome || undefined}
              style={{ width: 150 }}
              onChange={(value?: string) => setParam('outcome', value)}
              options={[
                { value: 'success', label: 'Succeeded' },
                { value: 'failure', label: 'Refused or failed' },
              ]}
            />
            <Input.Search
              aria-label="Filter by action (e.g. auth.* or admin.create)"
              placeholder="Action, e.g. auth.*"
              allowClear
              defaultValue={action}
              onSearch={(v) => setParam('action', v.trim() || undefined)}
              style={{ width: 240 }}
            />
            <Input.Search
              aria-label="Find every event from one request id"
              placeholder="Request id"
              allowClear
              defaultValue={requestId}
              onSearch={(v) => setParam('requestId', v.trim() || undefined)}
              style={{ width: 240 }}
            />
          </>
        }
      >
      {state.status === 'error' && (
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}
      <Table<AuditEntry>
        rowKey="id"
        size="small"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        locale={{ emptyText: 'No activity matches these filters.' }}
        pagination={
          state.status === 'ready'
            ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) }
            : false
        }
        scroll={{ x: 1100 }}
        columns={[
          { title: 'When', dataIndex: 'createdAt', render: formatDateTime, width: 180 },
          {
            title: 'Category',
            dataIndex: 'category',
            width: 150,
            render: (value: string | undefined, r) => <Tag>{CATEGORY_LABEL[value ?? 'unknown'] ?? r.domainLabel ?? 'Uncategorised'}</Tag>,
          },
          { title: 'Action', dataIndex: 'action' },
          {
            title: 'Outcome',
            dataIndex: 'outcome',
            width: 120,
            render: (value: string | undefined) => (value === 'failure' ? <Tag color="red">Refused</Tag> : <Tag color="green">Succeeded</Tag>),
          },
          { title: 'Actor', render: (_: unknown, r) => (r.actor ? `${r.actor.displayName} (${r.actor.email})` : 'system') },
          { title: 'Target', render: (_: unknown, r) => (r.targetType ? `${r.targetType} ${r.targetId ?? ''}` : '—') },
          { title: 'Details', render: (_: unknown, r) => [r.reason, r.metadata ? JSON.stringify(r.metadata) : null].filter(Boolean).join(' · ') || '—' },
          { title: 'Request', dataIndex: 'requestId', width: 140, render: (v: string | null) => v ?? '—' },
          { title: 'IP', dataIndex: 'ipAddress', render: (v: string | null) => v ?? '—' },
        ]}
      />
      </TableCard>
    </div>
  );
}
