import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Popconfirm, Radio, Space, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { isApiError } from '@/api/errors';
import { seoApi, type Redirect, type RedirectKind } from '@/api/seo';
import { EmptyState, PageHeader, StatusTag } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface FormValues {
  sourcePath: string;
  targetPath?: string;
  kind: RedirectKind;
  reason?: string;
}

/**
 * Redirect rules (SRS SEO 004). Slug changes create these automatically; this
 * screen covers pages that moved or were deliberately removed.
 */
export function RedirectsPage() {
  useDocumentTitle('SEO redirects');
  const api = seoApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();
  const kind = Form.useWatch('kind', form) ?? 'permanent';
  const [state, reload] = useAsync((signal) => api.list({ q: search || undefined, page, pageSize: 25 }, signal), [search, page]);

  const handleError = (error: unknown) => {
    if (isApiError(error) && error.kind === 'unauthorized') {
      onAuthError(error);
      return;
    }
    const errors = fieldErrors(error);
    if (Object.keys(errors).length > 0) form.setFields(Object.entries(errors).map(([name, list]) => ({ name, errors: list })) as never);
    setFormError(Object.values(errors).flat()[0] ?? errorMessage(error));
  };

  const submit = async (values: FormValues) => {
    setFormError(null);
    try {
      await api.create({ sourcePath: values.sourcePath, targetPath: values.kind === 'gone' ? null : values.targetPath, kind: values.kind, reason: values.reason });
      message.success('Redirect saved');
      setCreating(false);
      form.resetFields();
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const remove = async (row: Redirect) => {
    try {
      await api.remove(row.id);
      message.success('Redirect deleted');
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const rows = state.status === 'ready' ? state.data.data : [];

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'SEO redirects' }]}
        title="SEO redirects"
        description="Old addresses that should send visitors and search engines somewhere else. Changing a published slug creates one of these automatically."
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined aria-hidden="true" />}
            onClick={() => {
              setFormError(null);
              form.resetFields();
              form.setFieldsValue({ kind: 'permanent' });
              setCreating(true);
            }}
          >
            New redirect
          </Button>
        }
      />
      {state.status === 'error' && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />}
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search
          allowClear
          placeholder="Search a path"
          defaultValue={search}
          onSearch={(value) => {
            setPage(1);
            setSearch(value.trim());
          }}
          style={{ width: 320 }}
          aria-label="Search redirects"
        />
      </Space>
      <Table<Redirect>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={rows}
        scroll={{ x: 900 }}
        pagination={
          state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, onChange: setPage, showSizeChanger: false } : false
        }
        locale={{
          emptyText: state.status === 'ready' ? <EmptyState title="No redirects" description="Nothing has moved yet. Redirects appear here when a published address changes." /> : ' ',
        }}
        columns={[
          { title: 'From', dataIndex: 'sourcePath', render: (value: string) => <code>{value}</code> },
          {
            title: 'To',
            render: (_: unknown, row) => (row.targetPath ? <code>{row.targetPath}</code> : <Typography.Text type="secondary">Removed permanently</Typography.Text>),
          },
          { title: 'Type', render: (_: unknown, row) => <StatusTag status={row.kind === 'gone' ? 'gone' : 'active'} /> },
          { title: 'Reason', dataIndex: 'reason', render: (value: string | null) => value ?? '—' },
          { title: 'Created', dataIndex: 'createdAt', render: formatDateTime },
          {
            title: <span className="sr-only">Actions</span>,
            render: (_: unknown, row) => (
              <Popconfirm title="Delete this redirect?" description="Visitors following the old address will get a 404." okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => void remove(row)}>
                <Button type="link" danger aria-label={`Delete redirect from ${row.sourcePath}`}>
                  Delete
                </Button>
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal open={creating} title="New redirect" okText="Save" onOk={() => form.submit()} onCancel={() => setCreating(false)} destroyOnHidden>
        {formError && <Alert type="error" showIcon role="alert" message={formError} style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit} initialValues={{ kind: 'permanent' }}>
          <Form.Item label="Type" name="kind">
            <Radio.Group
              options={[
                { value: 'permanent', label: 'Moved permanently (301)' },
                { value: 'gone', label: 'Removed for good (410)' },
              ]}
              optionType="button"
            />
          </Form.Item>
          <Form.Item label="Old address" name="sourcePath" rules={[{ required: true, message: 'Enter the old path' }]} extra="Site-relative, for example /business/old-name">
            <Input placeholder="/business/old-name" />
          </Form.Item>
          {kind === 'permanent' && (
            <Form.Item label="New address" name="targetPath" rules={[{ required: true, message: 'Enter the new path' }]} extra="Must be a path on this site.">
              <Input placeholder="/business/new-name" />
            </Form.Item>
          )}
          <Form.Item label="Reason" name="reason" extra="Recorded with the redirect and in the audit log.">
            <Input maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
