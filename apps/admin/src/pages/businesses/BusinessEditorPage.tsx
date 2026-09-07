import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Col, Descriptions, Form, Input, InputNumber, List, Modal, Row, Select, Space, Switch, Tag, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useInvalidate, useOnError, useOne } from '@refinedev/core';
import { Link, useNavigate, useParams } from 'react-router';
import { ACTIONS_BY_STATUS, businessesApi, LINK_KINDS, toNamePath, type BusinessAction, type BusinessRecord, type CreateBusinessInput, type UpdateBusinessInput } from '@/api/businesses';
import { GalleryEditor } from './GalleryEditor';
import { HoursEditor } from './HoursEditor';
import { isApiError } from '@/api/errors';
import { taxonomyApi, type CategoryItem, type LocalAreaItem, type ServiceItem } from '@/api/taxonomy';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { BrandOptionLabel } from '@/components/BrandIcon';
import { brandLabel } from '@/shared/brands';
import { PageLoader } from '@/components/ui';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

const ACTION_LABELS: Record<BusinessAction, { label: string; title: string; hint: string; danger?: boolean }> = {
  publish: { label: 'Publish', title: 'Publish this listing?', hint: 'It becomes visible in the public directory immediately.' },
  unpublish: { label: 'Unpublish', title: 'Unpublish this listing?', hint: 'It returns to draft and disappears from the public directory.', danger: true },
  archive: { label: 'Archive', title: 'Archive this listing?', hint: 'Archived listings are hidden everywhere and cannot be edited until restored.', danger: true },
  restore: { label: 'Restore', title: 'Restore this listing to draft?', hint: 'It stays private until published again.' },
};

type FormValues = Omit<CreateBusinessInput, 'address' | 'contentRightsReviewed'> & {
  hasAddress: boolean;
  address?: { line1?: string; line2?: string | null; suburb?: string; postcode?: string; latitude?: number | null; longitude?: number | null };
  contentRightsReviewed?: boolean;
  links?: { kind: (typeof LINK_KINDS)[number]; url: string; label?: string | null }[];
};

const toForm = (b: BusinessRecord): FormValues => ({
  name: b.name,
  slug: b.slug,
  description: b.description,
  primaryCategoryId: b.primaryCategoryId,
  secondaryCategoryIds: b.secondaryCategoryIds,
  serviceIds: b.serviceIds,
  localAreaId: b.localAreaId,
  publicPhone: b.publicPhone,
  publicEmail: b.publicEmail,
  publicUrl: b.publicUrl,
  addressVisibility: b.addressVisibility,
  hasAddress: b.address !== null,
  address: b.address ?? undefined,
  privateEnquiryEmail: b.privateEnquiryEmail ?? undefined,
  eligibilitySource: b.eligibilitySource,
  contentRightsReviewed: b.contentRightsReviewedAt !== null,
  contentRightsNote: b.contentRightsNote,
  links: b.links.map((l) => ({ kind: l.kind, url: l.url, label: l.label ?? '' })),
});

const toBody = (v: FormValues, existing: BusinessRecord | null): CreateBusinessInput => {
  const nullable = (s: string | null | undefined) => (s === undefined ? undefined : s === '' ? null : s);
  const body: CreateBusinessInput = {
    name: v.name,
    description: v.description,
    primaryCategoryId: v.primaryCategoryId,
    localAreaId: v.localAreaId,
    secondaryCategoryIds: v.secondaryCategoryIds ?? [],
    serviceIds: v.serviceIds ?? [],
    publicPhone: nullable(v.publicPhone) ?? null,
    publicEmail: nullable(v.publicEmail) ?? null,
    publicUrl: nullable(v.publicUrl) ?? null,
    addressVisibility: v.addressVisibility ?? 'full',
    address: v.hasAddress && v.address ? { line1: v.address.line1 ?? '', line2: nullable(v.address.line2) ?? null, suburb: v.address.suburb ?? '', postcode: v.address.postcode ?? '', latitude: v.address.latitude ?? null, longitude: v.address.longitude ?? null } : null,
    eligibilitySource: nullable(v.eligibilitySource) ?? null,
    contentRightsReviewed: v.contentRightsReviewed ?? false,
    contentRightsNote: nullable(v.contentRightsNote) ?? null,
    links: (v.links ?? []).map((l) => ({ kind: l.kind, url: l.url, label: nullable(l.label) ?? null })),
  };
  // The slug is server-generated on create and locked after first publication; only send it when the editor changed it.
  if (v.slug && v.slug !== existing?.slug) body.slug = v.slug;
  // Leaving the private email blank keeps the stored value; an explicit empty string clears it.
  if (v.privateEnquiryEmail !== undefined && v.privateEnquiryEmail !== (existing?.privateEnquiryEmail ?? undefined)) body.privateEnquiryEmail = v.privateEnquiryEmail === '' ? null : v.privateEnquiryEmail;
  return body;
};

