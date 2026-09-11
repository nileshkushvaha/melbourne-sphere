import { App, Button, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import { pagesApi, type StaticPage } from '@/api/settings';
import { errorMessage } from '@/shared/useAsync';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader, StatusTag, PageLoadError } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/**
 * Website pages (SRS CFG 002, amended in SRS 1.6 and 1.7).
 *
 * Two kinds of row. The pages the product refers to by address — About and the
 * three policies — are always listed, whether or not anyone has written them,
 * and cannot be deleted or renamed. Everything below them is a page an
 * administrator created and may delete. Each opens on its own route, and the
 * list says plainly which are not publishable yet and why.
 */
export function PagesPage() {
  useDocumentTitle('Pages');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const canManage = can(PERMISSION.settingsManage);
  const [state, reload] = useAsync((signal) => pagesApi().list(signal), []);

  const remove = (page: StaticPage) => {
    modal.confirm({
      title: `Delete “${page.title}”?`,
      content: 'The page and its revision history are removed. This cannot be undone; the address becomes a 404 for anyone who saved it.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await pagesApi().remove(page.slug);
          message.success('Page deleted');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  if (state.status === 'error') {
    return <PageLoadError title="Pages" crumbs={[{ label: 'Website' }, { label: 'Pages' }]} message={state.message} reference={state.reference} onRetry={reload} />;
  }
  const pages = state.status === 'ready' ? state.data : [];

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Website' }, { label: 'Pages' }]}
        title="Pages"
        description="About and the policies are always here; pages you add appear below. Only published pages are public."
        actions={
          canManage ? (
            <Link to="/website/pages/new">
              <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
                New page
              </Button>
            </Link>
          ) : null
        }
      />
      <Table<StaticPage>
        className="ms-scroll-table"
        scroll={{ x: 640 }}
        rowKey="slug"
        dataSource={pages}
        loading={state.status === 'loading'}
        pagination={false}
        columns={[
          {
            title: 'Page',
            dataIndex: 'title',
            render: (_: unknown, record) => (
              <Space direction="vertical" size={0}>
                {canManage ? <Link to={`/website/pages/${record.slug}`}>{record.title}</Link> : <span>{record.title}</span>}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  /{record.slug}
                </Typography.Text>
              </Space>
            ),
          },
          {
            title: 'Kind',
            key: 'kind',
            width: 190,
            render: (_: unknown, record) => (
              <Space size={6} wrap>
                <Tag color={record.isSystem ? 'blue' : undefined}>{record.isSystem ? 'Part of the product' : 'Added by an editor'}</Tag>
                {record.template === 'about' && <Tag>About template</Tag>}
              </Space>
            ),
          },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 200,
            render: (_: unknown, record) => (
              <Space size={8}>
                <StatusTag status={record.status} />
                {record.status !== 'published' && record.publicationBlockers.length > 0 && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {record.publicationBlockers.length} to fix
                  </Typography.Text>
                )}
              </Space>
            ),
          },
          {
            title: 'Last changed',
            dataIndex: 'updatedAt',
            width: 200,
            render: (_: unknown, record) => (record.version > 0 ? formatDateTime(record.updatedAt) : <Typography.Text type="secondary">Never saved</Typography.Text>),
          },
          {
            title: '',
            key: 'actions',
            width: 170,
            render: (_: unknown, record) =>
              canManage ? (
                <Space size={8}>
                  <Link to={`/website/pages/${record.slug}`}>
                    <Button size="small">Edit</Button>
                  </Link>
                  {!record.isSystem && (
                    <Button
                      size="small"
                      danger
                      // Refused by the API while it is published; the button
                      // says so rather than offering an action that fails.
                      disabled={!record.canDelete}
                      title={record.canDelete ? undefined : 'Unpublish it first'}
                      onClick={() => remove(record)}
                      aria-label={`Delete ${record.title}`}
                    >
                      Delete
                    </Button>
                  )}
                </Space>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
