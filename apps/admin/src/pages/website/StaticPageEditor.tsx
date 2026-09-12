import { useEffect, useState, type ReactNode } from 'react';
import { Alert, App, Button, Form, Input, Space } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { pagesApi, type StaticPage } from '@/api/settings';
import { isApiError } from '@/api/errors';
import { RichTextEditorLazy } from '@/components/RichTextEditorLazy';
import { MediaPicker } from '@/components/MediaPicker';
import { variantUrl } from '@/api/media';
import { SectionCard, StickyActions } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

export interface StaticPageFormValues {
  title: string;
  body: string;
  seoTitle?: string | null;
  seoKeywords?: string | null;
  ogImageMediaId?: string | null;
  seoDescription?: string | null;
  revisionReason?: string;
}

function BodyField({ value, onChange, disabled }: { value?: string; onChange?: (html: string) => void; disabled?: boolean }) {
  return <RichTextEditorLazy value={value ?? ''} onChange={(html) => onChange?.(html)} disabled={disabled} ariaLabel="Page content" minHeight={320} />;
}

/**
 * The editor for one information page (SRS CFG 002), shared by the policy-page
 * screen and the About screen so both save, publish and report blockers
 * identically — the two screens differ only in how the page is chosen and what
 * is explained beside the fields.
 */