/**
 * Create/edit screen for one business listing with its publication workflow
 * (SRS BUS 001–006, API 005 optimistic concurrency). Every write carries the
 * record version; conflicts, publication blockers and duplicate suspicion are
 * surfaced from the API envelope rather than re-implemented client side.
 */
export function BusinessEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === undefined;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const invalidate = useInvalidate();
  const { mutate: onAuthError } = useOnError();
  const api = businessesApi();
  const { can, loading: capabilitiesLoading } = useCapabilities();
  const canWrite = can(PERMISSION.listingsWrite);
  const canPublish = can(PERMISSION.listingsPublish);
  const [form] = Form.useForm<FormValues>();
  const hasAddress = Form.useWatch('hasAddress', form);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: BusinessAction; blockers?: string[]; needsOverride?: boolean } | null>(null);
  const [actionForm] = Form.useForm<{ reason?: string; duplicateOverrideReason?: string }>();

  const record = useOne<BusinessRecord>({ resource: 'businesses', id: id ?? '', queryOptions: { enabled: !isNew, retry: false }, errorNotification: false });
  const business = isNew ? null : (record.result ?? null);
  useDocumentTitle(isNew ? 'New business' : (business?.name ?? 'Business'));
  const [categories] = useAsync(() => taxonomyApi<CategoryItem>('categories').list({ pageSize: 50, status: 'active', sort: 'name' }).then((r) => r.data), []);
  const [services] = useAsync(() => taxonomyApi<ServiceItem>('services').list({ pageSize: 50, status: 'active', sort: 'name' }).then((r) => r.data), []);
  const [areas] = useAsync(() => taxonomyApi<LocalAreaItem>('areas').list({ pageSize: 50, status: 'active', sort: 'name' }).then((r) => r.data), []);

  useEffect(() => {
    if (business) form.setFieldsValue(toForm(business));
  }, [business, form]);

  const refresh = () => invalidate({ resource: 'businesses', invalidates: ['list', 'detail'], id });

  const submit = async (values: FormValues) => {
    setFormError(null);
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.create(toBody(values, null));
        message.success('Business created as a draft');
        await invalidate({ resource: 'businesses', invalidates: ['list'] });
        navigate(`/businesses/${encodeURIComponent(created.id)}`);
      } else if (business) {
        const body: UpdateBusinessInput = { ...toBody(values, business), expectedVersion: business.version };
        await api.update(business.id, body);
        message.success('Business saved');
        await refresh();
      }
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') {
        onAuthError(error); // session expired or revoked → auth provider redirects to sign in
      } else if (isApiError(error) && error.code === 'STALE_VERSION') {
        setFormError('This listing was changed by someone else. Reload to see the latest version before saving again.');
      } else if (isApiError(error) && error.code === 'SLUG_LOCKED') {
        form.setFields([{ name: 'slug', errors: [error.userMessage] }]);
        setFormError(error.userMessage);
      } else {
        const errors = fieldErrors(error);
        form.setFields(Object.entries(errors).map(([path, list]) => ({ name: toNamePath(path), errors: list })) as never);
        setFormError(errorMessage(error));
      }
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!business || !pendingAction) return;
    const values = actionForm.getFieldsValue();
    try {
      const updated = await api.transition(business.id, pendingAction.action, { expectedVersion: business.version, reason: values.reason || undefined, duplicateOverrideReason: values.duplicateOverrideReason || undefined });
      message.success(`Listing ${updated.status}`);
      setPendingAction(null);
      actionForm.resetFields();
      await refresh();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else if (isApiError(error) && error.code === 'PUBLICATION_BLOCKED') setPendingAction({ ...pendingAction, blockers: error.fields.publication ?? [error.userMessage] });
      else if (isApiError(error) && error.code === 'DUPLICATE_SUSPECTED') setPendingAction({ ...pendingAction, needsOverride: true, blockers: undefined });
      else if (isApiError(error) && error.code === 'STALE_VERSION') setPendingAction({ ...pendingAction, blockers: ['This listing was changed by someone else. Reload and try again.'] });
      else setPendingAction({ ...pendingAction, blockers: [errorMessage(error)] });
    }
  };

  if (!isNew && record.query.isError) {
    const error = record.query.error;
    return <Alert type="error" showIcon message={isApiError(error) ? error.userMessage : 'Could not load this business.'} description={isApiError(error) ? error.reference : null} action={<Link to="/businesses">Back to businesses</Link>} />;
  }
  // Capabilities decide whether this form is editable, so the screen waits for
  // them rather than rendering a form that is disabled and then is not
  // (SRS RBAC 010). Behind the route guard they are already known, so this is
  // normally invisible.
  if (capabilitiesLoading) return <PageLoader label="Checking your permissions…" />;
  if (!isNew && !business) return <PageLoader label="Loading this listing…" />;
  const readOnly = !canWrite || business?.status === 'archived';
  const actions = business ? ACTIONS_BY_STATUS[business.status].filter((a) => (a === 'publish' || a === 'unpublish' ? canPublish : canWrite)) : [];
  const options = (items: { id: string; name: string }[]) => items.map((i) => ({ value: i.id, label: i.name }));

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }} align="start" wrap>
        <div>
          <Typography.Title level={1} style={{ fontSize: 26, margin: 0 }}>
            {isNew ? 'New business' : business!.name}
          </Typography.Title>
          <Link to="/businesses">← Back to businesses</Link>
        </div>
        {business && (
          <Space wrap>
            <Tag color={business.status === 'published' ? 'green' : business.status === 'archived' ? 'orange' : 'default'} style={{ fontSize: 14, padding: '4px 10px' }}>
              {business.status}
            </Tag>
            {actions.map((a) => (
              <Button key={a} danger={ACTION_LABELS[a].danger} type={a === 'publish' ? 'primary' : 'default'} onClick={() => { actionForm.resetFields(); setPendingAction({ action: a, needsOverride: a === 'publish' && business.duplicateWarnings.length > 0 }); }}>
                {ACTION_LABELS[a].label}
              </Button>
            ))}
          </Space>
        )}
      </Space>
      {business && business.status === 'draft' && business.publicationBlockers.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Not ready to publish" description={<List size="small" dataSource={business.publicationBlockers} renderItem={(b) => <List.Item>{b}</List.Item>} />} />
      )}
      {business && business.duplicateWarnings.length > 0 && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="Possible duplicate" description={<ul style={{ margin: 0, paddingInlineStart: 18 }}>{business.duplicateWarnings.map((d) => <li key={d.businessId}><Link to={`/businesses/${encodeURIComponent(d.businessId)}`}>{d.name}</Link> ({d.slug}) — matched on {d.match.replace(/_/g, ' ')}</li>)}</ul>} />
      )}
      {business?.status === 'archived' && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="Archived listings are read-only. Restore it to make changes." />}
      {formError && <Alert type="error" showIcon message={formError} style={{ marginBottom: 16 }} role="alert" />}
      <Form<FormValues> form={form} layout="vertical" requiredMark="optional" onFinish={submit} disabled={readOnly} initialValues={{ addressVisibility: 'full', hasAddress: true, secondaryCategoryIds: [], serviceIds: [], links: [] }}>
        <Row gutter={24}>
          <Col xs={24} lg={14}>
            <Card title="Listing" style={{ marginBottom: 24 }}>
              <Form.Item label="Name" name="name" rules={[{ required: true, message: 'Name is required' }, { min: 2, max: 120, message: 'Name must be 2–120 characters' }]}>
                <Input maxLength={120} />
              </Form.Item>
              <Form.Item label="Slug" name="slug" extra={business?.firstPublishedAt ? 'Locked after first publication (public URL stability).' : 'Generated from the name when left blank.'}>
                <Input maxLength={140} disabled={readOnly || business?.firstPublishedAt !== null && business !== null} />
              </Form.Item>
              <Form.Item label="Description" name="description" extra="At least 40 characters are required to publish." rules={[{ required: true, message: 'Description is required' }]}>
                <Input.TextArea rows={6} maxLength={5000} showCount />
              </Form.Item>
              <Form.Item label="Primary category" name="primaryCategoryId" rules={[{ required: true, message: 'Primary category is required' }]}>
                <Select showSearch optionFilterProp="label" placeholder="Choose a category" options={categories.status === 'ready' ? options(categories.data) : []} />
              </Form.Item>
              <Form.Item label="Secondary categories" name="secondaryCategoryIds">
                <Select mode="multiple" optionFilterProp="label" placeholder="Optional" options={categories.status === 'ready' ? options(categories.data) : []} />
              </Form.Item>
              <Form.Item label="Services" name="serviceIds">
                <Select mode="multiple" optionFilterProp="label" placeholder="Optional" options={services.status === 'ready' ? options(services.data) : []} />
              </Form.Item>
              <Form.Item label="Local area" name="localAreaId" rules={[{ required: true, message: 'Local area is required' }]}>
                <Select showSearch optionFilterProp="label" placeholder="Choose a Melbourne area" options={areas.status === 'ready' ? options(areas.data) : []} />
              </Form.Item>
            </Card>
            <Card title="Contact and address" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col xs={24} md={8}><Form.Item label="Public phone" name="publicPhone"><Input maxLength={30} inputMode="tel" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item label="Public email" name="publicEmail"><Input maxLength={254} inputMode="email" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item label="Website" name="publicUrl" extra="Must start with https:// or http://"><Input maxLength={500} inputMode="url" /></Form.Item></Col>
              </Row>
              <Typography.Text strong>Social and other links</Typography.Text>
              <Form.List name="links">
                {(fields, { add, remove }) => (
                  <div style={{ marginTop: 8, marginBottom: 16 }}>
                    {fields.map((field) => (
                      <Space key={field.key} align="baseline" wrap>
                        <Form.Item name={[field.name, 'kind']} style={{ marginBottom: 8 }}>
                          <Select aria-label="Link type" style={{ width: 150 }} optionLabelProp="title" options={LINK_KINDS.map((k) => ({ value: k, title: brandLabel(k), label: <BrandOptionLabel kind={k} /> }))} />
                        </Form.Item>
                        <Form.Item name={[field.name, 'url']} rules={[{ required: true, message: 'URL is required' }]} style={{ marginBottom: 8 }}>
                          <Input aria-label="Link URL" placeholder="https://" maxLength={500} style={{ width: 300 }} inputMode="url" />
                        </Form.Item>
                        <Form.Item name={[field.name, 'label']} style={{ marginBottom: 8 }}>
                          <Input aria-label="Link label" placeholder="Label (optional)" maxLength={60} style={{ width: 160 }} />
                        </Form.Item>
                        <Button type="text" icon={<DeleteOutlined aria-hidden="true" />} aria-label="Remove link" onClick={() => remove(field.name)} />
                      </Space>
                    ))}
                    {fields.length < 8 && (
                      <Button size="small" icon={<PlusOutlined aria-hidden="true" />} onClick={() => add({ kind: 'other', url: '', label: '' })} disabled={readOnly}>
                        Add link
                      </Button>
                    )}
                  </div>
                )}
              </Form.List>
              <Form.Item label="Has a street address" name="hasAddress" valuePropName="checked"><Switch /></Form.Item>
              {hasAddress && (
                <>
                  <Form.Item label="Address line 1" name={['address', 'line1']} rules={[{ required: true, message: 'Address line 1 is required' }]}><Input maxLength={120} /></Form.Item>
                  <Form.Item label="Address line 2" name={['address', 'line2']}><Input maxLength={120} /></Form.Item>
                  <Row gutter={16}>
                    <Col xs={24} md={12}><Form.Item label="Suburb" name={['address', 'suburb']} rules={[{ required: true, message: 'Suburb is required' }]}><Input maxLength={80} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Postcode" name={['address', 'postcode']} rules={[{ required: true, message: 'Postcode is required' }, { pattern: /^(3\d{3}|8\d{3})$/, message: 'Enter a Victorian postcode' }]}><Input maxLength={4} inputMode="numeric" /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Latitude" name={['address', 'latitude']}><InputNumber style={{ width: '100%' }} min={-39.5} max={-33.5} step={0.000001} /></Form.Item></Col>
                    <Col xs={24} md={12}><Form.Item label="Longitude" name={['address', 'longitude']}><InputNumber style={{ width: '100%' }} min={140} max={151} step={0.000001} /></Form.Item></Col>
                  </Row>
                  <Form.Item label="Address visibility" name="addressVisibility">
                    <Select options={[{ value: 'full', label: 'Show full address' }, { value: 'areaOnly', label: 'Show local area only' }]} />
                  </Form.Item>
                </>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={10}>
            <Card title="Compliance" style={{ marginBottom: 24 }}>
              <Form.Item label="Private enquiry email" name="privateEnquiryEmail" extra={business?.hasPrivateEnquiryEmail && !canWrite ? 'Set (hidden for your role).' : 'Encrypted at rest; never shown publicly. Enquiries are forwarded here.'}>
                <Input maxLength={254} inputMode="email" placeholder={business?.hasPrivateEnquiryEmail ? 'Set — enter a new address to replace it' : undefined} />
              </Form.Item>
              <Form.Item label="Melbourne eligibility source" name="eligibilitySource" extra="How you verified the business is inside the approved Melbourne boundary. Saving it records the verification time.">
                <Input maxLength={255} />
              </Form.Item>
              {business?.eligibilityVerifiedAt && <Typography.Paragraph type="secondary">Verified {formatDateTime(business.eligibilityVerifiedAt)}</Typography.Paragraph>}
              <Form.Item label="Content rights reviewed" name="contentRightsReviewed" valuePropName="checked" extra="Confirm the description and details may be published."><Switch /></Form.Item>
              <Form.Item label="Content rights note" name="contentRightsNote"><Input.TextArea rows={3} maxLength={500} /></Form.Item>
            </Card>
            {business && (
              <Card title="Record" style={{ marginBottom: 24 }}>
                <Descriptions column={1} size="small" items={[
                  { key: 'created', label: 'Created', children: formatDateTime(business.createdAt) },
                  { key: 'updated', label: 'Updated', children: formatDateTime(business.updatedAt) },
                  { key: 'published', label: 'Published', children: business.publishedAt ? formatDateTime(business.publishedAt) : '—' },
                  { key: 'first', label: 'First published', children: business.firstPublishedAt ? formatDateTime(business.firstPublishedAt) : '—' },
                  { key: 'version', label: 'Version', children: String(business.version) },
                ]} />
              </Card>
            )}
          </Col>
        </Row>
        {!readOnly && (
          <Space style={{ marginBottom: 24 }}>
            <Button type="primary" htmlType="submit" loading={saving}>{isNew ? 'Create draft' : 'Save changes'}</Button>
            {!isNew && <Button onClick={() => void refresh()}>Reload</Button>}
          </Space>
        )}
      </Form>
      {business && <GalleryEditor businessId={business.id} businessVersion={business.version} readOnly={readOnly} onSaved={() => void refresh()} />}
      {business && <HoursEditor businessId={business.id} businessVersion={business.version} readOnly={readOnly} onSaved={() => void refresh()} />}
      <Modal
        open={pendingAction !== null}
        title={pendingAction ? ACTION_LABELS[pendingAction.action].title : ''}
        okText={pendingAction ? ACTION_LABELS[pendingAction.action].label : 'OK'}
        okButtonProps={{ danger: pendingAction ? ACTION_LABELS[pendingAction.action].danger : false }}
        onOk={() => void runAction()}
        onCancel={() => setPendingAction(null)}
        destroyOnHidden
      >
        {pendingAction && <Typography.Paragraph>{ACTION_LABELS[pendingAction.action].hint}</Typography.Paragraph>}
        {pendingAction?.blockers && <Alert type="error" showIcon role="alert" style={{ marginBottom: 12 }} message="Cannot continue" description={<ul style={{ margin: 0, paddingInlineStart: 18 }}>{pendingAction.blockers.map((b) => <li key={b}>{b}</li>)}</ul>} />}
        <Form form={actionForm} layout="vertical" requiredMark={false}>
          {pendingAction?.needsOverride && (
            <Form.Item label="Duplicate override reason" name="duplicateOverrideReason" extra="This listing matches an existing one. Explain why it is a distinct business (recorded in the audit log)." rules={[{ required: true, min: 10, message: 'Give at least 10 characters' }]}>
              <Input.TextArea rows={3} maxLength={500} />
            </Form.Item>
          )}
          <Form.Item label="Reason (optional, recorded in the audit log)" name="reason"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
