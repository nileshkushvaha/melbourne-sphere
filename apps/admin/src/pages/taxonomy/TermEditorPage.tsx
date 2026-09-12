import { useEffect } from 'react';
import { App, Form, Input, InputNumber, Select } from 'antd';
import { useNavigate, useParams } from 'react-router';
import { taxonomyApi, type TermItem } from '@/api/taxonomy';
import { RecordEditorPage } from '@/components/ui';
import { PermalinkField } from '@/components/PermalinkField';
import { slugify } from '@/shared/slug';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import type { TermsPageConfig } from './TermsPage';

/**
 * One taxonomy term on its own route (SRS CFG 003, ADM 002).
 *
 * The same component serves categories, services and local areas: the fields
 * come from the screen's config, so a new taxonomy is a config entry rather
 * than another form. Editing is a page and not a dialog, for the reasons
 * recorded on `RecordEditorPage`.
 */
export function TermEditorPage({ config }: { config: TermsPageConfig }) {
  const { id } = useParams();
  const isNew = id === undefined;
  const api = taxonomyApi<TermItem>(config.kind);
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  // The address is made from the name until someone changes it, so the row
  // needs to see the name being typed.
  const name = Form.useWatch('name', form) as string | undefined;
  const { saving, error, submit } = useRecordEditor<Record<string, unknown>>(form);

  const [state] = useAsync(() => (isNew ? Promise.resolve(null) : api.get(id)), [config.kind, id]);
  const term = state.status === 'ready' ? state.data : null;
  // A term can never be its own parent, so the current record is excluded.
  const [parents] = useAsync(
    () => (config.kind === 'categories' ? api.list({ pageSize: 50, status: 'active', sort: 'name' }).then((r) => r.data.filter((entry) => !('parentId' in entry) || entry.parentId === null)) : Promise.resolve([] as TermItem[])),
    [config.kind],
  );

  // `initialValues` only applies when the form mounts, and the record arrives
  // after that, so the loaded values are pushed in when they land.
  useEffect(() => {
    if (!term) return;
    form.setFieldsValue({ ...term, synonyms: 'synonyms' in term ? term.synonyms : undefined });
  }, [term, form]);

  const listHref = `/${config.kind}`;
  const title = isNew ? `Add ${config.singular.toLowerCase()}` : (term?.name ?? config.singular);
  useDocumentTitle(title);

  const save = () =>
    submit(async (values) => {
      const body: Record<string, unknown> = {};
      for (const field of config.fields) if (values[field.name] !== undefined) body[field.name] = values[field.name] === '' ? null : values[field.name];
      if (isNew) {
        await api.create(body);
        message.success(`${config.singular} created`);
      } else {
        await api.update(id, { ...body, expectedVersion: term?.version ?? 0 });
        message.success(`${config.singular} saved`);
      }
    }).then((ok) => {
      if (ok) navigate(listHref);
    });

  return (
    <RecordEditorPage
      crumbs={[{ label: 'Business' }, { label: config.title, href: listHref }, { label: title }]}
      title={title}
      description={isNew ? config.intro : undefined}
      listHref={listHref}
      listLabel={`All ${config.title.toLowerCase()}`}
      form={form}
      loading={!isNew && state.status === 'loading'}
      saving={saving}
      error={error ?? (state.status === 'error' ? state.message : null)}
      status={term ? `Version ${term.version}` : 'Not saved yet'}
      submitLabel={isNew ? 'Create' : 'Save'}
      onSubmit={save}
    >
      {config.fields.map((field) =>
        field.input === 'permalink' ? (
          // An ordinary form control, so Ant validates it and shows any
          // refusal from the API under this row rather than only at the top.
          <Form.Item key={field.name} name={field.name} style={{ marginBottom: 0 }}>
            <PermalinkField base={field.base ?? ''} placeholder={name ? slugify(name) : undefined} note={field.help} />
          </Form.Item>
        ) : (
        <Form.Item key={field.name} label={field.label} name={field.name} extra={field.help} rules={field.required ? [{ required: true, message: `${field.label} is required` }] : undefined}>
          {field.input === 'textarea' ? (
            <Input.TextArea rows={4} maxLength={field.max} />
          ) : field.input === 'number' ? (
            <InputNumber min={0} max={10_000} style={{ width: 160 }} />
          ) : field.input === 'tags' ? (
            <Select mode="tags" tokenSeparators={[',']} placeholder="Add synonyms" />
          ) : field.input === 'parent' ? (
            <Select
              allowClear
              placeholder="None (top-level)"
              options={parents.status === 'ready' ? parents.data.filter((entry) => entry.id !== term?.id).map((entry) => ({ value: entry.id, label: entry.name })) : []}
            />
          ) : (
            <Input maxLength={field.max} placeholder={field.placeholder} />
          )}
        </Form.Item>
        ),
      )}
    </RecordEditorPage>
  );
}
