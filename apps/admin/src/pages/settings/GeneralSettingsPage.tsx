import { useEffect, useState } from 'react';
import { Alert, App, Button, Col, Form, Input, Row, Space, Switch, Typography } from 'antd';
import { DeleteOutlined, PictureOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { generalSettingsApi, SOCIAL_PLATFORMS, type GeneralSettings, type SocialPlatform } from '@/api/settings';
import { isApiError } from '@/api/errors';
import { toNamePath } from '@/api/businesses';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { MediaPicker } from '@/components/MediaPicker';
import { BrandIcon, BrandOptionLabel } from '@/components/BrandIcon';
import { PageLoader, PageHeader, SectionCard, StickyActions } from '@/components/ui';
import { variantUrl, type MediaAsset } from '@/api/media';

type BrandingSlot = 'logoMediaId' | 'faviconMediaId' | 'shareImageMediaId';

interface FormValues {
  applicationName: string;
  shortName?: string | null;
  organisationName?: string | null;
  tagline?: string | null;
  metaDescription?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  websiteUrl?: string | null;
  address?: string | null;
  logoMediaId?: string | null;
  faviconMediaId?: string | null;
  shareImageMediaId?: string | null;
  headerTopBarEnabled: boolean;
  social: Record<SocialPlatform, string | null | undefined>;
  copyrightText?: string | null;
  footerText?: string | null;
}

const SOCIAL_PLACEHOLDERS: Record<SocialPlatform, string> = {
  facebook: 'https://www.facebook.com/…',
  instagram: 'https://www.instagram.com/…',
  x: 'https://x.com/…',
  youtube: 'https://www.youtube.com/@…',
  pinterest: 'https://www.pinterest.com/…',
};

const BRANDING: { slot: BrandingSlot; title: string; hint: string; recordKey: 'logo' | 'favicon' | 'shareImage' }[] = [
  { slot: 'logoMediaId', title: 'Logo', hint: 'Shown in the public header and footer. A wide image on a transparent background works best; it is scaled to the bar height.', recordKey: 'logo' },
  { slot: 'faviconMediaId', title: 'Browser icon', hint: 'Used as the tab icon. Square images look best; the smallest processed rendition is served.', recordKey: 'favicon' },
  { slot: 'shareImageMediaId', title: 'Default share image', hint: 'Used when a page has no image of its own, for example on social cards. Landscape, at least 1200 × 630.', recordKey: 'shareImage' },
];

/**
 * General settings (SRS CFG 001): the application's own identity, branding,
 * contact details, the header contact bar and the footer. The API validates the
 * document, refuses a support address on a development domain, keeps each
 * social link on its own platform, and audits every change; edits carry the
 * record version, so a second editor is told rather than overwritten.
 *
 * Melbourne, the timezone and the public routes are fixed by the platform and
 * deliberately absent from this screen (SCP 001–005).
 */
export function GeneralSettingsPage() {
  useDocumentTitle('General settings');
  const api = generalSettingsApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [form] = Form.useForm<FormValues>();
  const [state, reload] = useAsync((signal) => api.get(signal), []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<BrandingSlot | null>(null);
  // Branding changed in this session: an entry holds the new preview, or null
  // when the editor removed the image. Anything untouched comes from the record.
  // The overrides are tagged with the version they were made against, so a
  // reload discards them without a state write inside an effect.
  const [chosen, setChosen] = useState<{ version: number; slots: Partial<Record<BrandingSlot, { url: string; alt: string } | null>> }>({ version: -1, slots: {} });
  const record: GeneralSettings | null = state.status === 'ready' ? state.data : null;
  const overrides = record && chosen.version === record.version ? chosen.slots : {};
  const override = (slot: BrandingSlot, value: { url: string; alt: string } | null) => setChosen({ version: record?.version ?? -1, slots: { ...overrides, [slot]: value } });

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      applicationName: record.applicationName,
      shortName: record.shortName ?? '',
      organisationName: record.organisationName ?? '',
      tagline: record.tagline ?? '',
      metaDescription: record.metaDescription ?? '',
      supportEmail: record.supportEmail ?? '',
      // The API returns the normalised display form; it is also what it accepts.
      supportPhone: record.supportPhone ?? '',
      websiteUrl: record.websiteUrl ?? '',
      address: record.address ?? '',
      logoMediaId: record.logoMediaId ?? null,
      faviconMediaId: record.faviconMediaId ?? null,
      shareImageMediaId: record.shareImageMediaId ?? null,
      headerTopBarEnabled: record.headerTopBarEnabled ?? false,
      social: Object.fromEntries(SOCIAL_PLATFORMS.map((platform) => [platform, record.social?.[platform] ?? ''])) as FormValues['social'],
      copyrightText: record.copyrightText ?? '',
      footerText: record.footerText ?? '',
    });
  }, [record, form]);

  const previewFor = (entry: (typeof BRANDING)[number]): { url: string; alt: string } | undefined => {
    const changed = overrides[entry.slot];
    if (changed !== undefined) return changed ?? undefined;
    const saved = record?.[entry.recordKey];
    return saved ? { url: saved.url, alt: saved.alt } : undefined;
  };

  const submit = async (values: FormValues) => {
    if (!record) return;
    setError(null);
    setSaving(true);
    try {
      await api.put({
        ...values,
        // Empty strings mean "not published"; the API clears the stored value.
        social: Object.fromEntries(SOCIAL_PLATFORMS.map((platform) => [platform, values.social?.[platform] || null])),
        expectedVersion: record.version,
      });
      message.success('General settings saved');
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
  if (state.status === 'loading') return <PageLoader label="Loading general settings…" />;
  if (state.status === 'error') return <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'General settings' }]}
        title="General settings"
        description="Your application's name, contact details, branding and footer. Melbourne, its timezone and the public routes are fixed by the platform and are not editable here."
      />
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} onFinish={submit} disabled={state.status !== 'ready'} style={{ maxWidth: 980 }}>
        <SectionCard title="Application information" description="Used in the header, page titles, search results and the copyright line.">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Application name" name="applicationName" rules={[{ required: true, message: 'Application name is required' }]}>
                <Input maxLength={80} showCount />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Short name" name="shortName" extra="Used in tight spaces, such as the browser tab suffix.">
                <Input maxLength={20} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Organisation name" name="organisationName" extra="The entity behind the site, when it differs from the application name.">
                <Input maxLength={120} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Support email" name="supportEmail" extra="Published on the site. A development domain (.local, .test) is refused.">
                <Input type="email" maxLength={254} placeholder="listings@example.com.au" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Support phone" name="supportPhone" extra="Australian format, for example 03 9000 0000 or 0400 000 000.">
                <Input maxLength={30} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Website URL" name="websiteUrl" extra="The organisation's own site, when it is not this one.">
                <Input maxLength={200} placeholder="https://…" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Address" name="address" extra="Shown in the footer and on the contact page. At most four lines.">
            <Input.TextArea rows={3} maxLength={300} showCount />
          </Form.Item>
          <Form.Item label="Tagline" name="tagline" extra="Shown after the name in the browser title.">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="Default meta description" name="metaDescription" extra="Used for pages that do not set their own description.">
            <Input.TextArea rows={2} maxLength={300} showCount />
          </Form.Item>
        </SectionCard>

        <SectionCard title="Branding" description="Images come from the media library, so they are processed, have alt text and are served from the CDN.">
          <Row gutter={16}>
            {BRANDING.map((entry) => {
              const preview = previewFor(entry);
              return (
                <Col xs={24} md={8} key={entry.slot}>
                  <Typography.Text strong>{entry.title}</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 8, fontSize: 13 }}>
                    {entry.hint}
                  </Typography.Paragraph>
                  <Form.Item name={entry.slot} hidden>
                    <Input />
                  </Form.Item>
                  <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 8, padding: 12, display: 'grid', gap: 12, justifyItems: 'center' }}>
                    {preview?.url ? (
                      <img src={preview.url} alt={preview.alt} style={{ maxHeight: 96, maxWidth: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ height: 96, display: 'grid', placeItems: 'center', color: 'var(--ant-color-text-quaternary)' }}>
                        <PictureOutlined aria-hidden="true" style={{ fontSize: 28 }} />
                      </div>
                    )}
                    <Space>
                      <Button icon={<PictureOutlined aria-hidden="true" />} onClick={() => setPicking(entry.slot)}>
                        {preview ? 'Replace' : 'Choose image'}
                      </Button>
                      {preview && (
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined aria-hidden="true" />}
                          aria-label={`Remove ${entry.title.toLowerCase()}`}
                          onClick={() => {
                            form.setFieldValue(entry.slot, null);
                            override(entry.slot, null);
                          }}
                        />
                      )}
                    </Space>
                  </div>
                </Col>
              );
            })}
          </Row>
        </SectionCard>

        <SectionCard
          title="Header contact bar"
          description="A slim strip above the public navigation: phone and email on the left, social profiles on the right. It is hidden unless at least one of them is set."
        >
          <Form.Item label="Show the contact bar" name="headerTopBarEnabled" valuePropName="checked" extra="The phone number and email come from Application information above.">
            <Switch />
          </Form.Item>
          <Row gutter={16}>
            {SOCIAL_PLATFORMS.map((platform) => (
              <Col xs={24} md={12} lg={8} key={platform}>
                <Form.Item
                  label={<BrandOptionLabel kind={platform} suffix="URL" />}
                  name={['social', platform]}
                  extra={`Must be a link on ${SOCIAL_PLACEHOLDERS[platform].replace('https://', '').split('/')[0]}.`}
                >
                  <Input maxLength={300} placeholder={SOCIAL_PLACEHOLDERS[platform]} prefix={<BrandIcon kind={platform} />} />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </SectionCard>

        <SectionCard title="Footer" description="Text shown at the bottom of every public page.">
          <Form.Item
            label="Copyright line"
            name="copyrightText"
            extra="Leave empty for the default line. Use {year} for the current year and {name} for the application name, so both stay up to date."
          >
            <Input maxLength={200} placeholder="© {year} {name}. All rights reserved." />
          </Form.Item>
          <Form.Item label="Footer text" name="footerText" extra="A short paragraph under the footer brand.">
            <Input.TextArea rows={3} maxLength={600} showCount />
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
        open={picking !== null}
        onCancel={() => setPicking(null)}
        onPick={(assets: MediaAsset[]) => {
          const asset = assets[0];
          if (asset && picking) {
            form.setFieldValue(picking, asset.id);
            override(picking, { url: variantUrl(asset, 320) ?? '', alt: asset.altText ?? '' });
          }
          setPicking(null);
        }}
      />
    </div>
  );
}
