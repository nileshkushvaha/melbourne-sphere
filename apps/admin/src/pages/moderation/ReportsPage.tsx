import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useOnError } from '@refinedev/core';
import { Link, useSearchParams } from 'react-router';
import { moderationApi, REPORT_STATUSES, type AdminReport, type ReportOutcome, type ReportStatus } from '@/api/moderation';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const STATUS_COLOURS: Record<ReportStatus, string> = { open: 'red', investigating: 'gold', resolved: 'green' };
const OUTCOMES: { value: ReportOutcome; label: string }[] = [
  { value: 'retain', label: 'Retain the content' },
  { value: 'remove', label: 'Content should be removed' },
  { value: 'spam', label: 'Spam' },
];

/**
 * Abuse report queue (SRS REP 002). Resolving records the decision only;
 * removing a review remains a separate moderation action on the Reviews page.
 */
export function ReportsPage() {
  useDocumentTitle('Abuse reports');
  const api = moderationApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as ReportStatus | null) ?? undefined;
  const page = Number(params.get('page') ?? '1') || 1;
  const [state, reload] = useAsync((signal) => api.listReports({ status, page, pageSize: 20 }, signal), [status, page]);
  const [resolving, setResolving] = useState<AdminReport | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [form] = Form.useForm<{ outcome: ReportOutcome; note?: string }>();

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const handleError = (error: unknown) => {
    if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
    else if (isApiError(error) && (error.code === 'STALE_VERSION' || error.code === 'INVALID_STATE')) setDialogError(`${error.userMessage} Reload the queue to see the current state.`);
    else setDialogError(errorMessage(error));
  };

  const investigate = async (report: AdminReport) => {
    try {
      await api.investigate(report.id, report.version);
      message.success('Marked as investigating');
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const submitResolution = async () => {
    if (!resolving) return;
    setDialogError(null);
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.resolve(resolving.id, { expectedVersion: resolving.version, outcome: values.outcome, note: values.note || undefined });
      message.success('Report resolved');
      setResolving(null);
      form.resetFields();
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Community' }, { label: 'Abuse reports' }]} title="Abuse reports" description="Reports never remove content on their own. Record the outcome here, then reject or mark the review or comment as spam on its own queue if it should come down." />
      <Space style={{ marginBottom: 16 }} wrap>
        <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => setParam('status', v)} style={{ width: 180 }} options={REPORT_STATUSES.map((s) => ({ value: s, label: s }))} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<AdminReport>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 1000 }}
        expandable={{
          expandedRowRender: (report) => (
            <div style={{ maxWidth: 900 }}>
              <Typography.Paragraph strong>Reported content, as it appeared</Typography.Paragraph>
              <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{report.targetSnapshot}</Typography.Paragraph>
              {report.details && <Typography.Paragraph>Reporter’s note: {report.details}</Typography.Paragraph>}
              <Typography.Paragraph type="secondary">
                {report.reporterEmail ? `Reporter contact: ${report.reporterEmail}` : 'No reporter contact provided'}
                {report.resolutionNote ? ` · outcome note: ${report.resolutionNote}` : ''}
              </Typography.Paragraph>
            </div>
          ),
        }}
        columns={[
          { title: 'Reason', dataIndex: 'reason' },
          {
            title: 'Target',
            render: (_: unknown, report) => (
              <Link to={report.targetType === 'review' ? `/reviews?status=${report.targetStatus}` : `/comments?status=${report.targetStatus}`}>
                {report.targetType} {(report.reviewId ?? report.commentId ?? '').slice(-8)}
              </Link>
            ),
          },
          { title: 'Target status', dataIndex: 'targetStatus', render: (v: string) => <Tag>{v}</Tag> },
          { title: 'Status', dataIndex: 'status', render: (v: ReportStatus, report) => <Space size={4}><Tag color={STATUS_COLOURS[v]}>{v}</Tag>{report.outcome && <Tag>{report.outcome}</Tag>}</Space> },
          { title: 'Received', dataIndex: 'createdAt', render: formatDateTime },
          {
            title: <span className="sr-only">Actions</span>,
            width: 220,
            render: (_: unknown, report) => (
              <Space wrap>
                {report.status === 'open' && <Button size="small" onClick={() => void investigate(report)}>Investigate</Button>}
                {report.status !== 'resolved' && <Button size="small" type="primary" onClick={() => { setDialogError(null); form.resetFields(); setResolving(report); }}>Resolve</Button>}
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: state.status === 'ready' ? 'No reports match.' : ' ' }}
      />
      <Modal open={resolving !== null} title="Resolve this report" okText="Resolve" onOk={() => void submitResolution()} onCancel={() => setResolving(null)} destroyOnHidden>
        {dialogError && <Alert type="error" showIcon role="alert" message={dialogError} style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false} initialValues={{ outcome: 'retain' }}>
          <Form.Item label="Outcome" name="outcome" rules={[{ required: true, message: 'Choose an outcome' }]}>
            <Select options={OUTCOMES} />
          </Form.Item>
          <Form.Item label="Note (recorded in the audit log)" name="note">
            <Input.TextArea rows={3} maxLength={1000} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
