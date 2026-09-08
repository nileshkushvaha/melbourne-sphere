import { useState } from 'react';
import { Alert, App, Button, Input, Popconfirm, Space, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { Link } from 'react-router';
import { isApiError } from '@/api/errors';
import { seoApi, type Redirect } from '@/api/seo';
import { EmptyState, PageHeader, StatusTag } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/**
 * Redirect rules (SRS SEO 004). Slug changes create these automatically; this
 * screen covers pages that moved or were deliberately removed.
 */
export function RedirectsPage() {
  useDocumentTitle('SEO redirects');
  const api = seoApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, reload] = useAsync((signal) => api.list({ q: search || undefined, page, pageSize: 25 }, signal), [search, page]);

  const remove = async (row: Redirect) => {
    try {
      await api.remove(row.id);
      message.success('Redirect deleted');
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const rows = state.status === 'ready' ? state.data.data : [];

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'SEO redirects' }]}
        title="SEO redirects"
        description="Old addresses that should send visitors and search engines somewhere else. Changing a published slug creates one of these automatically."
        actions={
          <Link to="/redirects/new">
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
              New redirect
            </Button>
          </Link>
        }
      />
      {state.status === 'error' && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />}
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          placeholder="Search a path"
          defaultValue={search}
          onSearch={(value) => {
            setPage(1);
            setSearch(value.trim());
          }}
          style={{ width: 320 }}
          aria-label="Search redirects"
        />
      </Space>
      <Table<Redirect>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={rows}
        scroll={{ x: 900 }}
        pagination={
          state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, onChange: setPage, showSizeChanger: false } : false
        }
        locale={{
          emptyText: state.status === 'ready' ? <EmptyState title="No redirects" description="Nothing has moved yet. Redirects appear here when a published address changes." /> : ' ',
        }}
        columns={[
          { title: 'From', dataIndex: 'sourcePath', render: (value: string) => <code>{value}</code> },
          {
            title: 'To',
            render: (_: unknown, row) => (row.targetPath ? <code>{row.targetPath}</code> : <Typography.Text type="secondary">Removed permanently</Typography.Text>),
          },
          { title: 'Type', render: (_: unknown, row) => <StatusTag status={row.kind === 'gone' ? 'gone' : 'active'} /> },
          { title: 'Reason', dataIndex: 'reason', render: (value: string | null) => value ?? '—' },
          { title: 'Created', dataIndex: 'createdAt', render: formatDateTime },
          {
            title: <span className="sr-only">Actions</span>,
            render: (_: unknown, row) => (
              <Popconfirm title="Delete this redirect?" description="Visitors following the old address will get a 404." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => void remove(row)}>
                <Button type="link" danger aria-label={`Delete redirect from ${row.sourcePath}`}>
                  Delete
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />
    </div>
  );
}
