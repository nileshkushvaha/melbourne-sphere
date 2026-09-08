import { useEffect } from 'react';
import { Alert, App, Form, Input, InputNumber, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router';
import { partnersApi, type PartnerOrganisation } from '@/api/website';
import { RecordEditorPage, SectionCard } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  name: string;
  relationshipLabel: string;
  mediaId: string;
  logoAlt: string;
  websiteUrl: string;
  displayOrder: number;
}

const LIST = '/website/partners';

/** Create or edit one client or partner organisation on its own page (SRS 1.2 PTNR 005). */
export function PartnerEditorPage() {
  const { id } = useParams();
  const creating = id === undefined || id === 'new';
  useDocumentTitle(creating ? 'New organisation' : 'Edit organisation');
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Values>();
  const { saving, error, submit } = useRecordEditor<Values>(form);

  const [state] = useAsync<PartnerOrganisation | null>(
    () => (creating ? Promise.resolve(null) : partnersApi.list({ pageSize: 50 }).then((r) => r.data.find((row) => row.id === id) ?? null)),
    [id, creating],
  );
  const record = state.status === 'ready' ? state.data : null;

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      name: record.name,
      relationshipLabel: record.relationshipLabel ?? '',
      mediaId: record.mediaId ?? '',
      logoAlt: record.logoAlt ?? '',
      websiteUrl: record.websiteUrl ?? '',
      displayOrder: record.displayOrder,
    });
  }, [record, form]);

  const persist = (values: Values) =>
    submit(async () => {
      const payload = {
        name: values.name,
        relationshipLabel: values.relationshipLabel?.trim() || null,
        mediaId: values.mediaId?.trim() || null,
        logoAlt: values.logoAlt?.trim() || null,
        websiteUrl: values.websiteUrl?.trim() || null,
        displayOrder: values.displayOrder,
      };
      if (creating) await partnersApi.create(payload);
      else if (record) await partnersApi.update(record.id, { ...payload, expectedVersion: record.version });
      message.success(creating ? 'Organisation created as a draft' : 'Organisation updated');
    }).then((ok) => {
      if (ok) navigate(LIST);
    });

  const save = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    // Permission was given for a particular mark (SRS 1.2 PTNR 003).
    if (record?.authorisedAt && (record.mediaId ?? '') !== (values.mediaId?.trim() || '')) {
      modal.confirm({
        title: 'Change the logo?',
        content: 'The recorded authorisation covers the current mark. Changing it clears the authorisation, and the note that evidenced permission goes with it.',
        okText: 'Change the logo',
        onOk: () => persist(values),
      });
      return;
    }
    await persist(values);
  };

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Website' }, { label: 'Clients and partners', href: LIST }, { label: creating ? 'New organisation' : 'Edit' }]}
      title={creating ? 'New organisation' : 'Edit organisation'}
      description="Public marketing content only: these records are not accounts and grant no access. A logo is published only with recorded permission and alternative text."
      listHref={LIST}
      listLabel="Back to organisations"
      form={form}
      initialValues={{ name: '', relationshipLabel: '', mediaId: '', logoAlt: '', websiteUrl: '', displayOrder: 0 }}
      loading={state.status === 'loading'}
      saving={saving}
      error={error ?? (state.status === 'error' ? state.message : null)}
      status={record ? `Version ${record.version} · last edited ${formatDateTime(record.updatedAt)}` : 'Not saved yet'}
      onSubmit={save}
      submitLabel={creating ? 'Create organisation' : 'Save changes'}
      aside={
        record ? (
          <SectionCard title="Authorisation" description="Recorded permission to display this organisation’s mark.">
            {record.authorisedAt ? (
              <>
                <Alert type="success" showIcon message={`Recorded ${formatDateTime(record.authorisedAt)}`} style={{ marginBottom: 12 }} />
                <Typography.Text type="secondary">{record.authorisationNote ?? 'No note was recorded about how permission was given.'}</Typography.Text>
              </>
            ) : (
              <Alert type="warning" showIcon message="Not authorised" description="Add the logo, then record the authorisation from the list before publishing." />
            )}
          </SectionCard>
        ) : undefined
      }
    >
      <Form.Item label="Organisation name" name="name" rules={[{ required: true, min: 2, max: 150, message: 'Between 2 and 150 characters' }]}>
        <Input maxLength={150} style={{ maxWidth: 420 }} />
      </Form.Item>
      <Form.Item label="Relationship" name="relationshipLabel" extra="How the organisation is related, e.g. Community partner.">
        <Input maxLength={120} style={{ maxWidth: 420 }} />
      </Form.Item>
      <Form.Item label="Logo media id" name="mediaId" extra="An approved image from the media library. Required before publishing.">
        <Input maxLength={64} style={{ maxWidth: 420 }} />
      </Form.Item>
      <Form.Item
        label="Logo alternative text"
        name="logoAlt"
        extra="Names the organisation for anyone who cannot see the logo. Required before publishing."
      >
        <Input maxLength={200} />
      </Form.Item>
      <Form.Item label="Website" name="websiteUrl" extra="A full https address. Checked when you save.">
        <Input maxLength={300} />
      </Form.Item>
      <Form.Item label="Display order" name="displayOrder">
        <InputNumber min={0} max={9999} />
      </Form.Item>
    </RecordEditorPage>
  );
}
