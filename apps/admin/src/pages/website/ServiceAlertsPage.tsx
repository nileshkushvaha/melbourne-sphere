import { Alert, App, Button, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { serviceAlertsApi, type AlertSeverity, type ServiceAlert } from '@/api/website';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader, TableCard, StatusTag } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const SEVERITY_COLOUR: Record<AlertSeverity, string> = { informational: 'blue', warning: 'gold', emergency: 'red' };

/**
 * Service alerts (SRS 1.2 ALRT 007). An alert renders above the header on every
 * public page, so publishing and unpublishing state that consequence before they
 * are confirmed. Times are entered and shown in Melbourne time and sent as
 * instants (ALRT 003).
 */
export function ServiceAlertsPage() {
  useDocumentTitle('Service alerts');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const status = (params.get('status') ?? '') as '' | 'draft' | 'published';

  const navigate = useNavigate();
  const [state, reload] = useAsync(() => serviceAlertsApi.list({ page, pageSize: 20, status: status || undefined }), [page, status]);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const setPublished = (record: ServiceAlert, published: boolean) => {
    modal.confirm({
      title: published ? 'Publish this alert?' : 'Unpublish this alert?',
      content: published
        ? 'It appears above the header on every public page, within its display window.'
        : 'It disappears from every public page immediately. Nothing is deleted.',
      okText: published ? 'Publish' : 'Unpublish',
      onOk: async () => {
        try {
          await serviceAlertsApi.setPublished(record.id, published, record.version);
          message.success(published ? 'Published' : 'Unpublished');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const remove = (record: ServiceAlert) => {
    modal.confirm({
      title: 'Delete this alert?',
      content: 'This cannot be undone. If you only want it off the site, unpublish it instead.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await serviceAlertsApi.remove(record.id);
          message.success('Deleted');
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
        crumbs={[{ label: 'Website' }, { label: 'Service alerts' }]}
        title="Service alerts"
        description="Notices above every public page. At most two show, most severe first."
        actions={
          can(PERMISSION.websiteAlertsCreate) ? (
            <Link to="/website/service-alerts/new">
              <Button type="primary" icon={<PlusOutlined />}>
                New alert
              </Button>
            </Link>
          ) : null
        }
      />

      <TableCard
        toolbar={
          <>
            <Select
              aria-label="Filter by status"
              placeholder="Status"
              allowClear
              value={status || undefined}
              style={{ width: 160 }}
              onChange={(value?: string) => setParam('status', value)}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ]}
            />
          </>
        }
      >

      {state.status === 'error' && (
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}

      <Table<ServiceAlert>
        rowKey="id"
        size="small"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        locale={{ emptyText: 'No alerts. Create one when something on the site needs explaining.' }}
        pagination={
          state.status === 'ready'
            ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) }
            : false
        }
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Severity', dataIndex: 'severity', width: 140, render: (value: AlertSeverity) => <Tag color={SEVERITY_COLOUR[value]}>{value}</Tag> },
          { title: 'Title', dataIndex: 'title' },
          {
            title: 'Window',
            width: 260,
            render: (_: unknown, record) =>
              record.startsAt || record.endsAt ? `${record.startsAt ? formatDateTime(record.startsAt) : 'now'} → ${record.endsAt ? formatDateTime(record.endsAt) : 'until removed'}` : 'Always',
          },
          { title: 'Status', dataIndex: 'status', width: 120, render: (value: string) => <StatusTag status={value} /> },
          {
            title: 'Actions',
            width: 260,
            render: (_: unknown, record) => (
              <Space size={4} wrap>
                {can(PERMISSION.websiteAlertsUpdate) && (
                  <Button size="small" onClick={() => navigate(`/website/service-alerts/${record.id}`)}>
                    Edit
                  </Button>
                )}
                {can(PERMISSION.websiteAlertsPublish) && (
                  <Button size="small" onClick={() => setPublished(record, record.status !== 'published')}>
                    {record.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                )}
                {can(PERMISSION.websiteAlertsDelete) && (
                  <Button size="small" danger onClick={() => remove(record)}>
                    Delete
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      </TableCard>
    </div>
  );
}
