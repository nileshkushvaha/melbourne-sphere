import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Col, Form, Input, List, Modal, Row, Select, Space, Switch, Typography } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { Link, useNavigate, useParams } from 'react-router';
import { blogApi, melbourneLocalToUtc, melbourneOffsetLabel, utcToMelbourneLocal, type Post, type PostAction } from '@/api/blog';
import { toNamePath } from '@/api/businesses';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useUnsavedChanges } from '@/shared/useUnsavedChanges';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { MediaPicker } from '@/components/MediaPicker';
import { RichTextEditorLazy } from '@/components/RichTextEditorLazy';
import { ErrorState, PageLoader, PageHeader, SectionCard, StatusTag, StickyActions, PageLoadError } from '@/components/ui';
import type { MediaAsset } from '@/api/media';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';
import { PermalinkField } from '@/components/PermalinkField';
import { slugify } from '@/shared/slug';
import { FormSelect } from '@/components/FormSelect';
import { brand } from '@/config/theme';

const ACTION_LABELS: Record<PostAction, { label: string; title: string; hint: string; danger?: boolean }> = {
  publish: {
    label: 'Publish article',
    title: 'Publish this article?',
    hint: 'Anyone can read it on the blog from now on, it appears in the blog list and in search results, and readers can comment if comments are on. You can unpublish it again at any time.',
  },
  schedule: {
    label: 'Schedule article',
    title: 'Schedule publication',
    hint: 'Choose a Melbourne date and time. The article publishes itself then, even if nobody is signed in — and even if the site was offline at that moment, it publishes as soon as it is back.',
  },
  unpublish: {
    label: 'Unpublish article',
    title: 'Unpublish this article?',
    hint: 'It returns to draft: readers can no longer open it and it leaves the blog list. Comments already made are kept.',
    danger: true,
  },
  archive: { label: 'Archive article', title: 'Archive this article?', hint: 'It is hidden everywhere and becomes read-only. Restore it to edit it again.', danger: true },
  restore: { label: 'Restore article', title: 'Restore this article to draft?', hint: 'It becomes editable again and stays private until you publish it.' },
};

const ACTIONS_BY_STATUS: Record<Post['status'], PostAction[]> = {
  draft: ['publish', 'schedule', 'archive'],
  scheduled: ['publish', 'schedule', 'unpublish', 'archive'],
  published: ['unpublish', 'archive'],
  archived: ['restore'],
};

interface FormValues {
  title: string;
  slug?: string;
  excerpt: string;
  bodyMarkdown: string;
  coverMediaId?: string | null;
  coverAlt?: string | null;
  ogImageMediaId?: string | null;
  authorId: string;
  categoryId: string;
  tagIds: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  commentsEnabled: boolean;
  revisionReason?: string;
}

/**
 * Form.Item injects value/onChange; this wrapper keeps them optional for the
 * type checker, and swallows the editor's opening note.
 *
 * The editor normalises the HTML it is given and reports the result, so it
 * emits a change as soon as it mounts — with nothing typed. The form took that
 * as an edit and told the writer they had unsaved changes on a blank page,
 * which then blocked navigation with a warning about losing work that did not
 * exist. A value identical to the one we handed it is not a change.
 */
function RichTextEditorField({ value, onChange, disabled }: { value?: string; onChange?: (html: string) => void; disabled?: boolean }) {
  const current = value ?? '';
  return <RichTextEditorLazy value={current} onChange={(html) => { if (html !== current) onChange?.(html); }} disabled={disabled} />;
}

/**
 * Article editor (SRS BLOG 001–003). The body is Markdown; the server returns
 * the sanitised HTML shown in the preview, so what is previewed is exactly what
 * will be published.
 */
