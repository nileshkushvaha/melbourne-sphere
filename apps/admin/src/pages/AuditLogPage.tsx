import { DatePicker, Input, Select, Space, Table, Typography } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { adminsApi, auditApi, type AuditEntry } from '@/api/admins';
import { melbourneLocalToUtc, melbourneOffsetLabel } from '@/api/blog';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { ErrorState, ListEmpty, PageHeader, Pill, StatusTag, TableCard } from '@/components/ui';
import { RemoteSelect } from '@/components/RemoteSelect';
import { tablePagination } from '@/shared/tablePagination';
import { useListParams } from '@/shared/useListParams';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { readableAction, readableTargetType } from '@/shared/activity';
import { brand } from '@/config/theme';

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
const FILTERS = ['action', 'category', 'outcome', 'requestId', 'actor', 'from', 'to'] as const;

/**
 * The consolidated activity log (SRS 1.2 ACT 001–005). One surface for
 * administrative actions, authorization changes and operational events: they
 * share a store, and the server gives each event a category and an outcome from
 * the activity catalogue. Read-only — nothing here edits or deletes an event.
 *
 * The questions actually asked of an audit log are "what happened on Tuesday"
 * and "what has this person been doing": the API has always accepted a date
 * range and an actor, and this screen now offers both. Dates are entered and
 * read in Melbourne time (NFR 012) and converted once, here, so a range never
 * means a different day to the reader than it does to the server.
 *
 * The forensic detail — request id, address, and whatever the event recorded —
 * moves into an expandable row rather than a column of raw JSON. It is still
 * there for an investigation; it is no longer in the way of reading the list.
 */
