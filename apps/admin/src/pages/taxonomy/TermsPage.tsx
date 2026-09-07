import { useState, type ReactNode } from 'react';
import { Alert, App, Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { useSearchParams } from 'react-router';
import { taxonomyApi, type TermItem, type TermKind, type TermListQuery } from '@/api/taxonomy';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
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

/**
 * Generic list + create/edit + activate/deactivate screen for the three
 * taxonomy resources (SRS CFG 003, ADM 002). State lives in the URL so
 * refresh/back preserve filters; edits carry expectedVersion (SRS API 005).
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
  const [editing, setEditing] = useState<TermItem | 'new' | null>(null);
  const [form] = Form.useForm();
  const [formError, setFormError] = useState<string | null>(null);
  // A term can never be its own parent; null when creating, or when the dialog is closed.
  const editingTermId = editing && editing !== 'new' ? editing.id : null;
  const [parents, reloadParents] = useAsync(() => (config.kind === 'categories' ? api.list({ pageSize: 50, status: 'active', sort: 'name' }).then((r) => r.data.filter((c) => !('parentId' in c) || c.parentId === null)) : Promise.resolve([] as TermItem[])), [config.kind]);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const openEditor = (item: TermItem | 'new') => {
    setFormError(null);
    setEditing(item);
    form.resetFields();
    if (item !== 'new') form.setFieldsValue({ ...item, synonyms: 'synonyms' in item ? item.synonyms : undefined });
  };

  const submit = async (values: Record<string, unknown>) => {
    setFormError(null);
    const body: Record<string, unknown> = {};
    for (const f of config.fields) if (values[f.name] !== undefined) body[f.name] = values[f.name] === '' ? null : values[f.name];
    try {
      if (editing === 'new') {
        await api.create(body);
        message.success(`${config.singular} created`);
      } else if (editing) {
        await api.update(editing.id, { ...body, expectedVersion: editing.version });
        message.success(`${config.singular} saved`);
      }
      setEditing(null);
      reload();
      reloadParents();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') {
        onAuthError(error);
        return;
      }
      if (isApiError(error) && error.code === 'STALE_VERSION') {
        setFormError('This item was changed by someone else. Close, reload the list and try again.');
        return;
      }
      form.setFields(Object.entries(fieldErrors(error)).map(([name, errors]) => ({ name, errors })) as never);
      setFormError(errorMessage(error));
    }
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
        crumbs={[{ label: 'Directory' }, { label: config.title }]}
        title={config.title}
        description={<>{config.intro}</>}
        actions={
          <>
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />} onClick={() => openEditor('new')}>
          New {config.singular.toLowerCase()}
        </Button>
          </>
        }
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search aria-label="Search by name or slug" placeholder="Search name or slug" allowClear defaultValue={q} onSearch={(v) => setParam('q', v.trim() || undefined)} style={{ width: 260 }} />
        <Select aria-label="Filter by status" allowClear placeholder="All" value={status} onChange={(v) => setParam('status', v)} style={{ width: 140 }} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <Select aria-label="Sort by" value={sort} onChange={(v) => setParam('sort', v)} style={{ width: 160 }} options={SORTS.map((s) => ({ value: s, label: `Sort: ${s}` }))} />
        <Select aria-label="Sort direction" value={order} onChange={(v) => setParam('order', v)} style={{ width: 120 }} options={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<TermItem>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 760 }}
        columns={[
          { title: 'Name', dataIndex: 'name', render: (v: string, item) => <Button type="link" style={{ padding: 0 }} onClick={() => openEditor(item)}>{v}</Button> },
          { title: 'Slug', dataIndex: 'slug', render: (v: string) => <code>{v}</code> },
          ...(config.columns ?? []).map((c) => ({ title: c.title, render: (_: unknown, item: TermItem) => c.render(item) })),
          { title: 'Status', dataIndex: 'active', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'active' : 'inactive'}</Tag> },
          { title: 'Updated', dataIndex: 'updatedAt', render: formatDateTime },
          { title: <span className="sr-only">Actions</span>, render: (_: unknown, item) => <Switch checked={item.active} onChange={() => toggleActive(item)} aria-label={`${item.active ? 'Deactivate' : 'Activate'} ${item.name}`} /> },
        ]}
        locale={{ emptyText: state.status === 'ready' ? `No ${config.title.toLowerCase()} match.` : ' ' }}
      />
      <Modal title={editing === 'new' ? `New ${config.singular.toLowerCase()}` : `Edit ${config.singular.toLowerCase()}`} open={editing !== null} onCancel={() => setEditing(null)} okText={editing === 'new' ? 'Create' : 'Save'} onOk={() => form.submit()} destroyOnHidden>
        {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: 12 }} role="alert" />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          {config.fields.map((f) => (
            <Form.Item key={f.name} label={f.label} name={f.name} extra={f.help} rules={f.required ? [{ required: true, message: `${f.label} is required` }] : undefined}>
              {f.input === 'textarea' ? (
                <Input.TextArea rows={4} maxLength={f.max} />
              ) : f.input === 'number' ? (
                <InputNumber min={0} max={10_000} style={{ width: 160 }} />
              ) : f.input === 'tags' ? (
                <Select mode="tags" tokenSeparators={[',']} placeholder="Add synonyms" />
              ) : f.input === 'parent' ? (
                <Select allowClear placeholder="None (top-level)" options={parents.status === 'ready' ? parents.data.filter((p) => p.id !== editingTermId).map((p) => ({ value: p.id, label: p.name })) : []} />
              ) : (
                <Input maxLength={f.max} />
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
}
