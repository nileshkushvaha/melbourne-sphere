import { Alert, Button, Input, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router';
import { adminsApi, type AdminListItem } from '@/api/admins';
import { PageHeader } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const STATUS_COLOUR: Record<AdminListItem['status'], string> = { invited: 'gold', active: 'green', disabled: 'default' };

/**
 * Administrators (SRS ADM 003, RBAC 004). Inviting happens on its own route so
 * roles are chosen deliberately rather than assumed; this screen lists, filters
 * and links to each account.
 */
export function AdministratorsPage() {
  useDocumentTitle('Administrators');
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const q = params.get('q') ?? '';
  const status = (params.get('status') as AdminListItem['status'] | null) ?? undefined;
  const [state, reload] = useAsync(() => adminsApi.list({ page, pageSize: 20, q: q || undefined, status, sort: 'createdAt', order: 'desc' }), [page, q, status]);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'Administrators' }]}
        title="Administrators"
        description="Everyone who can sign in to this admin. An account starts as invited and becomes active only when the person sets their own password."
        actions={
          <Link to="/admins/new">
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
              New administrator
            </Button>
          </Link>
        }
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search aria-label="Search by email or name" placeholder="Search email or name" allowClear defaultValue={q} onSearch={(v) => setParam('q', v.trim() || undefined)} style={{ width: 280 }} />
        <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => setParam('status', v)} style={{ width: 160 }} options={[{ value: 'invited', label: 'Invited' }, { value: 'active', label: 'Active' }, { value: 'disabled', label: 'Disabled' }]} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<AdminListItem>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 720 }}
        columns={[
          { title: 'Name', dataIndex: 'displayName', render: (v: string, r) => <Link to={`/admins/${r.id}`}>{v}</Link> },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Status', dataIndex: 'status', render: (v: AdminListItem['status']) => <Tag color={STATUS_COLOUR[v]}>{v}</Tag> },
          { title: 'Roles', dataIndex: 'roles', render: (v: string[]) => v.join(', ') },
          { title: '2FA', dataIndex: 'totpEnabled', render: (v: boolean) => (v ? 'On' : 'Off') },
          { title: 'Last sign-in', dataIndex: 'lastLoginAt', render: (v: string | null) => formatDateTime(v) },
        ]}
        locale={{ emptyText: state.status === 'ready' ? 'No administrators match.' : ' ' }}
      />
    </div>
  );
}
