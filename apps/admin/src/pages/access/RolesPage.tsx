import { useMemo, useState } from 'react';
import { App, Button, Input, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { useOnError } from '@refinedev/core';
import { authorizationApi, type RoleListItem } from '@/api/authorization';
import { isApiError } from '@/api/errors';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { formatDateTime } from '@/shared/format';
import { EmptyState, PageHeader, SectionCard, StatusTag } from '@/components/ui';

/**
 * Roles (SRS RBAC 010). Creating and editing appear only with the matching
 * permission; the API refuses either regardless of what is rendered here.
 */
export function RolesPage() {
  useDocumentTitle('Roles');
  const api = useMemo(() => authorizationApi(), []);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const { can } = useCapabilities();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const [state, reload] = useAsync((signal) => api.listRoles({ page, pageSize: 20, q: search || undefined }, signal), [page, search]);

  const remove = async (role: RoleListItem) => {
    try {
      await api.deleteRole(role.id);
      message.success(`Role “${role.name}” deleted`);
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const rows = state.status === 'ready' ? state.data.data : [];
  const meta = state.status === 'ready' ? state.data.meta : undefined;

  return (
    <>
      <PageHeader
        title="Roles"
        description="A role carries permissions; administrators inherit everything their active roles carry, plus anything granted to them directly."
        actions={
          can(PERMISSION.rolesCreate) ? (
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={() => navigate('/roles/new')}>
              New role
            </Button>
          ) : undefined
        }
      />
      <SectionCard>
        <Space style={{ marginBottom: 16 }}>
          <Input.Search
            allowClear
            aria-label="Search roles"
            placeholder="Search by name or key"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onSearch={(value) => {
              setPage(1);
              setSearch(value.trim());
            }}
            style={{ width: 280 }}
          />
        </Space>
        {state.status === 'ready' && rows.length === 0 ? (
          <EmptyState title="No roles match" description="Try a different search, or create a role for a group of administrators." />
        ) : (
          <Table<RoleListItem>
            rowKey="id"
            dataSource={rows}
            loading={state.status === 'loading'}
            pagination={{ current: page, pageSize: meta?.pageSize ?? 20, total: meta?.total ?? 0, onChange: setPage, showSizeChanger: false }}
            scroll={{ x: 'max-content' }}
            columns={[
              {
                title: 'Role',
                dataIndex: 'name',
                // Wide enough that the name and its key each stay on one line:
                // a key broken across lines ("moderat or") reads as a typo.
                width: 240,
                render: (_value, role) => (
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong style={{ whiteSpace: 'nowrap' }}>
                      {role.name}
                    </Typography.Text>
                    <Typography.Text type="secondary" code style={{ whiteSpace: 'nowrap' }}>
                      {role.key}
                    </Typography.Text>
                  </Space>
                ),
              },
              { title: 'Description', dataIndex: 'description', responsive: ['md'] },
              {
                title: 'Status',
                dataIndex: 'isActive',
                render: (_value, role) => (
                  <Space size={4} wrap>
                    <StatusTag status={role.isActive ? 'active' : 'disabled'} />
                    {/* A protected role cannot be deleted, deactivated or edited by hand (RBAC 011). */}
                    {role.isSystem && <Tag color="gold">System</Tag>}
                  </Space>
                ),
              },
              { title: 'Permissions', dataIndex: 'permissionCount', responsive: ['md'] },
              { title: 'Administrators', dataIndex: 'adminCount', responsive: ['md'] },
              { title: 'Updated', dataIndex: 'updatedAt', responsive: ['lg'], render: (value: string) => formatDateTime(value) },
              {
                title: 'Actions',
                key: 'actions',
                render: (_value, role) => (
                  <Space>
                    <Button size="small" onClick={() => navigate(`/roles/${role.id}`)}>
                      {can(PERMISSION.rolesUpdate) && !role.isSystem ? 'Edit' : 'View'}
                    </Button>
                    {can(PERMISSION.rolesDelete) && !role.isSystem && role.adminCount === 0 && (
                      <Button size="small" danger onClick={() => void remove(role)}>
                        Delete
                      </Button>
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
    </>
  );
}
