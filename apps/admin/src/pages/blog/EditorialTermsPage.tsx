import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Space, Switch, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { blogApi, type Author, type BlogTerm, type BlogTermKind } from '@/api/blog';
import type { EditorialTermsConfig } from './editorial-configs';

type Row = (Author | BlogTerm) & { landingContent?: string | null; bio?: string | null };
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/** Authors, blog categories and tags share one screen (SRS BLOG 001/005). */
export function EditorialTermsPage({ config }: { config: EditorialTermsConfig }) {
  useDocumentTitle(config.title);
  const api = blogApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const isAuthors = config.kind === 'authors';
  const [state, reload] = useAsync<Row[]>((signal) => (isAuthors ? api.listAuthors(signal) : api.listTerms(config.kind as BlogTermKind, signal)), [config.kind]);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form] = Form.useForm<Record<string, string>>();

  const handleError = (error: unknown) => {
    if (isApiError(error) && error.kind === 'unauthorized') {
      onAuthError(error);
      return;
    }
    if (isApiError(error) && error.code === 'STALE_VERSION') {
      setFormError('This item was changed by someone else. Close, reload and try again.');
      return;
    }
    const errors = fieldErrors(error);
    form.setFields(Object.entries(errors).map(([name, list]) => ({ name, errors: list })) as never);
    setFormError(Object.values(errors).flat()[0] ?? errorMessage(error));
  };

  const submit = async (values: Record<string, string>) => {
    setFormError(null);
    try {
      if (editing === 'new') {
        if (isAuthors) await api.createAuthor({ displayName: values.displayName, bio: values.bio || null });
        else await api.createTerm(config.kind as BlogTermKind, { name: values.name, landingContent: values.landingContent || null });
        message.success(`${config.singular} created`);
      } else if (editing) {
        const expectedVersion = editing.version;
        if (isAuthors) await api.updateAuthor(editing.id, { displayName: values.displayName, bio: values.bio || null, expectedVersion });
        else await api.updateTerm(config.kind as BlogTermKind, editing.id, { name: values.name, landingContent: values.landingContent || null, expectedVersion });
        message.success(`${config.singular} saved`);
      }
      setEditing(null);
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const toggleActive = async (row: Row) => {
    try {
      if (isAuthors) await api.setAuthorActive(row.id, !row.active, row.version);
      else await api.setTermActive(config.kind as BlogTermKind, row.id, !row.active, row.version);
      message.success(row.active ? 'Deactivated' : 'Activated');
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const rows: Row[] = state.status === 'ready' ? (state.data as Row[]) : [];

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="start" wrap>
        <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>
          {config.title}
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined aria-hidden="true" />}
          onClick={() => {
            setFormError(null);
            form.resetFields();
            setEditing('new');
          }}
        >
          New {config.singular.toLowerCase()}
        </Button>
      </Space>
      <Typography.Paragraph type="secondary">{config.intro}</Typography.Paragraph>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<Row>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 700 }}
        columns={[
          {
            title: 'Name',
            render: (_: unknown, row) => (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => {
                  setFormError(null);
                  form.setFieldsValue(isAuthors ? { displayName: (row as Author).displayName, bio: (row as Author).bio ?? '' } : { name: (row as BlogTerm).name, landingContent: (row as BlogTerm).landingContent ?? '' });
                  setEditing(row);
                }}
              >
                {isAuthors ? (row as Author).displayName : (row as BlogTerm).name}
              </Button>
            ),
          },
          { title: 'Slug', dataIndex: 'slug', render: (v: string) => <code>{v}</code> },
          { title: 'Articles', dataIndex: 'postCount' },
          { title: 'Status', dataIndex: 'active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'active' : 'inactive'}</Tag> },
          { title: 'Updated', dataIndex: 'updatedAt', render: formatDateTime },
          { title: <span className="sr-only">Actions</span>, render: (_: unknown, row) => <Switch checked={row.active} onChange={() => void toggleActive(row)} aria-label={`${row.active ? 'Deactivate' : 'Activate'} ${isAuthors ? (row as Author).displayName : (row as BlogTerm).name}`} /> },
        ]}
        locale={{ emptyText: state.status === 'ready' ? `No ${config.title.toLowerCase()} yet.` : ' ' }}
      />
      <Modal
        open={editing !== null}
        title={editing === 'new' ? `New ${config.singular.toLowerCase()}` : `Edit ${config.singular.toLowerCase()}`}
        okText={editing === 'new' ? 'Create' : 'Save'}
        onOk={() => form.submit()}
        onCancel={() => setEditing(null)}
        destroyOnHidden
      >
        {formError && <Alert type="error" showIcon role="alert" message={formError} style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          {isAuthors ? (
            <>
              <Form.Item label="Display name" name="displayName" rules={[{ required: true, message: 'Display name is required' }]}>
                <Input maxLength={120} />
              </Form.Item>
              <Form.Item label="Public biography" name="bio" extra="Plain text shown in the byline card.">
                <Input.TextArea rows={4} maxLength={2000} />
              </Form.Item>
            </>
          ) : (
            <>
              <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
                <Input maxLength={80} />
              </Form.Item>
              <Form.Item label="Landing content (Markdown)" name="landingContent" extra="Shown on the landing page. Without it the page is not indexed.">
                <Input.TextArea rows={6} maxLength={5000} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </div>
  );
}