export function StaticPageEditor({
  page,
  onSaved,
  bodyLabel = 'Content',
  bodyDescription = 'Sanitised rich text: headings, lists, links and emphasis. Scripts and styles are removed on save.',
  intro,
}: {
  page: StaticPage;
  /** Called after a successful save or status change so the screen reloads. */
  onSaved: () => void;
  bodyLabel?: string;
  bodyDescription?: string;
  /** Screen-specific explanation shown above the fields. */
  intro?: ReactNode;
}) {
  const api = pagesApi();
  const { message } = App.useApp();
  const { can } = useCapabilities();
  const [picking, setPicking] = useState(false);
  // The image chosen in this session, before the page is saved and reloaded.
  const [chosen, setChosen] = useState<{ url: string; alt: string } | null>(null);
  const canManage = can(PERMISSION.settingsManage);
  // What was just chosen, else what is stored; null means the site image.
  const shareImage = chosen ?? page.ogImage ?? null;
  const [form] = Form.useForm<StaticPageFormValues>();
  const { saving, error, setError, submit } = useRecordEditor<StaticPageFormValues>(form);

  useEffect(() => {
    form.setFieldsValue({
      title: page.title,
      body: page.bodyFormat === 'markdown' ? page.sanitizedBody : page.bodySource || page.sanitizedBody,
      seoTitle: page.seoTitle,
      seoKeywords: page.seoKeywords,
      ogImageMediaId: page.ogImageMediaId,
      seoDescription: page.seoDescription,
      revisionReason: '',
    });
  }, [page, form]);

  const save = () =>
    submit(async (values) => {
      try {
        await api.save(page.slug, { ...values, bodyFormat: 'html', expectedVersion: page.version });
      } catch (thrown) {
        // The publication gate answers 409 with the list of what is missing;
        // that list is the message, not the generic conflict wording.
        if (isApiError(thrown) && thrown.code === 'PUBLICATION_BLOCKED') {
          setError(thrown.fields.publication?.join(' · ') ?? thrown.userMessage);
          return;
        }
        throw thrown;
      }
      message.success('Page saved');
      onSaved();
    });

  return (
    <Form<StaticPageFormValues> form={form} layout="vertical" requiredMark="optional" onFinish={() => void save()} disabled={!canManage}>
      {error && <Alert type="error" showIcon role="alert" message={error} style={{ marginBottom: 16 }} />}
      {intro}
      {page.publicationBlockers.length > 0 && page.status !== 'published' && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Not ready to publish"
          description={
            <ul style={{ margin: 0, paddingInlineStart: 18 }}>
              {page.publicationBlockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          }
        />
      )}

      <SectionCard title={page.title} description={page.purpose}>
        <Form.Item label="Title" name="title" rules={[{ required: true, min: 3, message: 'Title is required' }]} style={{ marginBottom: 0 }}>
          <Input maxLength={180} />
        </Form.Item>
      </SectionCard>

      <SectionCard title={bodyLabel} description={bodyDescription} bodyPadding={0}>
        <Form.Item name="body" noStyle rules={[{ required: true, message: 'Content is required' }]}>
          <BodyField disabled={!canManage} />
        </Form.Item>
      </SectionCard>

      <SectionCard title="Search appearance">
        <Form.Item label="SEO title" name="seoTitle" extra="Defaults to the page title.">
          <Input maxLength={180} />
        </Form.Item>
        <Form.Item label="Meta description" name="seoDescription">
          <Input.TextArea rows={3} maxLength={300} showCount placeholder="The summary shown under the title in search results" />
        </Form.Item>
        <Form.Item label="Keywords" name="seoKeywords" extra="Comma separated. Search engines ignore this tag; it will not affect ranking.">
          <Input maxLength={255} placeholder="e.g. about, melbourne, directory" />
        </Form.Item>
        {/* A page has no featured image of its own, so an empty share image
            falls back to the site-wide one in General settings. */}
        <Form.Item name="ogImageMediaId" hidden>
          <Input />
        </Form.Item>
        <Form.Item label="Share image" extra="Used when this page is shared. Empty uses the site image." style={{ marginBottom: 0 }}>
          <Space align="start" wrap size={16}>
            {shareImage ? (
              <img src={shareImage.url} alt={shareImage.alt} style={{ width: 200, height: 105, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--ms-border)' }} />
            ) : (
              <div style={{ width: 200, height: 105, borderRadius: 8, border: '1px dashed var(--ms-border)', display: 'grid', placeItems: 'center', color: 'var(--ms-text-subtle)' }}>
                <PictureOutlined aria-hidden="true" style={{ fontSize: 22 }} />
              </div>
            )}
            <Space direction="vertical" size={8}>
              <Button icon={<PictureOutlined aria-hidden="true" />} onClick={() => setPicking(true)} disabled={!canManage}>
                {shareImage ? 'Replace image' : 'Choose image'}
              </Button>
              {shareImage && (
                <Button
                  onClick={() => {
                    form.setFieldValue('ogImageMediaId', null);
                    setChosen(null);
                  }}
                  disabled={!canManage}
                >
                  Use the site image
                </Button>
              )}
            </Space>
          </Space>
        </Form.Item>
      </SectionCard>

      <MediaPicker
        open={picking}
        onCancel={() => setPicking(false)}
        onPick={(assets) => {
          const asset = assets[0];
          setPicking(false);
          if (!asset) return;
          form.setFieldValue('ogImageMediaId', asset.id);
          setChosen({ url: variantUrl(asset) ?? '', alt: asset.altText ?? '' });
        }}
      />

      {page.status === 'published' && (
        <SectionCard title="Revision note">
          <Form.Item label="Why is this changing?" name="revisionReason" extra="Stored with the revision of the previous published text." style={{ marginBottom: 0 }}>
            <Input maxLength={500} />
          </Form.Item>
        </SectionCard>
      )}

      {canManage && (
        <StickyActions status={page.version > 0 ? `Version ${page.version} · last changed ${formatDateTime(page.updatedAt)}` : 'Never saved'}>
          <Button onClick={onSaved}>Reload</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save page
          </Button>
        </StickyActions>
      )}
    </Form>
  );
}

/**
 * Publish / unpublish for one page, with the API's blockers respected: the
 * button is disabled while the page is not ready, and the reason is already on
 * screen (SRS CFG 002).
 */
export function StaticPagePublishAction({ page, onChanged }: { page: StaticPage; onChanged: () => void }) {
  const api = pagesApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const { can } = useCapabilities();
  if (!can(PERMISSION.settingsManage)) return null;

  const run = async (action: 'publish' | 'unpublish') => {
    try {
      await api.setStatus(page.slug, action, { expectedVersion: page.version });
      message.success(action === 'publish' ? 'Page published' : 'Page unpublished');
      onChanged();
    } catch (err) {
      if (isApiError(err) && err.kind === 'unauthorized') onAuthError(err);
      else message.error(isApiError(err) && err.code === 'PUBLICATION_BLOCKED' ? (err.fields.publication?.join(' · ') ?? err.userMessage) : errorMessage(err));
    }
  };

  return page.status === 'published' ? (
    <Button danger onClick={() => void run('unpublish')}>
      Unpublish
    </Button>
  ) : (
    <Button type="primary" disabled={page.publicationBlockers.length > 0} onClick={() => void run('publish')}>
      Publish
    </Button>
  );
}
