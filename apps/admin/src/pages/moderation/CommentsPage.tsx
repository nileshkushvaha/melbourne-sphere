import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { useSearchParams } from 'react-router';
import { REVIEW_STATUSES, moderationApi, type AdminComment, type ReviewDecision, type ReviewStatus } from '@/api/moderation';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const STATUS_COLOURS: Record<ReviewStatus, string> = { pending: 'gold', approved: 'green', rejected: 'default', spam: 'red' };
const DECISIONS: Record<ReviewDecision, { title: string; hint: string; danger?: boolean; reasonRequired: boolean }> = {
  approve: { title: 'Publish this comment?', hint: 'It appears under the article immediately.', reasonRequired: false },
  reject: { title: 'Reject this comment?', hint: 'It stays hidden. The original text is kept for the record.', danger: true, reasonRequired: true },
  spam: { title: 'Mark this comment as spam?', hint: 'Same as rejecting, but recorded as spam for abuse signals.', danger: true, reasonRequired: true },
};

/** Comment moderation (SRS COM 001): the same states and rules as reviews. */
export function CommentsPage() {
  useDocumentTitle('Comments');
  const api = moderationApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as ReviewStatus | null) ?? undefined;
  const reported = params.get('reported') === 'true';
  const page = Number(params.get('page') ?? '1') || 1;
  const [state, reload] = useAsync((signal) => api.listComments({ status, reported: reported || undefined, page, pageSize: 20 }, signal), [status, reported, page]);
  const [pending, setPending] = useState<{ comment: AdminComment; decision: ReviewDecision } | null>(null);
  const [redacting, setRedacting] = useState<AdminComment | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [decisionForm] = Form.useForm<{ reason?: string }>();
  const [redactForm] = Form.useForm<{ publicText: string; reason: string }>();

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

  const submitDecision = async () => {
    if (!pending) return;
    setDialogError(null);
    const values = await decisionForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.decideComment(pending.comment.id, pending.decision, { expectedVersion: pending.comment.version, reason: values.reason || undefined });
      message.success(`Comment ${pending.decision === 'approve' ? 'published' : pending.decision === 'reject' ? 'rejected' : 'marked as spam'}`);
      setPending(null);
      decisionForm.resetFields();
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const submitRedaction = async () => {
    if (!redacting) return;
    setDialogError(null);
    const values = await redactForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.redactComment(redacting.id, { expectedVersion: redacting.version, publicText: values.publicText?.trim() ? values.publicText : null, reason: values.reason });
      message.success('Published text updated');
      setRedacting(null);
      redactForm.resetFields();
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Community' }, { label: 'Comments' }]} title="Comments" description="Comments arrive pending and never appear automatically. Rejecting keeps the original text for the record." />
      <Space style={{ marginBottom: 16 }} wrap>
        <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => setParam('status', v)} style={{ width: 160 }} options={REVIEW_STATUSES.map((s) => ({ value: s, label: s }))} />
        <Select aria-label="Filter by reports" allowClear placeholder="Any" value={reported ? 'reported' : undefined} onChange={(v) => setParam('reported', v ? 'true' : undefined)} style={{ width: 190 }} options={[{ value: 'reported', label: 'Has open reports' }]} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<AdminComment>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 1000 }}
        expandable={{
          expandedRowRender: (comment) => (
            <div style={{ maxWidth: 900 }}>
              <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{comment.originalText}</Typography.Paragraph>
              {comment.publicText && <Alert type="info" showIcon message="Published text differs from the original" description={comment.publicText} />}
              <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                Contact: {comment.email} · acknowledged {comment.acknowledgedVersion}
                {comment.moderationReason ? ` · reason: ${comment.moderationReason}` : ''}
              </Typography.Paragraph>
            </div>
          ),
        }}
        columns={[
          { title: 'Article', dataIndex: 'postTitle', ellipsis: true },
          { title: 'From', dataIndex: 'displayName' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (v: ReviewStatus, comment) => (
              <Space size={4}>
                <Tag color={STATUS_COLOURS[v]}>{v}</Tag>
                {comment.openReportCount > 0 && (
                  <Tooltip title={`${comment.openReportCount} open report(s)`}>
                    <WarningOutlined aria-label="Reported" style={{ color: '#b91c1c' }} />
                  </Tooltip>
                )}
              </Space>
            ),
          },
          { title: 'Submitted', dataIndex: 'createdAt', render: formatDateTime },
          {
            title: <span className="sr-only">Actions</span>,
            width: 260,
            render: (_: unknown, comment) => (
              <Space wrap>
                {comment.status !== 'approved' && <Button size="small" type="primary" onClick={() => { setDialogError(null); decisionForm.resetFields(); setPending({ comment, decision: 'approve' }); }}>Publish</Button>}
                {comment.status !== 'rejected' && <Button size="small" danger onClick={() => { setDialogError(null); decisionForm.resetFields(); setPending({ comment, decision: 'reject' }); }}>Reject</Button>}
                {comment.status !== 'spam' && <Button size="small" onClick={() => { setDialogError(null); decisionForm.resetFields(); setPending({ comment, decision: 'spam' }); }}>Spam</Button>}
                <Button size="small" onClick={() => { setDialogError(null); redactForm.setFieldsValue({ publicText: comment.publicText ?? comment.originalText, reason: '' }); setRedacting(comment); }}>Redact</Button>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: state.status === 'ready' ? 'No comments match.' : ' ' }}
      />
      <Modal open={pending !== null} title={pending ? DECISIONS[pending.decision].title : ''} okText="Confirm" okButtonProps={{ danger: pending ? DECISIONS[pending.decision].danger : false }} onOk={() => void submitDecision()} onCancel={() => setPending(null)} destroyOnHidden>
        {pending && <Typography.Paragraph>{DECISIONS[pending.decision].hint}</Typography.Paragraph>}
        {dialogError && <Alert type="error" showIcon role="alert" message={dialogError} style={{ marginBottom: 12 }} />}
        <Form form={decisionForm} layout="vertical" requiredMark={false}>
          <Form.Item label="Reason (recorded in the audit log)" name="reason" rules={pending && DECISIONS[pending.decision].reasonRequired ? [{ required: true, message: 'A reason is required' }] : undefined}>
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={redacting !== null} title="Edit the published text" okText="Save" onOk={() => void submitRedaction()} onCancel={() => setRedacting(null)} destroyOnHidden>
        <Typography.Paragraph>The original comment is always kept. Clear the field to publish the original again.</Typography.Paragraph>
        {dialogError && <Alert type="error" showIcon role="alert" message={dialogError} style={{ marginBottom: 12 }} />}
        <Form form={redactForm} layout="vertical" requiredMark={false}>
          <Form.Item label="Published text" name="publicText">
            <Input.TextArea rows={4} maxLength={2000} />
          </Form.Item>
          <Form.Item label="Reason" name="reason" rules={[{ required: true, min: 5, message: 'Give at least 5 characters' }]}>
            <Input maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
