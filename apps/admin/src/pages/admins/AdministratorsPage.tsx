import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router';
import { adminsApi, type AdminListItem } from '@/api/admins';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const STATUS_COLOUR: Record<AdminListItem['status'], string> = { invited: 'gold', active: 'green', disabled: 'default' };

export function AdministratorsPage() {
  useDocumentTitle('Administrators');
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const q = params.get('q') ?? '';
  const status = (params.get('status') as AdminListItem['status'] | null) ?? undefined;
  const [state, reload] = useAsync(() => adminsApi.list({ page, pageSize: 20, q: q || undefined, status, sort: 'createdAt', order: 'desc' }), [page, q, status]);
  const [creating, setCreating] = useState(false);
  const [createForm] = Form.useForm<{ email: string; displayName: string }>();
  const [createError, setCreateError] = useState<string | null>(null);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} align="start" wrap>
        <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>
          Administrators
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={() => setCreating(true)}>
          New administrator
        </Button>
      </Space>
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
      <Modal
        title="New administrator"
        open={creating}
        onCancel={() => { setCreating(false); setCreateError(null); }}
        okText="Create and send setup link"
        onOk={() => createForm.submit()}
        destroyOnHidden
      >
        <Typography.Paragraph type="secondary">The new administrator receives a single-use setup link (valid 24 hours) to choose their password. They cannot sign in before that.</Typography.Paragraph>
        {createError && <Alert type="error" showIcon message={createError} style={{ marginBottom: 12 }} />}
        <Form
          form={createForm}
          layout="vertical"
          requiredMark={false}
          onFinish={async (values) => {
            setCreateError(null);
            try {
              await adminsApi.create({ ...values, roleKeys: ['super_admin'] });
              message.success('Administrator created; setup link sent.');
              setCreating(false);
              createForm.resetFields();
              reload();
            } catch (error) {
              const fields = fieldErrors(error);
              createForm.setFields(Object.entries(fields).map(([name, errors]) => ({ name, errors })) as never);
              setCreateError(errorMessage(error));
            }
          }}
        >
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Enter a valid email address' }]}>
            <Input type="email" maxLength={254} />
          </Form.Item>
          <Form.Item label="Display name" name="displayName" rules={[{ required: true, min: 2, max: 80, message: '2–80 characters' }]}>
            <Input maxLength={80} />
          </Form.Item>
          <Form.Item label="Role">
            <Input value="Super Admin" disabled aria-describedby="role-note" />
            <Typography.Text id="role-note" type="secondary">Additional staff roles are outside the MVP (SRS ADM 003).</Typography.Text>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
