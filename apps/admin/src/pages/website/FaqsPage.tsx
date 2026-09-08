import { Alert, App, Button, Input, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { faqsApi, type Faq } from '@/api/website';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/**
 * Frequently asked questions (SRS 1.2 FAQ 002). Publication is an explicit
 * action, edits carry `expectedVersion`, and the answer is sanitised on the
 * server — this screen shows what was written, never what was rendered.
 */
export function FaqsPage() {
  useDocumentTitle('FAQs');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const status = (params.get('status') ?? '') as '' | 'draft' | 'published';
  const q = params.get('q') ?? '';

  const navigate = useNavigate();
  const [state, reload] = useAsync(() => faqsApi.list({ page, pageSize: 20, status: status || undefined, q: q || undefined }), [page, status, q]);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const setPublished = (record: Faq, published: boolean) => {
    modal.confirm({
      title: published ? 'Publish this question?' : 'Unpublish this question?',
      content: published ? 'It becomes visible on the public FAQ page immediately.' : 'It disappears from the public FAQ page immediately. Nothing is deleted.',
      okText: published ? 'Publish' : 'Unpublish',
      onOk: async () => {
        try {
          await faqsApi.setPublished(record.id, published, record.version);
          message.success(published ? 'Published' : 'Unpublished');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const remove = (record: Faq) => {
    modal.confirm({
      title: 'Delete this question?',
      content: 'This cannot be undone. If you only want it off the site, unpublish it instead.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await faqsApi.remove(record.id);
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
        crumbs={[{ label: 'Website' }, { label: 'FAQs' }]}
        title="FAQs"
        description="Questions and answers shown on the public FAQ page, in display order. Answers are sanitised on the server, so unsupported formatting is removed when you save."
        actions={
          can(PERMISSION.websiteFaqsCreate) ? (
            <Link to="/website/faqs/new">
              <Button type="primary" icon={<PlusOutlined />}>
                New question
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
        <Input.Search aria-label="Search questions" placeholder="Search questions" allowClear defaultValue={q} style={{ width: 280 }} onSearch={(value) => setParam('q', value.trim() || undefined)} />
      </Space>

      {state.status === 'error' && (
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}

      <Table<Faq>
        rowKey="id"
        size="small"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        locale={{ emptyText: 'No questions yet. Add the ones people actually ask.' }}
        pagination={
          state.status === 'ready'
            ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) }
            : false
        }
        scroll={{ x: 900 }}
        columns={[
          { title: 'Order', dataIndex: 'displayOrder', width: 80 },
          { title: 'Question', dataIndex: 'question' },
          { title: 'Group', dataIndex: 'groupName', width: 160, render: (v: string | null) => v ?? '—' },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 120,
            render: (value: string) => <Tag color={value === 'published' ? 'green' : 'default'}>{value}</Tag>,
          },
          { title: 'Updated', dataIndex: 'updatedAt', width: 180, render: formatDateTime },
          {
            title: 'Actions',
            width: 260,
            render: (_: unknown, record) => (
              <Space size={4} wrap>
                {can(PERMISSION.websiteFaqsUpdate) && (
                  <Button size="small" onClick={() => navigate(`/website/faqs/${record.id}`)}>
                    Edit
                  </Button>
                )}
                {can(PERMISSION.websiteFaqsPublish) && (
                  <Button size="small" onClick={() => setPublished(record, record.status !== 'published')}>
                    {record.status === 'published' ? 'Unpublish' : 'Publish'}
                  </Button>
                )}
                {can(PERMISSION.websiteFaqsDelete) && (
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
