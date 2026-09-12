import { Alert, App, Button, Switch, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { Link } from 'react-router';
import { blogApi, type BlogTerm } from '@/api/blog';
import { isApiError } from '@/api/errors';
import { EmptyState, PageHeader, StatusTag } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import type { EditorialTermsConfig } from './editorial-configs';

/**
 * Blog categories and tags (SRS BLOG 001/005). The list activates and
 * deactivates; creating and editing happen on their own routes, so a landing
 * page's Markdown is written at a readable width rather than in a dialog.
 */
export function EditorialTermsPage({ config }: { config: EditorialTermsConfig }) {
  useDocumentTitle(config.title);
  const api = blogApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [state, reload] = useAsync<BlogTerm[]>((signal) => api.listTerms(config.kind, signal), [config.kind]);
  const listHref = `/${config.kind}`;

  const toggleActive = async (row: BlogTerm) => {
    try {
      await api.setTermActive(config.kind, row.id, !row.active, row.version);
      message.success(row.active ? 'Deactivated' : 'Activated');
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Editorial' }, { label: config.title }]}
        title={config.title}
        description={config.intro}
        actions={
          <Link to={`${listHref}/new`}>
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
              New {config.singular.toLowerCase()}
            </Button>
          </Link>
        }
      />
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<BlogTerm>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data : []}
        pagination={false}
        scroll={{ x: 700 }}
        columns={[
          { title: 'Name', render: (_: unknown, row) => <Link to={`${listHref}/${row.id}`}>{row.name}</Link> },
          { title: 'Articles', dataIndex: 'postCount' },
          { title: 'Status', dataIndex: 'active', render: (v: boolean) => <StatusTag status={v ? 'active' : 'inactive'} /> },
          { title: 'Updated', dataIndex: 'updatedAt', render: formatDateTime },
          {
            title: <span className="sr-only">Actions</span>,
            render: (_: unknown, row) => <Switch checked={row.active} onChange={() => void toggleActive(row)} aria-label={`${row.active ? 'Deactivate' : 'Activate'} ${row.name}`} />,
          },
        ]}
        // The whole list is fetched and nothing filters it, so there is only one
        // empty case to explain here.
        locale={{ emptyText: state.status === 'ready' ? <EmptyState title={`No ${config.title.toLowerCase()} yet`} description={config.intro} /> : <span className="sr-only">Loading</span> }}
      />
    </div>
  );
}
