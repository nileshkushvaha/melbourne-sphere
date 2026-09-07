import { useEffect, useState } from 'react';
import { Alert, App, Button, Col, Form, Input, List, Row, Typography } from 'antd';
import { useOnError } from '@refinedev/core';
import { pagesApi, type StaticPage } from '@/api/settings';
import { isApiError } from '@/api/errors';
import { toNamePath } from '@/api/businesses';
import { RichTextEditorLazy } from '@/components/RichTextEditorLazy';
import { EmptyState, PageHeader, SectionCard, StatusTag, StickyActions } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

interface FormValues {
  title: string;
  body: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  contactEmail?: string | null;
  revisionReason?: string;
}

function BodyField({ value, onChange, disabled }: { value?: string; onChange?: (html: string) => void; disabled?: boolean }) {
  return <RichTextEditorLazy value={value ?? ''} onChange={(html) => onChange?.(html)} disabled={disabled} ariaLabel="Page content" minHeight={320} />;
}

/**
 * Information pages (SRS CFG 002). Content is sanitised rich text, editing a
 * live page keeps a revision, and publication is refused while the copy is a
 * stub, contains placeholder wording, or the contact routing is unvalidated.
 */
export function StaticPagesPage() {
  useDocumentTitle('Information pages');
  const api = pagesApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const { can } = useCapabilities();
  const canManage = can(PERMISSION.settingsManage);
  const [form] = Form.useForm<FormValues>();
  const [selected, setSelected] = useState<string>('about');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, reload] = useAsync((signal) => api.list(signal), [reloadKey]);

  const pages: StaticPage[] = state.status === 'ready' ? state.data : [];
  const page = pages.find((entry) => entry.slug === selected) ?? pages[0] ?? null;

  useEffect(() => {
    if (!page) return;
    form.setFieldsValue({
      title: page.title,
      body: page.bodyFormat === 'markdown' ? page.sanitizedBody : page.bodySource || page.sanitizedBody,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      contactEmail: page.contactEmail,
      revisionReason: '',
    });
  }, [page, form]);

  const handleError = (err: unknown) => {
    if (isApiError(err) && err.kind === 'unauthorized') {
      onAuthError(err);
      return;
    }
    if (isApiError(err) && err.code === 'STALE_VERSION') {
      setError('This page was changed by someone else. Reload before saving again.');
      return;
    }
    if (isApiError(err) && err.code === 'PUBLICATION_BLOCKED') {
      setError(err.fields.publication?.join(' · ') ?? err.userMessage);
      return;
    }
    const errors = fieldErrors(err);
    if (Object.keys(errors).length > 0) form.setFields(Object.entries(errors).map(([path, list]) => ({ name: toNamePath(path), errors: list })) as never);
    setError(Object.values(errors).flat()[0] ?? errorMessage(err));
  };

  const submit = async (values: FormValues) => {
    if (!page) return;
    setError(null);
    setSaving(true);
    try {
      await api.save(page.slug, { ...values, bodyFormat: 'html', expectedVersion: page.version });
      message.success('Page saved');
      setReloadKey((key) => key + 1);
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (action: 'publish' | 'unpublish') => {
    if (!page) return;
    setError(null);
    try {
      await api.setStatus(page.slug, action, { expectedVersion: page.version });
      message.success(action === 'publish' ? 'Page published' : 'Page unpublished');
      setReloadKey((key) => key + 1);
    } catch (err) {
      handleError(err);
    }
  };

  if (state.status === 'error') return <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'Information pages' }]}
        title="Information pages"
        description="About, Contact, Privacy, Terms and Review guidelines. A page appears in the public footer only once it is published."
        meta={page ? <StatusTag status={page.status} /> : null}
        actions={
          page && canManage ? (
            page.status === 'published' ? (
              <Button danger onClick={() => void setStatus('unpublish')}>
                Unpublish
              </Button>
            ) : (
              <Button type="primary" disabled={page.publicationBlockers.length > 0} onClick={() => void setStatus('publish')}>
                Publish
              </Button>
            )
          ) : null
        }
      />
      {error && <Alert type="error" showIcon role="alert" message={error} style={{ marginBottom: 16 }} />}

      <Row gutter={24}>
        <Col xs={24} lg={7} xl={6}>
          <SectionCard title="Pages" bodyPadding={0}>
            {pages.length === 0 ? (
              <EmptyState title="No pages" description="The five information pages appear here once the API is reachable." />
            ) : (
              <List
                dataSource={pages}
                renderItem={(entry) => (
                  <List.Item
                    onClick={() => setSelected(entry.slug)}
                    style={{ cursor: 'pointer', padding: '12px 16px', background: entry.slug === page?.slug ? 'var(--ant-color-primary-bg)' : undefined }}
                  >
                    <List.Item.Meta
                      title={
                        <button type="button" onClick={() => setSelected(entry.slug)} style={{ all: 'unset', cursor: 'pointer', fontWeight: entry.slug === page?.slug ? 600 : 500 }}>
                          {entry.title}
                        </button>
                      }
                      description={
                        <span>
                          <StatusTag status={entry.status} />
                          {entry.publicationBlockers.length > 0 && entry.status !== 'published' && (
                            <Typography.Text type="secondary" style={{ marginInlineStart: 8, fontSize: 12 }}>
                              {entry.publicationBlockers.length} to fix
                            </Typography.Text>
                          )}
                        </span>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </SectionCard>
        </Col>

        <Col xs={24} lg={17} xl={18}>
          {page && (
            <Form<FormValues> form={form} layout="vertical" requiredMark="optional" onFinish={submit} disabled={!canManage}>
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
                <Form.Item label="Title" name="title" rules={[{ required: true, min: 3, message: 'Title is required' }]}>
                  <Input maxLength={180} />
                </Form.Item>
                {page.slug === 'contact' && (
                  <Form.Item label="Contact address" name="contactEmail" extra="Where enquiries from this page are routed. Validated before the page can be published.">
                    <Input maxLength={255} inputMode="email" />
                  </Form.Item>
                )}
              </SectionCard>

              <SectionCard title="Content" description="Sanitised rich text: headings, lists, links and emphasis. Scripts and styles are removed on save." bodyPadding={0}>
                <Form.Item name="body" noStyle rules={[{ required: true, message: 'Content is required' }]}>
                  <BodyField disabled={!canManage} />
                </Form.Item>
              </SectionCard>

              <SectionCard title="Search appearance">
                <Form.Item label="SEO title" name="seoTitle" extra="Defaults to the page title.">
                  <Input maxLength={180} />
                </Form.Item>
                <Form.Item label="Meta description" name="seoDescription" style={{ marginBottom: 0 }}>
                  <Input.TextArea rows={3} maxLength={300} showCount />
                </Form.Item>
              </SectionCard>

              {page.status === 'published' && (
                <SectionCard title="Revision note">
                  <Form.Item label="Why is this changing?" name="revisionReason" extra="Stored with the revision of the previous published text." style={{ marginBottom: 0 }}>
                    <Input maxLength={500} />
                  </Form.Item>
                </SectionCard>
              )}

              {canManage && (
                <StickyActions status={page.version > 0 ? `Version ${page.version} · last changed ${formatDateTime(page.updatedAt)}` : 'Never saved'}>
                  <Button onClick={() => setReloadKey((key) => key + 1)}>Reload</Button>
                  <Button type="primary" htmlType="submit" loading={saving}>
                    Save page
                  </Button>
                </StickyActions>
              )}
            </Form>
          )}
        </Col>
      </Row>
    </div>
  );
}