export function AuditLogPage() {
  useDocumentTitle('Activity log');
  const list = useListParams(FILTERS);
  const page = list.page;
  const action = list.get('action') ?? '';
  const category = list.get('category') ?? '';
  const outcome = list.get('outcome') ?? '';
  const requestId = list.get('requestId') ?? '';
  const actor = list.get('actor') ?? '';
  const from = list.get('from') ?? '';
  const to = list.get('to') ?? '';
  const offset = melbourneOffsetLabel(new Date());

  const [state, reload] = useAsync(
    (signal) =>
      auditApi.list(
        {
          page,
          pageSize: list.pageSize,
          action: action || undefined,
          category: category || undefined,
          outcome: (outcome || undefined) as 'success' | 'failure' | undefined,
          requestId: requestId || undefined,
          actorAdminId: actor || undefined,
          // A day chosen on screen is a Melbourne day: it starts at midnight
          // there and ends a minute before the next one, whatever the reader's
          // own clock says.
          from: from ? (melbourneLocalToUtc(`${from}T00:00`)?.toISOString() ?? undefined) : undefined,
          to: to ? (melbourneLocalToUtc(`${to}T23:59`)?.toISOString() ?? undefined) : undefined,
        },
        signal,
      ),
    [page, list.pageSize, action, category, outcome, requestId, actor, from, to],
  );

  const range: [Dayjs | null, Dayjs | null] = [from ? dayjs(from) : null, to ? dayjs(to) : null];

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
              style={{ width: 170 }}
              onChange={(value?: string) => list.set('outcome', value)}
              options={[
                { value: 'success', label: 'Succeeded' },
                { value: 'failure', label: 'Refused or failed' },
              ]}
            />
            <RemoteSelect
              ariaLabel="Filter by who did it"
              placeholder="Anyone"
              value={actor || undefined}
              onChange={(value) => list.set('actor', value)}
              width={230}
              search={(term, signal) =>
                adminsApi
                  .list({ q: term || undefined, pageSize: 20, sort: 'displayName', order: 'asc' }, signal)
                  .then((result) => result.data.map((row) => ({ value: row.id, label: `${row.displayName} (${row.email})` })))
              }
            />
            <DatePicker.RangePicker
              aria-label={`Limit to a date range, Melbourne time (${offset})`}
              value={range}
              format="DD MMM YYYY"
              allowEmpty={[true, true]}
              onChange={(values) => {
                list.set('from', values?.[0] ? values[0].format('YYYY-MM-DD') : undefined);
                list.set('to', values?.[1] ? values[1].format('YYYY-MM-DD') : undefined);
              }}
            />
            <Input.Search
              aria-label="Filter by action (e.g. auth.* or admin.create)"
              placeholder="Action, e.g. auth.*"
              allowClear
              defaultValue={action}
              onSearch={(v) => list.set('action', v.trim() || undefined)}
              style={{ width: 220 }}
            />
            <Input.Search
              aria-label="Find every event from one request id"
              placeholder="Request id"
              allowClear
              defaultValue={requestId}
              onSearch={(v) => list.set('requestId', v.trim() || undefined)}
              style={{ width: 220 }}
            />
          </>
        }
        summary={state.status === 'ready' ? `${state.data.meta.total} event${state.data.meta.total === 1 ? '' : 's'}${list.filtered ? ' matching your filters' : ''}` : undefined}
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
            ? tablePagination(state.data.meta, list)
            : false
        }
        scroll={{ x: 1000 }}
        expandable={{
          // The exact code, the request it belonged to and whatever the event
          // recorded: needed during an investigation, noise the rest of the time.
          expandedRowRender: (row) => <EventDetail entry={row} />,
          rowExpandable: () => true,
        }}
        columns={[
          { title: 'When', dataIndex: 'createdAt', render: formatDateTime, width: 180 },
          {
            title: 'Area',
            dataIndex: 'domainLabel',
            width: 190,
            render: (value: string | undefined, r) => <Pill tone="neutral">{value ?? CATEGORY_LABEL[r.category ?? 'unknown'] ?? 'Uncategorised'}</Pill>,
          },
          { title: 'What happened', render: (_: unknown, r) => readableAction(r.action) },
          {
            title: 'Outcome',
            dataIndex: 'outcome',
            width: 120,
            render: (value: string | undefined) => <StatusTag status={value === 'failure' ? 'failure' : 'success'} />,
          },
          {
            title: 'Who',
            width: 220,
            render: (_: unknown, r) =>
              r.actor ? (
                <Space direction="vertical" size={0}>
                  <span>{r.actor.displayName}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {r.actor.email}
                  </Typography.Text>
                </Space>
              ) : (
                <Typography.Text type="secondary">The system itself</Typography.Text>
              ),
          },
          {
            title: 'What it was done to',
            width: 230,
            render: (_: unknown, r) => (r.targetType ? readableTargetType(r.targetType) : <Typography.Text type="secondary">—</Typography.Text>),
          },
        ]}
      />
      </TableCard>
    </div>
  );
}

/** The forensic detail of one event, shown when its row is expanded. */
function EventDetail({ entry }: { entry: AuditEntry }) {
  const rows: Array<[string, string]> = [
    ['Recorded action', entry.action],
    ['Recorded at', `${formatDateTime(entry.createdAt)} (Melbourne time)`],
  ];
  if (entry.targetType) rows.push(['Record affected', `${readableTargetType(entry.targetType)}${entry.targetId ? ` · ${entry.targetId}` : ''}`]);
  if (entry.reason) rows.push(['Reason given', entry.reason]);
  if (entry.requestId) rows.push(['Request id', entry.requestId]);
  if (entry.ipAddress) rows.push(['Address it came from', entry.ipAddress]);
  for (const [key, value] of Object.entries(entry.metadata ?? {})) {
    rows.push([readableTargetType(key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()), typeof value === 'string' ? value : JSON.stringify(value)]);
  }
  return (
    <dl style={{ display: 'grid', gridTemplateColumns: 'minmax(160px, max-content) 1fr', gap: '4px 16px', margin: 0 }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'contents' }}>
          <dt style={{ color: brand.textSubtle }}>{label}</dt>
          <dd style={{ margin: 0, wordBreak: 'break-word' }}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
