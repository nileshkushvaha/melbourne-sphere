import { useState } from 'react';
import { App, Form, Input, Typography } from 'antd';
import { useNavigate } from 'react-router';
import { pagesApi } from '@/api/settings';
import { RecordEditorPage } from '@/components/ui';
import { RichTextEditorLazy } from '@/components/RichTextEditorLazy';
import { useRecordEditor } from '@/shared/useRecordEditor';
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

/** Turns a title into a plausible address, which the editor can then change. */
function slugFrom(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
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
  const slug = Form.useWatch('slug', form) ?? '';
  const { saving, error, submit } = useRecordEditor<Values>(form);
  // Only until the editor types an address of their own: after that the title
  // no longer overwrites what they wrote.
  const [slugEdited, setSlugEdited] = useState(false);

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
      description="A page of your own, published at an address you choose. It starts as a draft and appears in the site footer once you publish it."
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
            It cannot be changed once the page exists, because anything that links to a page links to its address. If you need a different one later, create the new page and add a redirect from the old address under SEO redirects.
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
          onChange={(event) => {
            if (!slugEdited) form.setFieldValue('slug', slugFrom(event.target.value));
          }}
        />
      </Form.Item>

      <Form.Item
        label="Address"
        name="slug"
        rules={[{ required: true, message: 'An address is required' }]}
        extra={
          <>
            Lower-case letters, numbers and hyphens. Addresses the site already uses — blog, business, contact — are refused.
            {slug && (
              <>
                {' '}
                The page will be at <code>/{slug}</code>.
              </>
            )}
          </>
        }
      >
        <Input maxLength={64} onChange={() => setSlugEdited(true)} />
      </Form.Item>

      <Form.Item label="Content" name="body" rules={[{ required: true, message: 'Content is required' }]} extra="Sanitised on save: headings, lists, links and emphasis are kept, scripts and styles are removed.">
        <BodyField />
      </Form.Item>

      <Form.Item label="SEO title" name="seoTitle" extra="Defaults to the page title.">
        <Input maxLength={180} />
      </Form.Item>
      <Form.Item label="Meta description" name="seoDescription" style={{ marginBottom: 0 }}>
        <Input.TextArea rows={3} maxLength={300} showCount />
      </Form.Item>
    </RecordEditorPage>
  );
}
