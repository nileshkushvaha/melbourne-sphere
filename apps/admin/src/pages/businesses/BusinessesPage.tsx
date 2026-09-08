import { Alert, Button, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import { PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useList } from '@refinedev/core';
import { Link, useSearchParams } from 'react-router';
import type { BusinessListItem, BusinessStatus } from '@/api/businesses';
import { isApiError } from '@/api/errors';
import { taxonomyApi, type CategoryItem, type LocalAreaItem } from '@/api/taxonomy';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

const STATUS_COLOURS: Record<BusinessStatus, string> = { draft: 'default', published: 'green', archived: 'orange' };
const SORTS = ['updatedAt', 'name', 'status', 'createdAt', 'publishedAt'] as const;
type Sort = (typeof SORTS)[number];

/**
 * Business listings index (SRS BUS 001–006, ADM 002). Reads go through the
 * Refine data provider using the documented list contract; URL state keeps
 * filters shareable and survivable across refresh.
 */
export function BusinessesPage() {
  useDocumentTitle('Businesses');
  const [params, setParams] = useSearchParams();
  const { can } = useCapabilities();
  const canWrite = can(PERMISSION.listingsWrite);
  const page = Number(params.get('page') ?? '1') || 1;
  const q = params.get('q') ?? '';
  const status = (params.get('status') as BusinessStatus | null) ?? undefined;
  const categoryId = params.get('categoryId') ?? undefined;
  const localAreaId = params.get('localAreaId') ?? undefined;
  const sort = (SORTS as readonly string[]).includes(params.get('sort') ?? '') ? (params.get('sort') as Sort) : 'updatedAt';
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';

  const list = useList<BusinessListItem>({
    resource: 'businesses',
    pagination: { currentPage: page, pageSize: 20 },
    sorters: [{ field: sort, order }],
    filters: [
      { field: 'q', operator: 'contains', value: q || undefined },
      { field: 'status', operator: 'eq', value: status },
      { field: 'primaryCategoryId', operator: 'eq', value: categoryId },
      { field: 'localAreaId', operator: 'eq', value: localAreaId },
    ],
    queryOptions: { retry: false },
    errorNotification: false,
  });
  const [categories] = useAsync(() => taxonomyApi<CategoryItem>('categories').list({ pageSize: 50, sort: 'name' }).then((r) => r.data), []);
  const [areas] = useAsync(() => taxonomyApi<LocalAreaItem>('areas').list({ pageSize: 50, sort: 'name' }).then((r) => r.data), []);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const error = list.query.error;
  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Business' }, { label: 'Businesses' }]}
        title="Businesses"
        description="Melbourne-only listings. Drafts are private; publishing requires verified eligibility, reviewed content rights and a contact route."
        actions={
          canWrite ? (
            <Link to="/businesses/new">
              <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
                New business
              </Button>
            </Link>
          ) : null
        }
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search aria-label="Search by name, slug or phone" placeholder="Search name, slug or phone" allowClear defaultValue={q} onSearch={(v) => setParam('q', v.trim() || undefined)} style={{ width: 260 }} />
        <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => setParam('status', v)} style={{ width: 150 }} options={(['draft', 'published', 'archived'] as const).map((s) => ({ value: s, label: s }))} />
        <Select aria-label="Filter by category" allowClear showSearch optionFilterProp="label" placeholder="All categories" value={categoryId} onChange={(v) => setParam('categoryId', v)} style={{ width: 200 }} options={categories.status === 'ready' ? categories.data.map((c) => ({ value: c.id, label: c.name })) : []} />
        <Select aria-label="Filter by local area" allowClear showSearch optionFilterProp="label" placeholder="All areas" value={localAreaId} onChange={(v) => setParam('localAreaId', v)} style={{ width: 180 }} options={areas.status === 'ready' ? areas.data.map((a) => ({ value: a.id, label: a.name })) : []} />
        <Select aria-label="Sort by" value={sort} onChange={(v) => setParam('sort', v)} style={{ width: 170 }} options={SORTS.map((s) => ({ value: s, label: `Sort: ${s}` }))} />
        <Select aria-label="Sort direction" value={order} onChange={(v) => setParam('order', v)} style={{ width: 130 }} options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} />
      </Space>
      {list.query.isError && (
        <Alert type="error" showIcon message={isApiError(error) ? error.userMessage : 'Could not load businesses.'} description={isApiError(error) ? error.reference : null} action={<Button onClick={() => void list.query.refetch()}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}
      <Table<BusinessListItem>
        rowKey="id"
        loading={list.query.isPending}
        dataSource={list.result.data}
        pagination={{ current: page, pageSize: 20, total: list.result.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) }}
        scroll={{ x: 900 }}
        columns={[
          {
            title: 'Name',
            dataIndex: 'name',
            render: (v: string, item) => (
              <Space>
                <Link to={`/businesses/${encodeURIComponent(item.id)}`}>{v}</Link>
                {item.duplicateFlagged && (
                  <Tooltip title="Possible duplicate of another listing">
                    <WarningOutlined style={{ color: '#d46b08' }} aria-label="Possible duplicate" />
                  </Tooltip>
                )}
              </Space>
            ),
          },
          { title: 'Slug', dataIndex: 'slug', render: (v: string) => <code>{v}</code> },
          { title: 'Category', dataIndex: 'primaryCategoryName' },
          { title: 'Area', dataIndex: 'localAreaName' },
          { title: 'Status', dataIndex: 'status', render: (v: BusinessStatus, item) => <Space size={4}><Tag color={STATUS_COLOURS[v]}>{v}</Tag>{v === 'draft' && !item.publishable && <Tag>incomplete</Tag>}</Space> },
          { title: 'Updated', dataIndex: 'updatedAt', render: formatDateTime },
        ]}
        locale={{ emptyText: list.query.isSuccess ? 'No businesses match.' : ' ' }}
      />
    </div>
  );
}
