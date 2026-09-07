import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { FlagOutlined, WarningOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { useSearchParams } from 'react-router';
import { moderationApi, REVIEW_STATUSES, type AdminReview, type ReviewDecision, type ReviewStatus } from '@/api/moderation';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const STATUS_COLOURS: Record<ReviewStatus, string> = { pending: 'gold', approved: 'green', rejected: 'default', spam: 'red' };
const DECISION_LABELS: Record<ReviewDecision, { title: string; hint: string; danger?: boolean; reasonRequired: boolean }> = {
  approve: { title: 'Publish this review?', hint: 'It becomes visible on the business page and counts towards the rating.', reasonRequired: false },
  reject: { title: 'Reject this review?', hint: 'It stays out of public view and the rating. The original text is kept for the record.', danger: true, reasonRequired: true },
  spam: { title: 'Mark this review as spam?', hint: 'Same as rejecting, but recorded as spam for abuse signals.', danger: true, reasonRequired: true },
};

/**
 * Review moderation queue (SRS REV 003). Decisions carry the record version and
 * a reason; aggregates are maintained by the API inside the same transaction.
 */
export function ReviewsPage() {
  useDocumentTitle('Reviews');
  const api = moderationApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as ReviewStatus | null) ?? undefined;
  const repeatFlagged = params.get('repeatFlagged') === 'true';
  const reported = params.get('reported') === 'true';
  const page = Number(params.get('page') ?? '1') || 1;
  const [state, reload] = useAsync((signal) => api.listReviews({ status, repeatFlagged: repeatFlagged || undefined, reported: reported || undefined, page, pageSize: 20 }, signal), [status, repeatFlagged, reported, page]);
  const [pending, setPending] = useState<{ review: AdminReview; decision: ReviewDecision } | null>(null);
  const [redacting, setRedacting] = useState<AdminReview | null>(null);
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

  const handleError = (error: unknown, fallback: string) => {
    if (isApiError(error) && error.kind === 'unauthorized') {
      onAuthError(error);
      return;
    }
    if (isApiError(error) && (error.code === 'STALE_VERSION' || error.code === 'INVALID_STATE')) {
      setDialogError(`${error.userMessage} Reload the queue to see the current state.`);
      return;
    }
    const errors = fieldErrors(error);
    setDialogError(Object.values(errors).flat()[0] ?? errorMessage(error) ?? fallback);
  };

  const submitDecision = async () => {
    if (!pending) return;
    setDialogError(null);
    const values = await decisionForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.decide(pending.review.id, pending.decision, { expectedVersion: pending.review.version, reason: values.reason || undefined });
      message.success(`Review ${pending.decision === 'approve' ? 'published' : pending.decision === 'reject' ? 'rejected' : 'marked as spam'}`);
      setPending(null);
      decisionForm.resetFields();
      reload();
    } catch (error) {
      handleError(error, 'The decision could not be saved.');
    }
  };

  const submitRedaction = async () => {
    if (!redacting) return;
    setDialogError(null);
    const values = await redactForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.redact(redacting.id, { expectedVersion: redacting.version, publicText: values.publicText?.trim() ? values.publicText : null, reason: values.reason });
      message.success('Published text updated');
      setRedacting(null);
      redactForm.resetFields();
      reload();
    } catch (error) {
      handleError(error, 'The redaction could not be saved.');
    }
  };

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Community' }, { label: 'Reviews' }]} title="Reviews" description="Reviews arrive pending and are never published automatically. Rejecting keeps the original text for the record; ratings are never edited." />
      <Space style={{ marginBottom: 16 }} wrap>
        <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => setParam('status', v)} style={{ width: 160 }} options={REVIEW_STATUSES.map((s) => ({ value: s, label: s }))} />
        <Select aria-label="Filter by flag" allowClear placeholder="Any flag" value={repeatFlagged ? 'repeat' : reported ? 'reported' : undefined} style={{ width: 190 }} onChange={(v) => { setParam('repeatFlagged', v === 'repeat' ? 'true' : undefined); setParam('reported', v === 'reported' ? 'true' : undefined); }} options={[{ value: 'repeat', label: 'Repeat submissions' }, { value: 'reported', label: 'Has open reports' }]} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<AdminReview>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 1100 }}
        expandable={{
          expandedRowRender: (review) => (
            <div style={{ maxWidth: 900 }}>
              <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{review.originalText}</Typography.Paragraph>
              {review.publicText && (
                <Alert type="info" showIcon message="Published text differs from the original" description={<span style={{ whiteSpace: 'pre-line' }}>{review.publicText}{review.redactionReason ? ` — ${review.redactionReason}` : ''}</span>} />
              )}
              <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
                Contact: {review.email} · acknowledged {review.acknowledgedVersion}
                {review.moderationReason ? ` · reason: ${review.moderationReason}` : ''}
              </Typography.Paragraph>
            </div>
          ),
        }}
        columns={[
          { title: 'Business', dataIndex: 'businessName' },
          { title: 'Rating', dataIndex: 'rating', width: 90, render: (v: number) => `${v} / 5` },
          { title: 'Reviewer', dataIndex: 'displayName' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (v: ReviewStatus, review) => (
              <Space size={4}>
                <Tag color={STATUS_COLOURS[v]}>{v}</Tag>
                {review.repeatFlagged && (
                  <Tooltip title="Same email reviewed this business within 30 days">
                    <FlagOutlined aria-label="Repeat submission" style={{ color: '#d46b08' }} />
                  </Tooltip>
                )}
                {review.openReportCount > 0 && (
                  <Tooltip title={`${review.openReportCount} open report(s)`}>
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
            render: (_: unknown, review) => (
              <Space wrap>
                {review.status !== 'approved' && <Button size="small" type="primary" onClick={() => { setDialogError(null); decisionForm.resetFields(); setPending({ review, decision: 'approve' }); }}>Publish</Button>}
                {review.status !== 'rejected' && <Button size="small" danger onClick={() => { setDialogError(null); decisionForm.resetFields(); setPending({ review, decision: 'reject' }); }}>Reject</Button>}
                {review.status !== 'spam' && <Button size="small" onClick={() => { setDialogError(null); decisionForm.resetFields(); setPending({ review, decision: 'spam' }); }}>Spam</Button>}
                <Button size="small" onClick={() => { setDialogError(null); redactForm.setFieldsValue({ publicText: review.publicText ?? review.originalText, reason: '' }); setRedacting(review); }}>Redact</Button>
              </Space>
            ),
          },
        ]}
        locale={{ emptyText: state.status === 'ready' ? 'No reviews match.' : ' ' }}
      />
      <Modal open={pending !== null} title={pending ? DECISION_LABELS[pending.decision].title : ''} okText="Confirm" okButtonProps={{ danger: pending ? DECISION_LABELS[pending.decision].danger : false }} onOk={() => void submitDecision()} onCancel={() => setPending(null)} destroyOnHidden>
        {pending && <Typography.Paragraph>{DECISION_LABELS[pending.decision].hint}</Typography.Paragraph>}
        {dialogError && <Alert type="error" showIcon role="alert" message={dialogError} style={{ marginBottom: 12 }} />}
        <Form form={decisionForm} layout="vertical" requiredMark={false}>
          <Form.Item label="Reason (recorded in the audit log)" name="reason" rules={pending && DECISION_LABELS[pending.decision].reasonRequired ? [{ required: true, message: 'A reason is required' }] : undefined}>
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={redacting !== null} title="Edit the published text" okText="Save" onOk={() => void submitRedaction()} onCancel={() => setRedacting(null)} destroyOnHidden>
        <Typography.Paragraph>The original submission is always kept. Clear the field to publish the original again. The rating cannot be changed.</Typography.Paragraph>
        {dialogError && <Alert type="error" showIcon role="alert" message={dialogError} style={{ marginBottom: 12 }} />}
        <Form form={redactForm} layout="vertical" requiredMark={false}>
          <Form.Item label="Published text" name="publicText">
            <Input.TextArea rows={5} maxLength={3000} />
          </Form.Item>
          <Form.Item label="Reason" name="reason" rules={[{ required: true, min: 5, message: 'Give at least 5 characters' }]}>
            <Input maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