export function PostEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const api = blogApi();
  const { can, loading: capabilitiesLoading } = useCapabilities();
  const canWrite = can(PERMISSION.postsWrite);
  const canPublish = can(PERMISSION.postsPublish);
  const [form] = Form.useForm<FormValues>();
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Nothing here saves on its own; leaving with edits in the form loses them.
  useUnsavedChanges(dirty && !saving);
  const [pending, setPending] = useState<{ action: PostAction; blockers?: string[] } | null>(null);
  const [actionForm] = Form.useForm<{ reason?: string; scheduledLocal?: string }>();
  const [reloadKey, setReloadKey] = useState(0);
  // Which image is being chosen: the one on the article, or the one used when
  // it is shared.
  const [picking, setPicking] = useState<'cover' | 'share' | null>(null);
  // Both are drafts layered over the loaded article: null means "follow the article".
  const [formatOverride, setFormatOverride] = useState<'html' | 'markdown' | null>(null);

  const [state, reload] = useAsync((signal) => (isNew ? Promise.resolve(null) : api.getPost(id!, signal)), [id, reloadKey]);
  const post = state.status === 'ready' ? state.data : null;
  // The server's rendering of the saved draft; re-read whenever the record is.
  const [preview, reloadPreview] = useAsync((signal) => (isNew || !id ? Promise.resolve(null) : api.previewPost(id, signal)), [id, reloadKey]);
  const [authors] = useAsync((signal) => api.listAuthors(signal), []);
  const [categories] = useAsync((signal) => api.listTerms('blog-categories', signal), []);
  const [tags] = useAsync((signal) => api.listTerms('blog-tags', signal), []);
  useDocumentTitle(isNew ? 'New article' : (post?.title ?? 'Article'));

  useEffect(() => {
    if (post) {
      form.setFieldsValue({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        coverMediaId: post.coverMediaId,
        coverAlt: post.coverAlt,
        ogImageMediaId: post.ogImageMediaId,
        authorId: post.authorId,
        categoryId: post.categoryId,
        tagIds: post.tagIds,
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        seoKeywords: post.seoKeywords,
        commentsEnabled: post.commentsEnabled,
      });
    }
  }, [post, form]);

  const coverAsset = post?.cover ?? null;
  const shareAsset = post?.ogImage ?? null;
  // Each watch is its own hook call: short-circuiting them would make the later
  // ones conditional.
  const watchedSeoTitle = Form.useWatch('seoTitle', form) as string | undefined;
  const watchedTitle = Form.useWatch('title', form) as string | undefined;
  const watchedSeoDescription = Form.useWatch('seoDescription', form) as string | undefined;
  const watchedExcerpt = Form.useWatch('excerpt', form) as string | undefined;
  const watchedSlug = Form.useWatch('slug', form) as string | undefined;
  const seoTitlePreview = watchedSeoTitle || watchedTitle || 'Article title';
  const seoDescriptionPreview = watchedSeoDescription || watchedExcerpt || 'The excerpt appears here when no meta description is set.';
  const slugPreview = watchedSlug || post?.slug || 'article-slug';

  // New articles use the rich editor; existing Markdown articles stay Markdown until converted.
  const bodyFormat: 'html' | 'markdown' = formatOverride ?? (post?.bodyFormat === 'markdown' ? 'markdown' : 'html');

  const offsetLabel = useMemo(() => melbourneOffsetLabel(new Date()), []);

  const handleError = (error: unknown, setter: (message: string) => void) => {
    if (isApiError(error) && error.kind === 'unauthorized') {
      onAuthError(error);
      return;
    }
    if (isApiError(error) && (error.code === 'STALE_VERSION' || error.code === 'SLUG_LOCKED' || error.code === 'INVALID_STATE')) {
      setter(`${error.userMessage} Reload to see the current version.`);
      return;
    }
    const errors = fieldErrors(error);
    if (Object.keys(errors).length > 0) form.setFields(Object.entries(errors).map(([path, list]) => ({ name: toNamePath(path), errors: list })) as never);
    setter(Object.values(errors).flat()[0] ?? errorMessage(error));
  };

  const submit = async (values: FormValues) => {
    setFormError(null);
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.createPost({ ...values, bodyFormat, tagIds: values.tagIds ?? [] });
        message.success('Article created as a draft. It stays private until you publish it.');
        setDirty(false);
        navigate(`/posts/${encodeURIComponent(created.id)}`);
      } else if (post) {
        await api.updatePost(post.id, { ...values, bodyFormat, tagIds: values.tagIds ?? [], expectedVersion: post.version });
        message.success('Article saved');
        setDirty(false);
        setReloadKey((k) => k + 1);
      }
    } catch (error) {
      handleError(error, setFormError);
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!post || !pending) return;
    const values = await actionForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      const body: Record<string, unknown> & { expectedVersion: number } = { expectedVersion: post.version, reason: values.reason || undefined };
      if (pending.action === 'schedule') {
        const instant = melbourneLocalToUtc(values.scheduledLocal ?? '');
        if (!instant) {
          setPending({ ...pending, blockers: ['Choose a valid date and time'] });
          return;
        }
        body.scheduledAt = instant.toISOString();
      }
      await api.transition(post.id, pending.action, body);
      message.success(`Article ${pending.action === 'schedule' ? 'scheduled' : `${pending.action}ed`}`);
      setPending(null);
      actionForm.resetFields();
      setReloadKey((k) => k + 1);
    } catch (error) {
      if (isApiError(error) && error.code === 'PUBLICATION_BLOCKED') setPending({ ...pending, blockers: error.fields.publication ?? [error.userMessage] });
      else handleError(error, (m) => setPending({ ...pending, blockers: [m] }));
    }
  };

  /**
   * Moves a published article. The address row awaits this, so a refusal has to
   * be rethrown: swallowing it would close the editor as though the move had
   * worked.
   */
  const changeSlug = async (slug: string) => {
    if (!post) return;
    setFormError(null);
    try {
      await api.changePostSlug(post.id, { slug, expectedVersion: post.version });
      message.success('Public address changed; the old one now redirects.');
      setReloadKey((k) => k + 1);
    } catch (error) {
      handleError(error, setFormError);
      throw error;
    }
  };

  // The screen is empty until its record arrives; say so rather than showing a blank disabled form.
  // Capabilities decide whether this form is editable, so the screen waits for
  // them rather than rendering a form that is disabled and then is not
  // (SRS RBAC 010). Behind the route guard they are already known, so this is
  // normally invisible.
  if (capabilitiesLoading) return <PageLoader label="Checking your permissions…" />;

  if (!isNew && state.status === 'loading') return <PageLoader label="Loading this article…" />;
  if (state.status === 'error') return <PageLoadError title="Article" crumbs={[{ label: 'Editorial' }, { label: 'Articles', href: '/posts' }]} message={state.message} reference={state.reference} onRetry={reload} />;
  if (!isNew && !post) return <p role="status">Loading article…</p>;
  const readOnly = !canWrite || post?.status === 'archived';
  const actions = post ? ACTIONS_BY_STATUS[post.status].filter(() => canPublish) : [];
  const options = (items: { id: string; displayName?: string; name?: string; active: boolean }[]) => items.filter((i) => i.active).map((i) => ({ value: i.id, label: i.displayName ?? i.name ?? i.id }));

  return (
    <div>
      <PageHeader
        crumbs={[
          { label: 'Editorial', href: '/posts' },
          { label: 'Articles', href: '/posts' },
          { label: isNew ? 'New article' : (post?.title ?? 'Article') },
        ]}
        title={isNew ? 'New article' : post!.title}
        description={isNew ? 'Write the article, then publish or schedule it once every requirement is met.' : undefined}
        meta={post ? <StatusTag status={post.status} /> : null}
        actions={
          post ? (
            <>
              <Link to="/posts">
                <Button>All articles</Button>
              </Link>
              {post.status === 'published' && (
                <Button href={`/blog/${post.slug}`} target="_blank" rel="noreferrer noopener">
                  View on site
                </Button>
              )}
              {actions.map((action) => (
                <Button
                  key={action}
                  danger={ACTION_LABELS[action].danger}
                  type={action === 'publish' ? 'primary' : 'default'}
                  onClick={() => {
                    actionForm.resetFields();
                    if (action === 'schedule') actionForm.setFieldsValue({ scheduledLocal: utcToMelbourneLocal(new Date(Date.now() + 3_600_000)) });
                    setPending({ action });
                  }}
                >
                  {ACTION_LABELS[action].label}
                </Button>
              ))}
            </>
          ) : (
            <Link to="/posts">
              <Button>All articles</Button>
            </Link>
          )
        }
      />
      {post && post.status !== 'published' && post.publicationBlockers.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Not ready to publish" description={<List size="small" dataSource={post.publicationBlockers} renderItem={(b) => <List.Item>{b}</List.Item>} />} />
      )}
      {post?.status === 'archived' && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Archived articles are read-only. Restore it to make changes." />}
      {formError && <Alert type="error" showIcon role="alert" message={formError} style={{ marginBottom: 16 }} />}
      <Form<FormValues> form={form} layout="vertical" onFinish={submit} onValuesChange={() => setDirty(true)} disabled={readOnly} initialValues={{ tagIds: [], commentsEnabled: true }}>
        <Row gutter={24}>
          <Col xs={24} xl={16}>
            <SectionCard title="Article">
              <Form.Item label="Title" name="title" rules={[{ required: true, min: 3, message: 'Title is required' }]}>
                <Input maxLength={180} size="large" showCount placeholder="A clear, specific headline" />
              </Form.Item>
              {/* The address sits under the title, read-only until it is
                  edited — the same row every other record in the admin uses.
                  Before publication it is just a form value; afterwards saving
                  it goes through the API, which leaves a 301 behind (SEO 004). */}
              <Form.Item name="slug" style={{ marginBottom: 0 }}>
                <PermalinkField
                  base="/blog"
                  source="title"
                  disabled={readOnly || (Boolean(post?.firstPublishedAt) && !canPublish)}
                  placeholder={watchedTitle ? slugify(watchedTitle) : undefined}
                  note={post?.firstPublishedAt ? 'The old address keeps working through a permanent redirect (301).' : 'Made from the title when left empty.'}
                  onSave={post?.firstPublishedAt ? changeSlug : undefined}
                />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label="Comments" name="commentsEnabled" valuePropName="checked" extra="Turn off to close comments on this article.">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Excerpt" name="excerpt" extra="At least 20 characters; shown in listings, search results and social shares." rules={[{ required: true, message: 'Excerpt is required' }]}>
                <Input.TextArea rows={3} maxLength={500} showCount placeholder="One or two sentences a reader would see before deciding to open the article." />
              </Form.Item>
            </SectionCard>

            <SectionCard
              title="Body"
              description={
                bodyFormat === 'markdown'
                  ? 'This article was written in Markdown. You can keep editing it as Markdown, or move it to the rich editor.'
                  : 'Headings, lists, quotes, code, links, images and tables. The server sanitises everything on save.'
              }
              extra={
                bodyFormat === 'markdown' && !readOnly ? (
                  <Button
                    size="small"
                    onClick={() => {
                      form.setFieldValue('bodyMarkdown', post?.sanitizedBody ?? '');
                      setFormatOverride('html');
                    }}
                  >
                    Switch to the rich editor
                  </Button>
                ) : null
              }
              bodyPadding={bodyFormat === 'html' ? 0 : undefined}
            >
              <Form.Item name="bodyMarkdown" noStyle={bodyFormat === 'html'} label={bodyFormat === 'html' ? undefined : 'Markdown'} rules={[{ required: true, message: 'Body is required' }]}>
                {bodyFormat === 'html' ? (
                  <RichTextEditorField disabled={readOnly} />
                ) : (
                  <Input.TextArea rows={18} maxLength={200_000} placeholder="Write the article here. Markdown headings, lists and links are supported." />
                )}
              </Form.Item>
            </SectionCard>

            {post && (
              <SectionCard
                title="Preview"
                description="The article as the server renders it, from the last version you saved. Anything typed since is not shown here."
                extra={
                  <Button size="small" onClick={() => reloadPreview()} loading={preview.status === 'loading'}>
                    Refresh preview
                  </Button>
                }
              >
                {preview.status === 'error' && <ErrorState message={preview.message} reference={preview.reference} onRetry={reloadPreview} />}
                {preview.status === 'ready' && preview.data && (
                  <>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
                      By {preview.data.authorName} in {preview.data.categoryName}. This preview is never shown publicly and is never indexed.
                    </Typography.Text>
                    {/* The API sanitised this HTML with an allowlist before storing it (SRS SEC 001). */}
                    <div className="ms-prose" data-testid="post-preview" dangerouslySetInnerHTML={{ __html: preview.data.sanitizedBody }} />
                  </>
                )}
              </SectionCard>
            )}

            <SectionCard title="Search appearance" description="How this article is likely to look in search results.">
              {/* Imitates a results page, which is light, so it stays light in
                  both themes: a dark copy would preview something nobody sees. */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 16, background: '#FFFFFF' }}>
                <span style={{ color: '#1a0dab', fontSize: 16, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{seoTitlePreview}</span>
                <span style={{ color: '#4D5156', fontSize: 12, display: 'block' }}>melbournesphere · /blog/{slugPreview}</span>
                <span style={{ color: '#3C4043', fontSize: 13 }}>{seoDescriptionPreview.slice(0, 160)}</span>
              </div>
              <Form.Item label="SEO title" name="seoTitle" extra="Defaults to the article title.">
                <Input maxLength={180} showCount placeholder="Shown as the headline in search results" />
              </Form.Item>
              <Form.Item label="Meta description" name="seoDescription" extra="Defaults to the excerpt.">
                <Input.TextArea rows={3} maxLength={300} showCount placeholder="The summary shown under the title in search results" />
              </Form.Item>
              <Form.Item label="Keywords" name="seoKeywords" extra="Comma separated. Search engines ignore this tag; it will not affect ranking." style={{ marginBottom: 0 }}>
                <Input maxLength={255} placeholder="e.g. carlton, coffee, breakfast" />
              </Form.Item>
            </SectionCard>

            <SectionCard title="Shared on social media" description="How a link to this article is likely to appear when someone shares it.">
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                {(shareAsset ?? coverAsset) ? (
                  <img src={(shareAsset ?? coverAsset)!.url} alt="" style={{ width: '100%', aspectRatio: '1.91 / 1', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ aspectRatio: '1.91 / 1', background: brand.placeholderFill, display: 'flex', alignItems: 'center', justifyContent: 'center', color: brand.textMuted, fontSize: 13 }}>
                    No image chosen — most networks will show plain text
                  </div>
                )}
                <div style={{ padding: '10px 12px' }}>
                  <Typography.Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, display: 'block' }}>
                    melbournesphere
                  </Typography.Text>
                  <Typography.Text strong style={{ display: 'block' }} ellipsis>
                    {seoTitlePreview}
                  </Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {seoDescriptionPreview.slice(0, 120)}
                  </Typography.Text>
                </div>
              </div>
            </SectionCard>
          </Col>

          {/* The side column follows the reader down a long form, the same
              way the business editor's does. */}
          <Col xs={24} xl={8}>
            <div className="ms-editor-sidebar ms-editor-sidebar--xl">
            <SectionCard title="Featured image" description="Shown at the top of the article and in listings.">
              {coverAsset ? (
                <img src={coverAsset.url} alt={coverAsset.alt} style={{ width: '100%', borderRadius: 10, marginBottom: 12, aspectRatio: '16 / 9', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '16 / 9', borderRadius: 10, background: brand.placeholderFill, marginBottom: 12, color: brand.textSubtle }}>
                  <PictureOutlined aria-hidden="true" style={{ fontSize: 28 }} />
                </div>
              )}
              <Form.Item name="coverMediaId" hidden>
                <Input />
              </Form.Item>
              <Space wrap>
                <Button icon={<PictureOutlined aria-hidden="true" />} onClick={() => setPicking('cover')} disabled={readOnly}>
                  {coverAsset ? 'Replace image' : 'Choose image'}
                </Button>
                {coverAsset && (
                  <Button
                    danger
                    onClick={() => {
                      form.setFieldValue('coverMediaId', null);
                      void form.submit();
                    }}
                    disabled={readOnly}
                  >
                    Remove
                  </Button>
                )}
              </Space>
              <Form.Item label="Caption or alt override" name="coverAlt" extra="Leave empty to use the alt text stored with the image." style={{ marginTop: 16, marginBottom: 0 }}>
                <Input maxLength={255} placeholder="Describe the image for someone who cannot see it" />
              </Form.Item>
            </SectionCard>

            {/* A separate image for sharing, because the picture that works at
                the top of an article is often the wrong shape for a social card
                (1.91:1, and read at thumbnail size). Empty means the featured
                image is used, which is what most articles want. */}
            <SectionCard title="Share image" description="Used when the article is shared. Leave empty to share the featured image.">
              {shareAsset ? (
                <img src={shareAsset.url} alt={shareAsset.alt} style={{ width: '100%', borderRadius: 10, marginBottom: 12, aspectRatio: '1.91 / 1', objectFit: 'cover' }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1.91 / 1', borderRadius: 10, background: brand.placeholderFill, marginBottom: 12, color: brand.textSubtle, fontSize: 13, textAlign: 'center', padding: 12 }}>
                  {coverAsset ? 'The featured image is used' : 'No image yet'}
                </div>
              )}
              <Form.Item name="ogImageMediaId" hidden>
                <Input />
              </Form.Item>
              <Space wrap>
                <Button icon={<PictureOutlined aria-hidden="true" />} onClick={() => setPicking('share')} disabled={readOnly}>
                  {shareAsset ? 'Replace image' : 'Choose image'}
                </Button>
                {shareAsset && (
                  <Button
                    onClick={() => {
                      form.setFieldValue('ogImageMediaId', null);
                      void form.submit();
                    }}
                    disabled={readOnly}
                  >
                    Use the featured image
                  </Button>
                )}
              </Space>
            </SectionCard>

            <SectionCard title="Publishing">
              <Form.Item label="Author" name="authorId" rules={[{ required: true, message: 'Author is required' }]}>
                <FormSelect showSearch optionFilterProp="label" placeholder="Choose an author" options={authors.status === 'ready' ? options(authors.data) : []} />
              </Form.Item>
              <Form.Item label="Category" name="categoryId" rules={[{ required: true, message: 'Category is required' }]}>
                <FormSelect showSearch optionFilterProp="label" placeholder="Choose a category" options={categories.status === 'ready' ? options(categories.data) : []} />
              </Form.Item>
              <Form.Item label="Tags" name="tagIds" style={{ marginBottom: post?.scheduledAt || post?.firstPublishedAt ? 12 : 0 }}>
                <Select mode="multiple" optionFilterProp="label" placeholder="Add any that apply" options={tags.status === 'ready' ? options(tags.data) : []} />
              </Form.Item>
              {post?.scheduledAt && <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>Scheduled for {formatDateTime(post.scheduledAt)}</Typography.Paragraph>}
              {post?.firstPublishedAt && <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>First published {formatDateTime(post.firstPublishedAt)}</Typography.Paragraph>}
            </SectionCard>

            {post?.firstPublishedAt && (
              <SectionCard title="Revision note">
                <Form.Item label="Why is this changing?" name="revisionReason" extra="Stored with the revision of the previous published text." style={{ marginBottom: 0 }}>
                  <Input maxLength={500} placeholder="e.g. Corrected the opening hours" />
                </Form.Item>
              </SectionCard>
            )}

            </div>
          </Col>
        </Row>
        {!readOnly && (
          <StickyActions
            status={
              dirty
                ? 'You have unsaved changes. Nothing is saved automatically.'
                : post
                  ? `Saved. Version ${post.version}, last saved ${formatDateTime(post.updatedAt)}.`
                  : 'Not saved yet.'
            }
          >
            {!isNew && (
              <Button onClick={() => setReloadKey((k) => k + 1)} disabled={saving || !dirty}>
                Discard changes
              </Button>
            )}
            <Button type="primary" htmlType="submit" loading={saving}>
              {isNew ? 'Create draft' : 'Save changes'}
            </Button>
          </StickyActions>
        )}
      </Form>
      <MediaPicker
        open={picking !== null}
        onCancel={() => setPicking(null)}
        onPick={(assets: MediaAsset[]) => {
          const asset = assets[0];
          const slot = picking;
          setPicking(null);
          if (!asset || !slot) return;
          form.setFieldValue(slot === 'cover' ? 'coverMediaId' : 'ogImageMediaId', asset.id);
          void form.submit();
        }}
      />
      <Modal
        open={pending !== null}
        title={pending ? ACTION_LABELS[pending.action].title : ''}
        okText={pending ? ACTION_LABELS[pending.action].label : 'OK'}
        okButtonProps={{ danger: pending ? ACTION_LABELS[pending.action].danger : false }}
        onOk={() => void runAction()}
        onCancel={() => setPending(null)}
        destroyOnHidden
      >
        {pending && <Typography.Paragraph>{ACTION_LABELS[pending.action].hint}</Typography.Paragraph>}
        {pending?.blockers && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message="Cannot continue" description={<ul style={{ margin: 0, paddingInlineStart: 18 }}>{pending.blockers.map((b) => <li key={b}>{b}</li>)}</ul>} />}
        <Form form={actionForm} layout="vertical" requiredMark={false}>
          {pending?.action === 'schedule' && (
            <Form.Item label={`Publish at (Melbourne time, ${offsetLabel})`} name="scheduledLocal" rules={[{ required: true, message: 'Choose a date and time' }]}>
              <Input type="datetime-local" />
            </Form.Item>
          )}
          <Form.Item label="Reason (optional, recorded in the audit log)" name="reason">
            <Input.TextArea rows={2} maxLength={500} placeholder="Why this change is being made (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
