import { useRef } from 'react';
import { App, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router';
import { pagesApi } from '@/api/settings';
import { RecordEditorPage } from '@/components/ui';
import { RichTextEditorLazy } from '@/components/RichTextEditorLazy';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { PermalinkField } from '@/components/PermalinkField';
import { slugify } from '@/shared/slug';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  slug: string;
  title: string;
  body: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

function BodyField({ value, onChange }: { value?: string; onChange?: (html: string) => void }) {
  return <RichTextEditorLazy value={value ?? ''} onChange={(html) => onChange?.(html)} ariaLabel="Page content" minHeight={320} />;
}

/**
 * A new page (SRS CFG 002 as amended in 1.7).
 *
 * The address is the one thing here that cannot be changed later, so it is
 * asked for once, plainly, with the URL shown as it will be. It is suggested
 * from the title and left editable; the server validates it either way, and its
 * refusal — reserved, taken, or not a plain address — lands on this field.
 */
export function PageCreatePage() {
  useDocumentTitle('New page');
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<Values>();
  const { saving, error, submit } = useRecordEditor<Values>(form);
  // The address follows the title only while it still matches the title. Once
  // the editor has written their own, the title stops overwriting it — and
  // this holds without tracking whether they "have edited it yet", which was a
  // separate piece of state that could disagree with the field.
  const lastTitle = useRef('');

  const save = () =>
    submit(async (values) => {
      await pagesApi().create({ ...values, bodyFormat: 'html' });
      message.success('Page created as a draft');
    }).then((ok) => {
      if (ok) navigate('/website/pages');
    });

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Website' }, { label: 'Pages', href: '/website/pages' }, { label: 'New page' }]}
      title="New page"
      description="Published at an address you choose. Starts as a draft."
      listHref="/website/pages"
      listLabel="All pages"
      form={form}
      initialValues={{ slug: '', title: '', body: '' }}
      saving={saving}
      error={error}
      submitLabel="Create page"
      onSubmit={save}
      aside={
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 8, padding: 16 }}>
          <Typography.Text strong>About the address</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            It cannot be changed later. To move a page, create a new one and redirect the old address.
          </Typography.Paragraph>
        </div>
      }
    >
      <Form.Item
        label="Title"
        name="title"
        rules={[{ required: true, min: 3, message: 'A title of at least 3 characters is required' }]}
        extra="Shown as the page heading and in the footer link."
      >
        <Input
          maxLength={180}
          placeholder="e.g. Community guidelines"
          onChange={(event) => {
            const title = event.target.value;
            const current = String(form.getFieldValue('slug') ?? '');
            if (current === '' || current === slugify(lastTitle.current)) form.setFieldValue('slug', slugify(title));
            lastTitle.current = title;
          }}
        />
      </Form.Item>

      {/* The address is shown the way it is everywhere else in the admin: a
          line under the title, made from the title until someone changes it. */}
      <Form.Item name="slug" rules={[{ required: true, message: 'An address is required' }]} style={{ marginBottom: 20 }}>
        <PermalinkField base="" source="title" onSave={undefined} note="Addresses the site already uses — blog, business, contact — are refused. A page's address cannot be changed after it is created." />
      </Form.Item>

      <Form.Item label="Content" name="body" rules={[{ required: true, message: 'Content is required' }]} extra="Headings, lists, links and emphasis are kept; scripts and styles are removed.">
        <BodyField />
      </Form.Item>

      <Form.Item label="SEO title" name="seoTitle" extra="Defaults to the page title.">
        <Input maxLength={180} placeholder="e.g. Accessibility statement" />
      </Form.Item>
      <Form.Item label="Meta description" name="seoDescription" style={{ marginBottom: 0 }}>
        <Input.TextArea rows={3} maxLength={300} showCount />
      </Form.Item>
    </RecordEditorPage>
  );
}
