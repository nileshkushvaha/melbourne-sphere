import { Alert, App, Button, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { testimonialsApi, type Testimonial } from '@/api/website';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/**
 * Testimonials (SRS 1.2 TSTM 005). Approval is the point of this screen:
 * publication is refused until an administrator records who confirmed the quote
 * may be used, and editing the words clears that approval, because consent was
 * given for particular words.
 */
export function TestimonialsPage() {
  useDocumentTitle('Testimonials');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const status = (params.get('status') ?? '') as '' | 'draft' | 'published';

  const [state, reload] = useAsync(() => testimonialsApi.list({ page, pageSize: 20, status: status || undefined }), [page, status]);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const approve = (record: Testimonial) => {
    let note = '';
    modal.confirm({
      title: 'Record the approval',
      content: (
        <div>
          <p>Confirm that {record.displayName} agreed to this quote being published. Your name and the time are recorded.</p>
          <Input placeholder="How consent was given, e.g. Email 3 Sep 2026" maxLength={300} onChange={(event) => (note = event.target.value)} aria-label="How consent was given" />
        </div>
      ),
      okText: 'Record approval',
      onOk: async () => {
        try {
          await testimonialsApi.approve(record.id, record.version, note.trim() || null);
          message.success('Approval recorded');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const setPublished = (record: Testimonial, published: boolean) => {
    modal.confirm({
      title: published ? 'Publish this testimonial?' : 'Unpublish this testimonial?',
      content: published ? 'It appears on the public home page immediately.' : 'It disappears from the public home page immediately. Nothing is deleted.',
      okText: published ? 'Publish' : 'Unpublish',
      onOk: async () => {
        try {
          await testimonialsApi.setPublished(record.id, published, record.version);
          message.success(published ? 'Published' : 'Unpublished');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const remove = (record: Testimonial) => {
    modal.confirm({
      title: 'Delete this testimonial?',
      content: 'This cannot be undone, including the record of who approved it. If you only want it off the site, unpublish it instead.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await testimonialsApi.remove(record.id);
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
        crumbs={[{ label: 'Website' }, { label: 'Testimonials' }]}
        title="Testimonials"
        description="Quotes shown on the public home page. Recording who agreed to a quote is optional, but it is the only evidence you have if the person later objects."
        actions={
          can(PERMISSION.websiteTestimonialsCreate) ? (
            <Link to="/website/testimonials/new">
              <Button type="primary" icon={<PlusOutlined />}>
                New testimonial
              </Button>
            </Link>
          ) : null
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
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
      </Space>

      {state.status === 'error' && (
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}

      <Table<Testimonial>
        rowKey="id"
        size="small"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        locale={{ emptyText: 'No testimonials yet.' }}
        pagination={
          state.status === 'ready'
            ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) }
            : false
        }
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Order', dataIndex: 'displayOrder', width: 80 },
          { title: 'Name', dataIndex: 'displayName', width: 180 },
          { title: 'Quote', dataIndex: 'quote', render: (value: string) => <span>{value.length > 90 ? `${value.slice(0, 90)}…` : value}</span> },
          {
            title: 'Consent recorded',
            width: 200,
            render: (_: unknown, record) =>
              record.approvedAt ? (
                <Tooltip title={record.approvalNote ?? 'No note recorded'}>
                  <Tag color="green">{formatDateTime(record.approvedAt)}</Tag>
                </Tooltip>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
          { title: 'Status', dataIndex: 'status', width: 110, render: (value: string) => <Tag color={value === 'published' ? 'green' : 'default'}>{value}</Tag> },
          {
            title: 'Actions',
            width: 300,
            render: (_: unknown, record) => (
              <Space size={4} wrap>
                {can(PERMISSION.websiteTestimonialsUpdate) && (
                  <Button size="small" onClick={() => navigate(`/website/testimonials/${record.id}`)}>
                    Edit
                  </Button>
                )}
                {can(PERMISSION.websiteTestimonialsApprove) && !record.approvedAt && (
                  <Button size="small" onClick={() => approve(record)}>
                    Record consent
                  </Button>
                )}
                {can(PERMISSION.websiteTestimonialsPublish) && (
                  <Button size="small" onClick={() => setPublished(record, record.status !== 'published')}>
                    {record.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                )}
                {can(PERMISSION.websiteTestimonialsDelete) && (
                  <Button size="small" danger onClick={() => remove(record)}>
                    Delete
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
