import { useState } from 'react';
import { Alert, App, Button, Descriptions, Empty, Progress, Segmented, Space, Table, Tag, Typography } from 'antd';
import { queuesApi, type QueueJob, type QueueJobState, type QueueSummary } from '@/api/system';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader, SectionCard } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const STATES: { value: QueueJobState; label: string }[] = [
  { value: 'failed', label: 'Failed' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'active', label: 'Running' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'completed', label: 'Completed' },
];

/** Plain-language age, because "1757280000000" tells an operator nothing. */
function age(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 90) return `${seconds}s`;
  if (seconds < 5_400) return `${Math.round(seconds / 60)} min`;
  if (seconds < 172_800) return `${Math.round(seconds / 3600)} hours`;
  return `${Math.round(seconds / 86_400)} days`;
}

/**
 * Queue monitor (SRS 1.2 QMON 001–005).
 *
 * What is on screen is what the server chose to show: job payloads arrive
 * already reduced to allowlisted fields, so this page has nothing to hide and
 * no way to ask for more. Actions apply to the rows an operator has selected —
 * there is no "retry everything" — and each action reports what happened to
 * each item rather than one overall verdict.
 */
export function QueueMonitorPage() {
  useDocumentTitle('Queue monitor');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const [state, setState] = useState<QueueJobState>('failed');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);

  const [overview, reloadOverview] = useAsync(() => queuesApi.overview(), [reloadKey]);
  const queue: QueueSummary | null = overview.status === 'ready' ? (overview.data[0] ?? null) : null;
  const [jobs, reloadJobs] = useAsync(
    () => (queue ? queuesApi.jobs(queue.name, { state, page, pageSize: 20 }) : Promise.resolve(null)),
    [queue?.name, state, page, reloadKey],
  );

  const refresh = () => {
    setSelected([]);
    setReloadKey((key) => key + 1);
  };

  const report = (result: { requested: number; succeeded: string[]; failed: { id: string; reason: string }[] }, verb: string) => {
    if (result.failed.length === 0) message.success(`${verb} ${result.succeeded.length} of ${result.requested}`);
    else {
      message.warning(`${verb} ${result.succeeded.length} of ${result.requested}. ${result.failed.length} could not be: ${result.failed[0]!.reason}`);
    }
    refresh();
  };

  const act = (kind: 'retry' | 'remove') => {
    if (!queue || selected.length === 0) return;
    modal.confirm({
      title: kind === 'retry' ? `Retry ${selected.length} job${selected.length === 1 ? '' : 's'}?` : `Remove ${selected.length} job${selected.length === 1 ? '' : 's'}?`,
      content:
        kind === 'retry'
          ? 'Each job runs again from the beginning. A job that sends email may deliver a message that was already partly sent, so retry only what you know has not arrived.'
          : 'The work is discarded. Anything it would have done — an email, an image, a page refresh — will not happen, and nothing is queued in its place.',
      okText: kind === 'retry' ? 'Retry' : 'Remove',
      okButtonProps: kind === 'remove' ? { danger: true } : undefined,
      onOk: async () => {
        try {
          const result = kind === 'retry' ? await queuesApi.retry(queue.name, selected) : await queuesApi.remove(queue.name, selected);
          report(result, kind === 'retry' ? 'Retried' : 'Removed');
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const setPaused = (paused: boolean) => {
    if (!queue) return;
    modal.confirm({
      title: paused ? 'Pause this queue?' : 'Resume this queue?',
      content: paused ? queue.pauseConsequence : 'Waiting work starts again immediately, oldest first.',
      okText: paused ? 'Pause' : 'Resume',
      okButtonProps: paused ? { danger: true } : undefined,
      onOk: async () => {
        try {
          await queuesApi.setPaused(queue.name, paused);
          message.success(paused ? 'Queue paused' : 'Queue resumed');
          refresh();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const clean = () => {
    if (!queue) return;
    modal.confirm({
      title: 'Remove old completed job records?',
      content: 'Records of jobs that completed more than 7 days ago are deleted. Nothing that failed, and nothing more recent, is touched.',
      okText: 'Remove records',
      onOk: async () => {
        try {
          const { removed } = await queuesApi.clean(queue.name, 'completed', 24 * 7);
          message.success(`Removed ${removed} record${removed === 1 ? '' : 's'}`);
          refresh();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const columns = [
    { title: 'Job', dataIndex: 'label', width: 190, render: (_: unknown, row: QueueJob) => <Space direction="vertical" size={0}><span>{row.label}</span><Typography.Text type="secondary" style={{ fontSize: 12 }}>{row.id}</Typography.Text></Space> },
    {
      title: 'Details',
      key: 'data',
      render: (_: unknown, row: QueueJob) =>
        row.data.unrecognised ? (
          <Typography.Text type="secondary">Not shown — this job’s details are not in the display allowlist.</Typography.Text>
        ) : (
          <Space size={[12, 4]} wrap>
            {row.data.fields.map((field) => (
              <span key={field.label}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>{field.label}: </Typography.Text>
                {field.value}
              </span>
            ))}
          </Space>
        ),
    },
    { title: 'Attempts', dataIndex: 'attemptsMade', width: 100 },
    {
      title: 'Progress',
      key: 'progress',
      width: 130,
      render: (_: unknown, row: QueueJob) => (row.progress === null ? <Typography.Text type="secondary">—</Typography.Text> : <Progress percent={row.progress} size="small" />),
    },
    { title: 'Created', dataIndex: 'createdAt', width: 180, render: (value: string) => formatDateTime(value) },
    {
      title: 'Outcome',
      key: 'outcome',
      render: (_: unknown, row: QueueJob) => (row.failedReason ? <Typography.Text type="danger">{row.failedReason}</Typography.Text> : row.finishedAt ? formatDateTime(row.finishedAt) : <Typography.Text type="secondary">—</Typography.Text>),
    },
  ];

  const mayRetry = can(PERMISSION.systemQueuesRetry);
  const mayCancel = can(PERMISSION.systemQueuesCancel);

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'System' }, { label: 'Queue monitor' }]}
        title="Queue monitor"
        description="Background work waiting to run, running, or failed. Job details are reduced to the fields an operator needs; nothing here shows a visitor’s message, an address or a token."
        actions={
          <Space wrap>
            <Button onClick={refresh}>Refresh</Button>
            {queue?.pausable && can(PERMISSION.systemQueuesPause) && (
              <Button danger={!queue.paused} onClick={() => setPaused(!queue.paused)} disabled={!queue.available}>
                {queue.paused ? 'Resume queue' : 'Pause queue'}
              </Button>
            )}
          </Space>
        }
      />

      {overview.status === 'error' && (
        <Alert type="error" showIcon message={overview.message} description={overview.reference} action={<Button onClick={reloadOverview}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}

      {queue && (
        <>
          <Alert
            type={!queue.available ? 'warning' : queue.paused ? 'warning' : queue.workers.count === 0 ? 'info' : 'success'}
            showIcon
            style={{ marginBottom: 16 }}
            message={!queue.available ? 'Queue unreachable' : queue.paused ? 'Queue paused' : queue.workers.count === 0 ? 'No worker connected' : 'Processing normally'}
            description={!queue.available ? queue.detail : queue.paused ? queue.pauseConsequence : queue.workers.detail}
          />

          <SectionCard title={queue.label} description={queue.purpose}>
            <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }} items={[
              { key: 'waiting', label: 'Waiting', children: queue.counts?.waiting ?? '—' },
              { key: 'active', label: 'Running', children: queue.counts?.active ?? '—' },
              { key: 'delayed', label: 'Delayed', children: queue.counts?.delayed ?? '—' },
              { key: 'failed', label: 'Failed', children: queue.counts?.failed ?? '—' },
              { key: 'oldest', label: 'Oldest waiting', children: age(queue.oldestWaitingSeconds) },
              {
                key: 'workers',
                label: 'Workers',
                children: (
                  <Space size={6}>
                    {queue.workers.count}
                    <Tag>estimate</Tag>
                  </Space>
                ),
              },
            ]} />
          </SectionCard>

          <SectionCard
            title="Jobs"
            description="Select the jobs you want to act on. There is no action that applies to everything at once."
            extra={
              <Space wrap>
                {mayRetry && (
                  <Button disabled={selected.length === 0 || state !== 'failed'} onClick={() => act('retry')}>
                    Retry selected
                  </Button>
                )}
                {mayCancel && (
                  <Button danger disabled={selected.length === 0 || state === 'active' || state === 'completed'} onClick={() => act('remove')}>
                    Remove selected
                  </Button>
                )}
                {mayCancel && state === 'completed' && <Button onClick={clean}>Remove records older than 7 days</Button>}
              </Space>
            }
            bodyPadding={0}
          >
            <div style={{ padding: '12px 16px' }}>
              <Segmented
                value={state}
                onChange={(value) => {
                  setState(value as QueueJobState);
                  setPage(1);
                  setSelected([]);
                }}
                options={STATES.map((entry) => ({ value: entry.value, label: `${entry.label}${queue.counts ? ` (${queue.counts[entry.value]})` : ''}` }))}
              />
            </div>
            <Table<QueueJob>
              rowKey="id"
              size="middle"
              dataSource={jobs.status === 'ready' && jobs.data ? jobs.data.data : []}
              loading={jobs.status === 'loading'}
              columns={columns}
              locale={{ emptyText: <Empty description={`No ${STATES.find((entry) => entry.value === state)?.label.toLowerCase()} jobs`} /> }}
              rowSelection={
                mayRetry || mayCancel
                  ? {
                      selectedRowKeys: selected,
                      onChange: (keys) => setSelected(keys.map(String)),
                      // A checkbox with no name is announced as "checkbox" and
                      // nothing else; each row says which job it selects.
                      getCheckboxProps: (row) => ({ disabled: !row.canRetry && !row.canRemove, 'aria-label': `Select ${row.label} ${row.id}` }),
                    }
                  : undefined
              }
              pagination={
                jobs.status === 'ready' && jobs.data
                  ? { current: jobs.data.meta.page, pageSize: jobs.data.meta.pageSize, total: jobs.data.meta.total, showSizeChanger: false, onChange: setPage }
                  : false
              }
              scroll={{ x: 900 }}
            />
          </SectionCard>

          {jobs.status === 'error' && <Alert type="error" showIcon message={jobs.message} action={<Button onClick={reloadJobs}>Retry</Button>} style={{ marginTop: 16 }} />}
        </>
      )}
    </div>
  );
}
