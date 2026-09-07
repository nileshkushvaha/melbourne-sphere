import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { useOnError } from '@refinedev/core';
import { useSearchParams } from 'react-router';
import { DELIVERY_STATUSES, HANDLING_STATUSES, enquiriesApi, type AdminEnquiry, type DeliveryStatus, type HandlingStatus } from '@/api/enquiries';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

const DELIVERY_COLOURS: Record<DeliveryStatus, string> = {
  queued: 'blue',
  providerAccepted: 'green',
  delivered: 'green',
  retrying: 'gold',
  failed: 'red',
  suppressed: 'orange',
};
const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  queued: 'queued',
  providerAccepted: 'accepted by provider',
  delivered: 'delivered',
  retrying: 'retrying',
  failed: 'failed',
  suppressed: 'suppressed',
};
const HANDLING_LABELS: Record<HandlingStatus, string> = { new: 'new', inProgress: 'in progress', closed: 'closed' };

/**
 * Enquiry handling (SRS ENQ 004/007). Delivery state and handling state are
 * shown separately: closing an enquiry never claims the email arrived.
 */
export function EnquiriesPage() {
  useDocumentTitle('Enquiries');
  const api = enquiriesApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const { can } = useCapabilities();
  const canManage = can(PERMISSION.enquiriesManage);
  const [params, setParams] = useSearchParams();
  const handlingStatus = (params.get('handlingStatus') as HandlingStatus | null) ?? undefined;
  const deliveryStatus = (params.get('deliveryStatus') as DeliveryStatus | null) ?? undefined;
  const page = Number(params.get('page') ?? '1') || 1;
  const [state, reload] = useAsync((signal) => api.list({ handlingStatus, deliveryStatus, page, pageSize: 20 }, signal), [handlingStatus, deliveryStatus, page]);
  const [retrying, setRetrying] = useState<AdminEnquiry | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [form] = Form.useForm<{ reason: string }>();

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const changeHandling = async (enquiry: AdminEnquiry, next: HandlingStatus) => {
    try {
      await api.setHandling(enquiry.id, { expectedVersion: enquiry.version, handlingStatus: next });
      message.success(`Marked ${HANDLING_LABELS[next]}`);
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const submitRetry = async () => {
    if (!retrying) return;
    setDialogError(null);
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.retry(retrying.id, { expectedVersion: retrying.version, reason: values.reason });
      message.success('Delivery re-queued');
      setRetrying(null);
      form.resetFields();
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else setDialogError(errorMessage(error));
    }
  };

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Community' }, { label: 'Enquiries' }]} title="Enquiries" description="Messages sent to businesses through the site. Delivery status describes the email; handling status is your own workflow. Closing an enquiry does not mean the email arrived." />
      <Space style={{ marginBottom: 16 }} wrap>
        <Select aria-label="Filter by handling status" allowClear placeholder="Any handling status" value={handlingStatus} onChange={(v) => setParam('handlingStatus', v)} style={{ width: 200 }} options={HANDLING_STATUSES.map((s) => ({ value: s, label: HANDLING_LABELS[s] }))} />
        <Select aria-label="Filter by delivery status" allowClear placeholder="Any delivery status" value={deliveryStatus} onChange={(v) => setParam('deliveryStatus', v)} style={{ width: 220 }} options={DELIVERY_STATUSES.map((s) => ({ value: s, label: DELIVERY_LABELS[s] }))} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<AdminEnquiry>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 1100 }}
        expandable={{
          expandedRowRender: (enquiry) => (
            <div style={{ maxWidth: 900 }}>
              <Typography.Paragraph strong>{enquiry.subject}</Typography.Paragraph>
              <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>{enquiry.message}</Typography.Paragraph>
              <Typography.Paragraph type="secondary">
                From {enquiry.name} · {enquiry.email}
                {enquiry.phone ? ` · ${enquiry.phone}` : ''} · acknowledged {enquiry.acknowledgedVersion}
                {enquiry.lastError ? ` · last error: ${enquiry.lastError}` : ''}
                {enquiry.suppressionReason ? ` · suppressed: ${enquiry.suppressionReason}` : ''}
              </Typography.Paragraph>
            </div>
          ),
        }}
        columns={[
          { title: 'Business', dataIndex: 'businessName', render: (v: string | null) => v ?? 'General enquiry' },
          { title: 'From', dataIndex: 'name' },
          { title: 'Subject', dataIndex: 'subject', ellipsis: true },
          { title: 'Delivery', dataIndex: 'deliveryStatus', render: (v: DeliveryStatus, e) => <Space size={4}><Tag color={DELIVERY_COLOURS[v]}>{DELIVERY_LABELS[v]}</Tag>{e.deliveryAttempts > 0 && <span>{e.deliveryAttempts} attempt{e.deliveryAttempts === 1 ? '' : 's'}</span>}</Space> },
          { title: 'Handling', dataIndex: 'handlingStatus', render: (v: HandlingStatus) => <Tag>{HANDLING_LABELS[v]}</Tag> },
          { title: 'Received', dataIndex: 'createdAt', render: formatDateTime },
          {
            title: <span className="sr-only">Actions</span>,
            width: 280,
            render: (_: unknown, enquiry) =>
              canManage ? (
                <Space wrap>
                  {enquiry.handlingStatus !== 'inProgress' && <Button size="small" onClick={() => void changeHandling(enquiry, 'inProgress')}>Start</Button>}
                  {enquiry.handlingStatus !== 'closed' && <Button size="small" onClick={() => void changeHandling(enquiry, 'closed')}>Close</Button>}
                  {(enquiry.deliveryStatus === 'failed' || enquiry.deliveryStatus === 'suppressed') && (
                    <Button size="small" type="primary" onClick={() => { setDialogError(null); form.resetFields(); setRetrying(enquiry); }}>
                      Retry delivery
                    </Button>
                  )}
                </Space>
              ) : null,
          },
        ]}
        locale={{ emptyText: state.status === 'ready' ? 'No enquiries match.' : ' ' }}
      />
      <Modal open={retrying !== null} title="Re-queue this delivery" okText="Retry delivery" onOk={() => void submitRetry()} onCancel={() => setRetrying(null)} destroyOnHidden>
        <Typography.Paragraph>The message is queued again. A provider timeout can mean the first attempt did arrive, so check with the business before retrying repeatedly.</Typography.Paragraph>
        {dialogError && <Alert type="error" showIcon role="alert" message={dialogError} style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item label="Reason (recorded in the audit log)" name="reason" rules={[{ required: true, min: 5, message: 'Give at least 5 characters' }]}>
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
