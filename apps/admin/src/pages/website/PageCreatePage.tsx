import { useRef } from 'react';
import { App, Form, Input, Select, Typography } from 'antd';
import { CheckCircleOutlined, EditOutlined, EyeOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router';
import { pagesApi } from '@/api/settings';
import { MediaField } from '@/components/MediaField';
import { RecordEditorPage, SectionCard } from '@/components/ui';
import { RichTextEditorLazy } from '@/components/RichTextEditorLazy';
import { brand } from '@/config/theme';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { PermalinkField } from '@/components/PermalinkField';
import { slugify } from '@/shared/slug';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  slug: string;
  title: string;
  body: string;
  layout: 'rightSidebar' | 'leftSidebar' | 'fullWidth';
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  ogImageMediaId?: string | null;
}

function BodyField({ value, onChange }: { value?: string; onChange?: (html: string) => void }) {
  return <RichTextEditorLazy value={value ?? ''} onChange={(html) => onChange?.(html)} ariaLabel="Page content" minHeight={360} />;
}

/** A named group of fields, announced as one (the same section the other editors use). */
function Section({ title, description }: { title: string; description: string }) {
  return (
    <div className="ms-form-section">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

const NEXT_STEPS = [
  { icon: <EditOutlined />, title: 'Saved as a draft', text: 'Nobody outside the admin can see it yet.' },
  { icon: <CheckCircleOutlined />, title: 'Checked before publishing', text: 'A title and at least 200 characters of real copy, with no placeholder text.' },
  { icon: <EyeOutlined />, title: 'Published when you choose', text: 'It then answers at its address and joins the footer and the sitemap.' },
];

/**
 * A new page (SRS CFG 002 as amended in 1.7).
 *
 * The address is the one thing here that cannot be changed later, so it is
 * asked for once, plainly, with the URL shown as it will be. It is suggested
 * from the title and left editable; the server validates it either way, and its
 * refusal — reserved, taken, or not a plain address — lands on this field.
 *
 * The fields are laid out by hand in the same groups as the page editor —
 * details, content, layout, search appearance — rather than flowed into
 * columns, which put the rich-text body beside the SEO title.
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
      await pagesApi().create({
        ...values,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        seoKeywords: values.seoKeywords || null,
        ogImageMediaId: values.ogImageMediaId || null,
        bodyFormat: 'html',
      });
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
      initialValues={{ slug: '', title: '', body: '', layout: 'rightSidebar' }}
      saving={saving}
      error={error}
      status="Not saved yet"
      submitLabel="Create page"
      onSubmit={save}
      columns={false}
      aside={
        <>
          <SectionCard title="About the address" style={{ marginBottom: 16 }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0, display: 'flex', gap: 10 }}>
              <LinkOutlined aria-hidden="true" style={{ color: brand.primary, marginTop: 4 }} />
              <span>It cannot be changed later. To move a page, create a new one and redirect the old address.</span>
            </Typography.Paragraph>
          </SectionCard>
          <SectionCard title="What happens next">
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {NEXT_STEPS.map((step) => (
                <li key={step.title} style={{ display: 'flex', gap: 12 }}>
                  <span aria-hidden="true" className="ms-stat-icon" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 9, flexShrink: 0 }}>
                    {step.icon}
                  </span>
                  <span>
                    <Typography.Text strong style={{ display: 'block' }}>
                      {step.title}
                    </Typography.Text>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {step.text}
                    </Typography.Text>
                  </span>
                </li>
              ))}
            </ol>
          </SectionCard>
        </>
      }
    >
      <Section title="Page details" description="The heading visitors see and the address the page is published at." />
      <Form.Item
        label="Title"
        name="title"
        rules={[{ required: true, min: 3, message: 'A title of at least 3 characters is required' }]}
        extra="Shown as the page heading and in the footer link."
      >
        <Input
          maxLength={180}
          showCount
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
      <Form.Item name="slug" rules={[{ required: true, message: 'An address is required' }]} style={{ marginBottom: 8 }}>
        <PermalinkField base="" source="title" onSave={undefined} note="Addresses the site already uses — blog, business, contact — are refused. A page's address cannot be changed after it is created." />
      </Form.Item>

      <Section title="Content" description="Headings, lists, links and emphasis are kept; scripts and styles are removed when you save." />
      <Form.Item name="body" rules={[{ required: true, message: 'Content is required' }]}>
        <BodyField />
      </Form.Item>

      <Section title="Layout" description="Where the supporting column sits, or whether the page runs full width. It never changes what the page says." />
      <Form.Item label="Page layout" name="layout">
        <Select
          style={{ maxWidth: 360 }}
          options={[
            { value: 'rightSidebar', label: 'Sidebar on the right' },
            { value: 'leftSidebar', label: 'Sidebar on the left' },
            { value: 'fullWidth', label: 'Full width (no sidebar)' },
          ]}
        />
      </Form.Item>

      <Section title="Search appearance" description="How this page appears in search results and when shared. Each falls back to the page title and the site image when empty." />
      <div className="ms-form-pair">
        <Form.Item label="SEO title" name="seoTitle" extra="Defaults to the page title.">
          <Input maxLength={180} showCount placeholder="e.g. Accessibility statement" />
        </Form.Item>
        <Form.Item label="Keywords" name="seoKeywords" extra="Comma separated. Search engines ignore this tag; it will not affect ranking.">
          <Input maxLength={255} placeholder="e.g. accessibility, melbourne, directory" />
        </Form.Item>
      </div>
      <Form.Item label="Meta description" name="seoDescription">
        <Input.TextArea rows={3} maxLength={300} showCount placeholder="The summary shown under the title in search results" />
      </Form.Item>
      <Form.Item label="Share image" name="ogImageMediaId" extra="Used when this page is shared. Empty uses the site image." style={{ marginBottom: 0 }}>
        <MediaField emptyLabel="The site image is used" clearLabel="Use the site image" aspectRatio="1.91 / 1" />
      </Form.Item>
    </RecordEditorPage>
  );
}
