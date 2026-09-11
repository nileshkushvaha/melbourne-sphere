import type { ReactNode } from 'react';
import { Alert, App, Button, Input, Select, Switch, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { Link, useSearchParams } from 'react-router';
import { taxonomyApi, type TermItem, type TermKind, type TermListQuery } from '@/api/taxonomy';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { PageHeader, TableCard, StatusTag } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

export interface TermField {
  name: string;
  label: string;
  input: 'text' | 'textarea' | 'number' | 'tags' | 'parent';
  required?: boolean;
  max?: number;
  help?: string;
}

export interface TermsPageConfig {
  kind: TermKind;
  title: string;
  singular: string;
  intro: string;
  fields: TermField[];
  columns?: { title: string; render: (item: TermItem) => ReactNode }[];
}

const SORTS: NonNullable<TermListQuery['sort']>[] = ['name', 'slug', 'sortOrder', 'createdAt', 'updatedAt'];

/** The sort keys the API accepts, in the words an administrator would use. */
const SORT_LABELS: Record<string, string> = {
  name: 'Name',
  slug: 'Address',
  sortOrder: 'Display order',
  createdAt: 'Date added',
  updatedAt: 'Last changed',
};

/**
 * Generic list and activate/deactivate screen for the three taxonomy resources
 * (SRS CFG 003, ADM 002). State lives in the URL so refresh and back preserve
 * the filters; creating and editing happen on their own routes
 * (`TermEditorPage`), and activation stays a confirmation because it changes
 * what the public site offers.
 */
export function TermsPage({ config }: { config: TermsPageConfig }) {
  useDocumentTitle(config.title);
  const { message, modal } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const api = taxonomyApi<TermItem>(config.kind);
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const q = params.get('q') ?? '';
  const status = (params.get('status') as 'active' | 'inactive' | null) ?? undefined;
  const sort = (params.get('sort') as TermListQuery['sort']) ?? 'name';
  const order = (params.get('order') as 'asc' | 'desc') ?? 'asc';
  const [state, reload] = useAsync(() => api.list({ page, pageSize: 20, q: q || undefined, status, sort, order }), [config.kind, page, q, status, sort, order]);

  const listHref = `/${config.kind}`;

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const toggleActive = (item: TermItem) => {
    const next = !item.active;
    modal.confirm({
      title: `${next ? 'Activate' : 'Deactivate'} “${item.name}”?`,
      content: next ? 'It becomes selectable again.' : 'It is removed from new selections; existing links are preserved. Terms still used by active listings cannot be deactivated.',
      okText: next ? 'Activate' : 'Deactivate',
      okButtonProps: { danger: !next },
      onOk: async () => {
        try {
          await api.setActive(item.id, next, item.version);
          message.success(next ? 'Activated' : 'Deactivated');
          reload();
        } catch (error) {
          if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
          else message.error(errorMessage(error));
        }
      },
    });
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Business' }, { label: config.title }]}
        title={config.title}
        description={<>{config.intro}</>}
        actions={
          <Link to={`${listHref}/new`}>
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
              New {config.singular.toLowerCase()}
            </Button>
          </Link>
        }
      />
      <TableCard
        toolbar={
          <>
            <Input.Search aria-label="Search by name or slug" placeholder="Search name or slug" allowClear defaultValue={q} onSearch={(v) => setParam('q', v.trim() || undefined)} style={{ width: 260 }} />
            <Select aria-label="Filter by status" allowClear placeholder="All" value={status} onChange={(v) => setParam('status', v)} style={{ width: 140 }} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
            <Select aria-label="Sort by" value={sort} onChange={(v) => setParam('sort', v)} style={{ width: 160 }} options={SORTS.map((s) => ({ value: s, label: `Sort: ${SORT_LABELS[s] ?? s}` }))} />
            <Select aria-label="Sort direction" value={order} onChange={(v) => setParam('order', v)} style={{ width: 120 }} options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} />
          </>
        }
      >
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<TermItem>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 760 }}
        columns={[
          { title: 'Name', dataIndex: 'name', render: (v: string, item) => <Link to={`${listHref}/${item.id}`}>{v}</Link> },
          { title: 'Slug', dataIndex: 'slug', render: (v: string) => <code>{v}</code> },
          ...(config.columns ?? []).map((c) => ({ title: c.title, render: (_: unknown, item: TermItem) => c.render(item) })),
          { title: 'Status', dataIndex: 'active', render: (v: boolean) => <StatusTag status={v ? 'active' : 'inactive'} /> },
          { title: 'Updated', dataIndex: 'updatedAt', render: formatDateTime },
          { title: <span className="sr-only">Actions</span>, render: (_: unknown, item) => <Switch checked={item.active} onChange={() => toggleActive(item)} aria-label={`${item.active ? 'Deactivate' : 'Activate'} ${item.name}`} /> },
        ]}
        locale={{ emptyText: state.status === 'ready' ? `No ${config.title.toLowerCase()} match.` : ' ' }}
      />
      </TableCard>
    </div>
  );
}
