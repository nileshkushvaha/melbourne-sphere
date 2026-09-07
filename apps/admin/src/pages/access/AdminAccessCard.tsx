import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Select, Space, Table, Tag, Typography } from 'antd';
import { useOnError } from '@refinedev/core';
import { authorizationApi, type PermissionCatalogEntry } from '@/api/authorization';
import { isApiError } from '@/api/errors';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { PageLoader } from '@/components/ui';
import { PermissionMatrix } from './PermissionMatrix';

/**
 * Administrator access editor (SRS RBAC 010): the roles they hold, the
 * permissions granted to them directly, and the effective set with the source of
 * each entry, so inherited and direct access are never confused.
 *
 * The server refuses an administrator editing their own access and refuses
 * granting anything the acting administrator does not hold themselves; this card
 * asks for confirmation before a change and reports the server's refusal as it
 * is (RBAC 011).
 */
export function AdminAccessCard({ adminId, isSelf }: { adminId: string; isSelf: boolean }) {
  const api = useMemo(() => authorizationApi(), []);
  const { message, modal } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const { can } = useCapabilities();
  const [accessState, reloadAccess] = useAsync((signal) => api.getAdminAccess(adminId, signal), [adminId]);
  const [rolesState] = useAsync((signal) => api.listRoles({ page: 1, pageSize: 50 }, signal), []);
  const [catalogState] = useAsync((signal) => api.permissions(signal), []);
  /** Edits in progress, tagged with the record version they started from, so a reload discards them. */
  const [draft, setDraft] = useState<{ version: number; roleIds: string[]; direct: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const access = accessState.status === 'ready' ? accessState.data : null;
  const version = access?.version ?? 0;
  const current = draft?.version === version ? draft : { version, roleIds: access?.roles.map((role) => role.id) ?? [], direct: access?.directPermissions ?? [] };
  const { roleIds, direct } = current;
  const setRoleIds = (next: string[]) => setDraft({ ...current, roleIds: next });
  const setDirect = (next: string[]) => setDraft({ ...current, direct: next });

  const editable = can(PERMISSION.adminsAccessManage) && !isSelf;

  const save = async (kind: 'roles' | 'permissions') => {
    if (!access) return;
    setError(null);
    setSaving(true);
    try {
      if (kind === 'roles') await api.replaceAdminRoles(adminId, { roleIds, expectedVersion: access.version });
      else await api.replaceAdminPermissions(adminId, { permissions: direct, expectedVersion: access.version });
      message.success(kind === 'roles' ? 'Roles updated' : 'Direct permissions updated');
      reloadAccess();
    } catch (err) {
      if (isApiError(err) && err.kind === 'unauthorized') onAuthError(err);
      else setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmAndSave = (kind: 'roles' | 'permissions') => {
    modal.confirm({
      title: kind === 'roles' ? 'Change this administrator’s roles?' : 'Change this administrator’s direct permissions?',
      content: 'This changes what they can do across the whole admin immediately, and is recorded in the audit log.',
      okText: 'Apply change',
      onOk: () => save(kind),
    });
  };

  if (accessState.status === 'error') {
    return <Alert type="error" showIcon message={accessState.message} description={accessState.reference} action={<Button onClick={reloadAccess}>Retry</Button>} />;
  }
  if (!access) return <PageLoader label="Loading access…" />;

  const catalog: PermissionCatalogEntry[] = catalogState.status === 'ready' ? catalogState.data : [];
  const effectiveRows = access.effectivePermissions.map((code) => ({
    key: code,
    label: catalog.find((entry) => entry.key === code)?.label ?? code,
    sources: access.sources[code] ?? [],
  }));

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {error && <Alert type="error" showIcon message={error} role="alert" />}
      {isSelf && (
        <Alert
          type="info"
          showIcon
          message="You cannot change your own access"
          description="Ask another administrator. Editing your own roles or permissions is refused by the API, so a single compromised session cannot escalate itself."
        />
      )}

      <Card title="Roles">
        <Select
          mode="multiple"
          aria-label="Roles"
          style={{ width: '100%', maxWidth: 560 }}
          value={roleIds}
          disabled={!editable || rolesState.status !== 'ready'}
          onChange={setRoleIds}
          optionFilterProp="label"
          options={(rolesState.status === 'ready' ? rolesState.data.data : []).map((role) => ({
            value: role.id,
            label: role.isActive ? role.name : `${role.name} (inactive)`,
            disabled: !role.isActive,
          }))}
        />
        {editable && (
          <div style={{ marginTop: 12 }}>
            <Button type="primary" loading={saving} onClick={() => confirmAndSave('roles')}>
              Save roles
            </Button>
          </div>
        )}
      </Card>

      <Card title="Direct permissions" extra={<Typography.Text type="secondary">Granted to this administrator only, in addition to their roles</Typography.Text>}>
        {catalogState.status === 'loading' ? (
          <PageLoader label="Loading the permission catalogue…" />
        ) : (
          <>
            <PermissionMatrix catalog={catalog} value={direct} disabled={!editable} onChange={setDirect} />
            {editable && (
              <Button type="primary" loading={saving} onClick={() => confirmAndSave('permissions')}>
                Save direct permissions
              </Button>
            )}
          </>
        )}
      </Card>

      <Card title="Effective permissions" extra={<Typography.Text type="secondary">What this administrator can actually do right now</Typography.Text>}>
        {/*
          An account that is not active grants nothing at all, whatever its roles
          say (SRS RBAC 005). Saying so is the difference between "nothing has
          been granted" and "nothing is in force yet".
        */}
        {access.status !== 'active' && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`This administrator is ${access.status}, so none of the access below is in force`}
            description="Roles and direct permissions are kept and take effect as soon as the account becomes active."
          />
        )}
        {effectiveRows.length === 0 ? (
          <Typography.Paragraph type="secondary">
            {access.status === 'active'
              ? 'No permissions. This administrator can sign in and see their own account, and nothing else.'
              : 'Nothing is in force while the account is not active.'}
          </Typography.Paragraph>
        ) : (
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={effectiveRows}
            columns={[
              {
                title: 'Permission',
                dataIndex: 'label',
                render: (label: string, row: { key: string }) => (
                  <span>
                    {label}{' '}
                    <Typography.Text type="secondary" code style={{ fontSize: 12 }}>
                      {row.key}
                    </Typography.Text>
                  </span>
                ),
              },
              {
                title: 'Where it comes from',
                dataIndex: 'sources',
                render: (sources: string[]) => (
                  <Space size={4} wrap>
                    {sources.map((source) =>
                      source === 'direct' ? (
                        <Tag key={source} color="blue">
                          Direct grant
                        </Tag>
                      ) : (
                        <Tag key={source}>Role: {source}</Tag>
                      ),
                    )}
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>
    </Space>
  );
}
