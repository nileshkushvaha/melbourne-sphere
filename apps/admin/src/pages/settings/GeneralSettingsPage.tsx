import { useEffect, useState } from 'react';
import { Alert, App, Button, Col, Form, Input, Row, Switch } from 'antd';
import { useOnError } from '@refinedev/core';
import { generalSettingsApi, SOCIAL_PLATFORMS, type GeneralSettings, type SocialPlatform } from '@/api/settings';
import { isApiError } from '@/api/errors';
import { toNamePath } from '@/api/businesses';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { MediaField } from '@/components/MediaField';
import { BrandIcon, BrandOptionLabel } from '@/components/BrandIcon';
import { PageLoader, PageHeader, SectionCard, StickyActions, PageLoadError } from '@/components/ui';
import { useUnsavedChanges } from '@/shared/useUnsavedChanges';

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
  { slot: 'faviconMediaId', title: 'Browser icon', hint: 'Shown on the browser tab. Square images work best.', recordKey: 'favicon' },
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
  // Nothing here saves on its own, and the form is long enough to lose.
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const record: GeneralSettings | null = state.status === 'ready' ? state.data : null;

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
      setDirty(false);
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
  if (state.status === 'error') return <PageLoadError title="General settings" crumbs={[{ label: 'Configuration' }, { label: 'General settings' }]} message={state.message} reference={state.reference} onRetry={reload} />;

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Configuration' }, { label: 'General settings' }]}
        title="General settings"
        description="Name, contact details, branding and footer."
      />
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} role="alert" />}
      <Form<FormValues> form={form} layout="vertical" requiredMark={false} onFinish={submit} onValuesChange={() => setDirty(true)} disabled={state.status !== 'ready'}>
        <SectionCard title="Site identity" description="Used in the header, page titles, search results and the copyright line.">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Site name" name="applicationName" rules={[{ required: true, message: 'Site name is required' }]}>
                <Input maxLength={80} showCount placeholder="Melbourne Sphere" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Short name" name="shortName" extra="Used in tight spaces, such as the browser tab suffix.">
                <Input maxLength={20} placeholder="Sphere" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Organisation name" name="organisationName" extra="The organisation behind the site, when that differs from the site name.">
                <Input maxLength={120} placeholder="e.g. Melbourne Sphere Pty Ltd" />
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
              <Form.Item label="Support phone" name="supportPhone" extra="An Australian landline or mobile number.">
                <Input maxLength={30} placeholder="03 9000 0000" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Website URL" name="websiteUrl" extra="The organisation's own site, when it is not this one.">
                <Input maxLength={200} placeholder="https://example.com.au" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Address" name="address" extra="Shown in the footer and on the contact page. At most four lines.">
            <Input.TextArea rows={3} maxLength={300} showCount placeholder={'Level 2, 100 Collins Street\nMelbourne VIC 3000'} />
          </Form.Item>
          <Form.Item label="Tagline" name="tagline" extra="Shown after the name in the browser title.">
            <Input maxLength={120} placeholder="Find local businesses across Melbourne" />
          </Form.Item>
          <Form.Item label="Default meta description" name="metaDescription" extra="Used for pages that do not set their own description.">
            <Input.TextArea rows={2} maxLength={300} showCount placeholder="An independent directory of businesses across Melbourne, Victoria." />
          </Form.Item>
        </SectionCard>

        <SectionCard title="Branding" description="Images are chosen from the media library, so each one already has alternative text and a web-ready version.">
          <Row gutter={16}>
            {BRANDING.map((entry) => (
              <Col xs={24} md={8} key={entry.slot}>
                <Form.Item label={entry.title} name={entry.slot} extra={entry.hint}>
                  {/* One picker for every image field in the admin, so choosing
                      a logo works exactly like choosing a share image. */}
                  <MediaField
                    current={record?.[entry.recordKey] ? { url: record[entry.recordKey]!.url, alt: record[entry.recordKey]!.alt } : null}
                    emptyLabel={`No ${entry.title.toLowerCase()} yet`}
                    clearLabel={`Remove ${entry.title.toLowerCase()}`}
                    aspectRatio={entry.slot === 'faviconMediaId' ? '1 / 1' : entry.slot === 'shareImageMediaId' ? '1.91 / 1' : '16 / 9'}
                  />
                </Form.Item>
              </Col>
            ))}
          </Row>
        </SectionCard>

        <SectionCard
          title="Header contact bar"
          description="Phone, email and social links above the navigation. Hidden when all are empty."
        >
          <Form.Item label="Show the contact bar" name="headerTopBarEnabled" valuePropName="checked" extra="The phone number and email come from Site identity above.">
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
            extra="Empty uses the default. {year} and {name} stay up to date."
          >
            <Input maxLength={200} placeholder="© {year} {name}. All rights reserved." />
          </Form.Item>
          <Form.Item label="Footer text" name="footerText" extra="A short paragraph under the footer brand.">
            <Input.TextArea rows={3} maxLength={600} showCount placeholder="A sentence about who runs the directory and how to get in touch." />
          </Form.Item>
        </SectionCard>

        <StickyActions status={record && record.version > 0 ? `Version ${record.version} · last changed ${formatDateTime(record.updatedAt)}` : 'Not saved yet'}>
          <Button onClick={reload}>Reload</Button>
          <Button type="primary" htmlType="submit" loading={saving}>
            Save settings
          </Button>
        </StickyActions>
      </Form>

    </div>
  );
}
