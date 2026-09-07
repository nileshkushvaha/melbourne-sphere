import { useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Form, Input, Space, Table, Tag, Typography } from 'antd';
import { useGetIdentity } from '@refinedev/core';
import { Link, useParams } from 'react-router';
import { adminsApi, type SessionListItem } from '@/api/admins';
import type { AdminSummary } from '@/api/auth';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

export function AdminDetailPage() {
  const { id = '' } = useParams();
  const { message, modal } = App.useApp();
  const { data: me } = useGetIdentity<AdminSummary>();
  const [state, reload] = useAsync(() => adminsApi.get(id), [id]);
  const [sessions, reloadSessions] = useAsync(() => adminsApi.sessions(id), [id]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const admin = state.status === 'ready' ? state.data : null;
  useDocumentTitle(admin ? admin.displayName : 'Administrator');

  const mutate = async (fn: () => Promise<unknown>, success: string) => {
    setSaveError(null);
    try {
      await fn();
      message.success(success);
      reload();
      reloadSessions();
    } catch (error) {
      if (isApiError(error) && error.code === 'STALE_VERSION') {
        setSaveError('This administrator was changed by someone else. The latest values have been reloaded; review and try again.');
        reload();
      } else setSaveError(errorMessage(error));
    }
  };

  if (state.status === 'error') return <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />;
  if (!admin) return <p role="status">Loading…</p>;
  const isSelf = me?.id === admin.id;

  return (
    <div>
      <Typography.Paragraph>
        <Link to="/admins">← Administrators</Link>
      </Typography.Paragraph>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'Administrators', href: '/admins' }, { label: admin.displayName }]}
        title={admin.displayName}
        meta={isSelf ? <Tag>you</Tag> : null}
      />
      {saveError && <Alert type="error" showIcon message={saveError} style={{ marginBottom: 16 }} role="alert" />}
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card title="Account">
          <Descriptions column={{ xs: 1, md: 2 }} size="small">
            <Descriptions.Item label="Email">{admin.email}</Descriptions.Item>
            <Descriptions.Item label="Status"><Tag color={admin.status === 'active' ? 'green' : admin.status === 'invited' ? 'gold' : 'default'}>{admin.status}</Tag></Descriptions.Item>
            <Descriptions.Item label="Roles">{admin.roles.join(', ')}</Descriptions.Item>
            <Descriptions.Item label="Two-factor">{admin.totpEnabled ? 'Enabled' : 'Off'}</Descriptions.Item>
            <Descriptions.Item label="Last sign-in">{formatDateTime(admin.lastLoginAt)}</Descriptions.Item>
            <Descriptions.Item label="Created">{formatDateTime(admin.createdAt)}</Descriptions.Item>
          </Descriptions>
          <Form<{ displayName: string }> layout="inline" initialValues={{ displayName: admin.displayName }} key={admin.version} onFinish={(v) => mutate(() => adminsApi.update(admin.id, { expectedVersion: admin.version, displayName: v.displayName }), 'Saved')} style={{ marginTop: 16 }}>
            <Form.Item label="Display name" name="displayName" rules={[{ required: true, min: 2, max: 80, message: '2–80 characters' }]}>
              <Input maxLength={80} />
            </Form.Item>
            <Form.Item>
              <Button htmlType="submit">Save</Button>
            </Form.Item>
          </Form>
          <Space style={{ marginTop: 16 }} wrap>
            {admin.status === 'invited' && <Button onClick={() => mutate(() => adminsApi.resendSetup(admin.id), 'Setup link sent')}>Resend setup link</Button>}
            {admin.status !== 'disabled' && !isSelf && (
              <Button
                danger
                onClick={() =>
                  modal.confirm({
                    title: `Disable ${admin.displayName}?`,
                    content: 'They will be signed out everywhere immediately and cannot sign in until re-enabled.',
                    okText: 'Disable',
                    okButtonProps: { danger: true },
                    onOk: () => mutate(() => adminsApi.disable(admin.id, { expectedVersion: admin.version }), 'Administrator disabled'),
                  })
                }
              >
                Disable account
              </Button>
            )}
            {admin.status === 'disabled' && <Button onClick={() => mutate(() => adminsApi.enable(admin.id, { expectedVersion: admin.version }), 'Administrator enabled')}>Enable account</Button>}
          </Space>
        </Card>
        <Card title="Active sessions" extra={sessions.status === 'ready' && sessions.data.length > 0 && <Button danger onClick={() => modal.confirm({ title: 'Sign out of all sessions?', okText: 'Sign out all', okButtonProps: { danger: true }, onOk: () => mutate(() => adminsApi.revokeAllSessions(admin.id), 'All sessions revoked') })}>Sign out all</Button>}>
          <Table<SessionListItem>
            rowKey="id"
            size="small"
            loading={sessions.status === 'loading'}
            dataSource={sessions.status === 'ready' ? sessions.data : []}
            pagination={false}
            scroll={{ x: 640 }}
            columns={[
              { title: 'Started', dataIndex: 'createdAt', render: formatDateTime },
              { title: 'Last activity', dataIndex: 'lastSeenAt', render: formatDateTime },
              { title: 'IP', dataIndex: 'ipAddress', render: (v: string | null) => v ?? '—' },
              { title: 'Client', dataIndex: 'userAgent', ellipsis: true, render: (v: string | null) => v ?? '—' },
              { title: <span className="sr-only">Actions</span>, render: (_: unknown, s) => (s.current ? <Tag>current</Tag> : <Button size="small" onClick={() => mutate(() => adminsApi.revokeSession(admin.id, s.id), 'Session revoked')}>Revoke</Button>) },
            ]}
            locale={{ emptyText: 'No active sessions' }}
          />
        </Card>
      </Space>
    </div>
  );
}
