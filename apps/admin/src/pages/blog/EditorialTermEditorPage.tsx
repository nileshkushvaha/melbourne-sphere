import { useEffect } from 'react';
import { App, Form, Input } from 'antd';
import { useNavigate, useParams } from 'react-router';
import { blogApi, type BlogTerm } from '@/api/blog';
import { RecordEditorPage } from '@/components/ui';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import type { EditorialTermsConfig } from './editorial-configs';

interface Values {
  name: string;
  landingContent?: string;
}

/**
 * One blog category or tag on its own route (SRS BLOG 005). Landing content is
 * Markdown that decides whether the public landing page is indexable at all, so
 * it is written on a page with room rather than in a dialog.
 */
export function EditorialTermEditorPage({ config }: { config: EditorialTermsConfig }) {
  const { id } = useParams();
  const creating = id === undefined;
  const api = blogApi();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<Values>();
  const { saving, error, submit } = useRecordEditor<Values>(form);
  const listHref = `/${config.kind}`;

  // The API lists terms rather than serving one, which is the cheaper contract
  // for a set this small; the record is picked out of that list.
  const [state] = useAsync<BlogTerm | null>((signal) => (creating ? Promise.resolve(null) : api.listTerms(config.kind, signal).then((rows) => rows.find((row) => row.id === id) ?? null)), [config.kind, id]);
  const term = state.status === 'ready' ? state.data : null;
  const title = creating ? `Add ${config.singular.toLowerCase()}` : (term?.name ?? config.singular);
  useDocumentTitle(title);

  useEffect(() => {
    if (!term) return;
    form.setFieldsValue({ name: term.name, landingContent: term.landingContent ?? '' });
  }, [term, form]);

  const save = () =>
    submit(async (values) => {
      const body = { name: values.name, landingContent: values.landingContent || null };
      if (creating) {
        await api.createTerm(config.kind, body);
        message.success(`${config.singular} created`);
      } else {
        await api.updateTerm(config.kind, id, { ...body, expectedVersion: term?.version ?? 0 });
        message.success(`${config.singular} saved`);
      }
    }).then((ok) => {
      if (ok) navigate(listHref);
    });

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Editorial' }, { label: config.title, href: listHref }, { label: title }]}
      title={title}
      description={creating ? config.intro : undefined}
      listHref={listHref}
      listLabel={`All ${config.title.toLowerCase()}`}
      form={form}
      loading={!creating && state.status === 'loading'}
      saving={saving}
      error={error ?? (state.status === 'error' ? state.message : null)}
      status={term ? `Version ${term.version} · ${term.postCount} article${term.postCount === 1 ? '' : 's'}` : 'Not saved yet'}
      submitLabel={creating ? 'Create' : 'Save'}
      onSubmit={save}
    >
      <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Name is required' }]}>
        <Input maxLength={80} />
      </Form.Item>
      <Form.Item label="Landing content (Markdown)" name="landingContent" extra="Shown on the landing page. Without it the page is not indexed.">
        <Input.TextArea rows={10} maxLength={5000} showCount />
      </Form.Item>
    </RecordEditorPage>
  );
}
