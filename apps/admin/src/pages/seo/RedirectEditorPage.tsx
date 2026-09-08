import { App, Form, Input, Radio } from 'antd';
import { useNavigate } from 'react-router';
import { seoApi, type RedirectKind } from '@/api/seo';
import { RecordEditorPage } from '@/components/ui';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  sourcePath: string;
  targetPath?: string;
  kind: RedirectKind;
  reason?: string;
}

/**
 * A new redirect rule on its own route (SRS SEO 004).
 *
 * There is no edit route: a redirect is not amended, it is deleted and
 * replaced, because a rule that quietly changes destination is harder to
 * account for than one that was removed and a new one created.
 */
export function RedirectEditorPage() {
  useDocumentTitle('New redirect');
  const api = seoApi();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<Values>();
  const kind = Form.useWatch('kind', form) ?? 'permanent';
  const { saving, error, submit } = useRecordEditor<Values>(form);

  const save = () =>
    submit(async (values) => {
      // A "gone" rule has no destination by definition; the API validates the
      // paths again and refuses anything that would leave this site.
      await api.create({ sourcePath: values.sourcePath, targetPath: values.kind === 'gone' ? null : values.targetPath, kind: values.kind, reason: values.reason });
      message.success('Redirect saved');
    }).then((ok) => {
      if (ok) navigate('/redirects');
    });

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Configuration' }, { label: 'SEO redirects', href: '/redirects' }, { label: 'New redirect' }]}
      title="New redirect"
      description="Send an old address somewhere else, or mark it as removed for good. Changing a published slug creates one of these automatically, so this screen is for pages that moved outside the admin."
      listHref="/redirects"
      listLabel="All redirects"
      form={form}
      initialValues={{ kind: 'permanent' as RedirectKind }}
      saving={saving}
      error={error}
      submitLabel="Save redirect"
      onSubmit={save}
    >
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
      <Form.Item label="Reason" name="reason" extra="Recorded with the redirect and in the audit log." style={{ marginBottom: 0 }}>
        <Input maxLength={500} />
      </Form.Item>
    </RecordEditorPage>
  );
}
