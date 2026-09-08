import { Alert, App, Button, Popconfirm, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { Link } from 'react-router';
import { featuredApi, type FeaturedPlacement } from '@/api/businesses';
import { isApiError } from '@/api/errors';
import { EmptyState, PageHeader, SectionCard, StatusTag } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

/**
 * Manual featured placements (SRS DIR 007). At most three ever appear for a
 * query, they never bypass matching or publication rules, and there is no
 * payment or billing anywhere in the flow.
 */
export function FeaturedPage() {
  useDocumentTitle('Featured listings');
  const api = featuredApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const { can } = useCapabilities();
  const canManage = can(PERMISSION.listingsPublish);
  const [state, reload] = useAsync((signal) => api.list(signal), []);

  const remove = async (row: FeaturedPlacement) => {
    try {
      await api.remove(row.id);
      message.success('Placement removed');
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const rows = state.status === 'ready' ? state.data : [];

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Business', href: '/businesses' }, { label: 'Featured listings' }]}
        title="Featured listings"
        description="Editorial placements shown in a separate labelled block above the results. At most three appear for any search, and a featured listing still has to match the visitor's filters and be published."
        actions={
          canManage ? (
            <Link to="/businesses/featured/new">
              <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
                Feature a listing
              </Button>
            </Link>
          ) : null
        }
      />
      {state.status === 'error' && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />}

      <SectionCard title="Placements" description="Ordered by position; the three lowest positions that match a query are the ones shown." bodyPadding={0}>
        <Table<FeaturedPlacement>
          rowKey="id"
          loading={state.status === 'loading'}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: state.status === 'ready' ? <EmptyState title="Nothing featured" description="Feature a published listing to highlight it above the directory results." /> : ' ' }}
          columns={[
            {
              title: 'Listing',
              render: (_: unknown, row) => (
                <span>
                  <Link to={`/businesses/${row.businessId}`} style={{ fontWeight: 600 }}>
                    {row.businessName}
                  </Link>
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    /business/{row.businessSlug}
                  </Typography.Text>
                </span>
              ),
            },
            { title: 'Position', dataIndex: 'position', width: 100 },
            { title: 'From', dataIndex: 'startsAt', render: formatDateTime },
            { title: 'Until', render: (_: unknown, row) => (row.endsAt ? formatDateTime(row.endsAt) : 'Open-ended') },
            {
              title: 'State',
              render: (_: unknown, row) => <StatusTag status={row.state === 'not-published' ? 'draft' : row.state === 'live' ? 'published' : row.state} />,
            },
            { title: 'Note', dataIndex: 'note', render: (value: string | null) => value ?? '—' },
            ...(canManage
              ? [
                  {
                    title: <span className="sr-only">Actions</span>,
                    render: (_: unknown, row: FeaturedPlacement) => (
                      <Popconfirm title="Remove this placement?" description="The listing stays published; it simply stops being featured." okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => void remove(row)}>
                        <Button type="link" danger aria-label={`Remove placement for ${row.businessName}`}>
                          Remove
                        </Button>
                      </Popconfirm>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </SectionCard>

    </div>
  );
}
