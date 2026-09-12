import { Input, Select, Table, Tag } from 'antd';
import { auditApi, type AuditEntry } from '@/api/admins';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { ErrorState, ListEmpty, PageHeader, StatusTag, TableCard } from '@/components/ui';
import { useListParams } from '@/shared/useListParams';
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

/** The parameters that narrow this list; everything else is sort or page. */
const FILTERS = ['action', 'category', 'outcome', 'requestId'] as const;

/**
 * The consolidated activity log (SRS 1.2 ACT 001–005). One surface for
 * administrative actions, authorization changes and operational events: they
 * share a store, and the server gives each event a category and an outcome from
 * the activity catalogue. Read-only — nothing here edits or deletes an event.
 */
export function AuditLogPage() {
  useDocumentTitle('Activity log');
  const list = useListParams(FILTERS);
  const page = list.page;
  const action = list.get('action') ?? '';
  const category = list.get('category') ?? '';
  const outcome = list.get('outcome') ?? '';
  const requestId = list.get('requestId') ?? '';

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
              onChange={(value?: string) => list.set('category', value)}
              options={CATEGORIES.map((value) => ({ value, label: CATEGORY_LABEL[value] }))}
            />
            <Select
              aria-label="Filter by outcome"
              placeholder="Outcome"
              allowClear
              value={outcome || undefined}
              style={{ width: 150 }}
              onChange={(value?: string) => list.set('outcome', value)}
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
              onSearch={(v) => list.set('action', v.trim() || undefined)}
              style={{ width: 240 }}
            />
            <Input.Search
              aria-label="Find every event from one request id"
              placeholder="Request id"
              allowClear
              defaultValue={requestId}
              onSearch={(v) => list.set('requestId', v.trim() || undefined)}
              style={{ width: 240 }}
            />
          </>
        }
      >
      {state.status === 'error' && <ErrorState message={state.message} reference={state.reference} onRetry={reload} />}
      <Table<AuditEntry>
        rowKey="id"
        size="small"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        locale={{
          emptyText: (
            <ListEmpty state={state} filtered={list.filtered} noun="activity" onClear={list.clear} empty={{ title: 'No activity recorded yet', description: 'Every change an administrator makes is recorded here.' }} />
          ),
        }}
        pagination={
          state.status === 'ready'
            ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => list.setPage(p) }
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
            render: (value: string | undefined) => <StatusTag status={value === 'failure' ? 'failure' : 'success'} />,
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
