import { useEffect, useState } from 'react';
import { Alert, App, Button, Form, Input, InputNumber, Space, Switch, Typography } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { MAX_HERO_PHRASES, MIN_HERO_PHRASES, settingsApi, type HomeSettings } from '@/api/settings';
import { isApiError } from '@/api/errors';
import { toNamePath } from '@/api/businesses';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { MediaPicker } from '@/components/MediaPicker';
import { PageLoader, PageHeader, SectionCard, StickyActions } from '@/components/ui';
import { variantUrl, type MediaAsset } from '@/api/media';

interface HeroSlideValue {
  mediaId: string;
  caption?: string | null;
  focalX?: number;
  focalY?: number;
}

interface FormValues {
  heroHeadline: string;
  heroPhrases: string[];
  heroSlides: HeroSlideValue[];
  countersEnabled: boolean;
}

/** At most six banner slides (mirrors the API rule). */
const MAX_HERO_SLIDES = 6;

/**
 * Home/hero settings (SRS CFG 001, HERO 002/007). Edits carry the record
 * version; the API validates the document and audits every change.
 */
export function SiteSettingsPage() {
  useDocumentTitle('Site settings');
  const api = settingsApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [form] = Form.useForm<FormValues>();
  const [state, reload] = useAsync((signal) => api.getHome(signal), []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Previews for images chosen in this session; saved slides come from the record.
  const [addedPreviews, setAddedPreviews] = useState<Record<string, { url: string; alt: string }>>({});
  const record: HomeSettings | null = state.status === 'ready' ? state.data : null;
  const previews: Record<string, { url: string; alt: string }> = {
    ...Object.fromEntries((record?.heroSlides ?? []).map((slide, index) => [slide.mediaId, { url: record?.heroSlidePreviews?.[index]?.previewUrl ?? '', alt: record?.heroSlidePreviews?.[index]?.alt ?? '' }])),
    ...addedPreviews,
  };

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      heroHeadline: record.heroHeadline,
      heroPhrases: record.heroPhrases,
      heroSlides: (record.heroSlides ?? []).map((slide) => ({ mediaId: slide.mediaId, caption: slide.caption ?? '', focalX: slide.focalX ?? 0.5, focalY: slide.focalY ?? 0.5 })),
      countersEnabled: record.countersEnabled,
    });
  }, [record, form]);

  const submit = async (values: FormValues) => {
    if (!record) return;
    setError(null);
    setSaving(true);
    try {
      await api.putHome({
        ...values,
        heroPhrases: values.heroPhrases ?? [],
        heroSlides: (values.heroSlides ?? []).map((slide) => ({ mediaId: slide.mediaId, caption: slide.caption || null, focalX: slide.focalX ?? 0.5, focalY: slide.focalY ?? 0.5 })),
        expectedVersion: record.version,
      });
      message.success('Settings saved');
      reload();
    } catch (err) {
      if (isApiError(err) && err.kind === 'unauthorized') onAuthError(err);
      else if (isApiError(err) && err.code === 'STALE_VERSION') setError('These settings were changed by someone else. Reload before saving again.');
      else {
        const errors = fieldErrors(err);
        form.setFields(Object.entries(errors).map(([path, list]) => ({ name: toNamePath(path), errors: list })) as never);
        setError(Object.keys(errors).length > 0 ? 'Some settings are invalid; check the highlighted fields.' : errorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  // The screen is empty until its record arrives; say so rather than showing a blank disabled form.
  if (state.status === 'loading') return <PageLoader label="Loading site settings…" />;
  if (state.status === 'error') return <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'Site settings' }]}
        title="Site settings"
        description="The home page banner, hero wording and counters. Melbourne, its timezone and the public routes are fixed by the platform and are not editable."
      />
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} onFinish={submit} disabled={state.status !== 'ready'} style={{ maxWidth: 860 }}>
        <SectionCard title="Hero wording" description="The heading and the phrases that rotate beneath it.">
          <Form.Item label="Headline" name="heroHeadline" extra="The stable heading screen readers announce; it must make sense without the rotating phrases." rules={[{ required: true, message: 'Headline is required' }]}>
            <Input maxLength={80} showCount />
          </Form.Item>
          <Typography.Text strong>Rotating phrases</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
            Between {MIN_HERO_PHRASES} and {MAX_HERO_PHRASES} phrases, each shown for four seconds. Visitors can pause the rotation, and it stays still for anyone who prefers reduced motion.
          </Typography.Paragraph>
          <Form.List name="heroPhrases">
            {(fields, { add, remove }) => (
              <div>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item name={field.name} style={{ marginBottom: 8, width: 420 }} rules={[{ required: true, message: 'Phrase is required' }]}>
                      <Input maxLength={60} aria-label={`Phrase ${field.name + 1}`} />
                    </Form.Item>
                    <Button type="text" icon={<DeleteOutlined aria-hidden="true" />} aria-label={`Remove phrase ${field.name + 1}`} onClick={() => remove(field.name)} disabled={fields.length <= MIN_HERO_PHRASES} />
                  </Space>
                ))}
                {fields.length < MAX_HERO_PHRASES && (
                  <Button size="small" icon={<PlusOutlined aria-hidden="true" />} onClick={() => add('')}>
                    Add phrase
                  </Button>
                )}
              </div>
            )}
          </Form.List>
        </SectionCard>

        <SectionCard
          title="Home banner"
          description={`Up to ${MAX_HERO_SLIDES} Melbourne photographs shown behind the hero. They cross-fade every seven seconds; visitors can pause or step through them, and anyone who prefers reduced motion sees only the first. With no images the banner falls back to the solid navy panel.`}
          extra={
            <Button icon={<PictureOutlined aria-hidden="true" />} onClick={() => setPickerOpen(true)}>
              Add image
            </Button>
          }
        >
          <Form.List name="heroSlides">
            {(fields, { move, remove }) => (
              <div>
                {fields.length === 0 && <Typography.Paragraph type="secondary">No banner images yet — the hero uses the solid navy fallback.</Typography.Paragraph>}
                {fields.map((field, position) => {
                  const mediaId = (form.getFieldValue(['heroSlides', field.name, 'mediaId']) ?? '') as string;
                  const preview = previews[mediaId];
                  return (
                    <div key={field.key} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '12px 0', borderTop: position === 0 ? undefined : '1px solid var(--ant-color-border)' }}>
                      {preview?.url ? (
                        <img src={preview.url} alt={preview.alt} style={{ width: 160, aspectRatio: '16 / 9', objectFit: 'cover', borderRadius: 8 }} />
                      ) : (
                        <div style={{ width: 160, aspectRatio: '16 / 9', borderRadius: 8, background: '#F1F5F9', display: 'grid', placeItems: 'center' }}>
                          <PictureOutlined aria-hidden="true" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Form.Item name={[field.name, 'mediaId']} hidden>
                          <Input />
                        </Form.Item>
                        <Form.Item label="Caption or credit" name={[field.name, 'caption']} style={{ marginBottom: 8 }} extra="Optional; shown under the banner controls.">
                          <Input maxLength={120} />
                        </Form.Item>
                        <Space wrap>
                          <Form.Item label="Focal point across" name={[field.name, 'focalX']} style={{ marginBottom: 0 }}>
                            <InputNumber min={0} max={1} step={0.05} style={{ width: 110 }} />
                          </Form.Item>
                          <Form.Item label="Focal point down" name={[field.name, 'focalY']} style={{ marginBottom: 0 }}>
                            <InputNumber min={0} max={1} step={0.05} style={{ width: 110 }} />
                          </Form.Item>
                        </Space>
                      </div>
                      <Space direction="vertical">
                        <Button type="text" icon={<ArrowUpOutlined aria-hidden="true" />} aria-label={`Move image ${position + 1} earlier`} disabled={position === 0} onClick={() => move(position, position - 1)} />
                        <Button type="text" icon={<ArrowDownOutlined aria-hidden="true" />} aria-label={`Move image ${position + 1} later`} disabled={position === fields.length - 1} onClick={() => move(position, position + 1)} />
                        <Button type="text" danger icon={<DeleteOutlined aria-hidden="true" />} aria-label={`Remove image ${position + 1}`} onClick={() => remove(field.name)} />
                      </Space>
                    </div>
                  );
                })}
              </div>
            )}
          </Form.List>
        </SectionCard>

        <SectionCard title="Counters" description="Optional totals under the hero.">
          <Form.Item label="Show counters on the home page" name="countersEnabled" valuePropName="checked" extra="Counts published businesses, categories and local areas. They are hidden automatically if the numbers cannot be read.">
            <Switch />
          </Form.Item>
        </SectionCard>
        <StickyActions status={record && record.version > 0 ? `Version ${record.version} · last changed ${formatDateTime(record.updatedAt)}` : 'Not saved yet'}>
          <Button onClick={reload}>Reload</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save settings
          </Button>
        </StickyActions>
      </Form>
      <MediaPicker
        open={pickerOpen}
        onCancel={() => setPickerOpen(false)}
        onPick={(assets: MediaAsset[]) => {
          const asset = assets[0];
          setPickerOpen(false);
          if (!asset) return;
          const current = (form.getFieldValue('heroSlides') ?? []) as HeroSlideValue[];
          if (current.length >= MAX_HERO_SLIDES) {
            message.warning(`At most ${MAX_HERO_SLIDES} banner images`);
            return;
          }
          setAddedPreviews((existing) => ({ ...existing, [asset.id]: { url: variantUrl(asset, 800) ?? variantUrl(asset, 320) ?? '', alt: asset.altText ?? '' } }));
          form.setFieldValue('heroSlides', [...current, { mediaId: asset.id, caption: '', focalX: 0.5, focalY: 0.5 }]);
        }}
      />
    </div>
  );
}
