import { useEffect } from 'react';
import { Alert, App, Form, Input, InputNumber, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router';
import { testimonialsApi, type Testimonial } from '@/api/website';
import { RecordEditorPage, SectionCard } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  displayName: string;
  relationship: string;
  quote: string;
  businessId: string;
  mediaId: string;
  displayOrder: number;
}

const LIST = '/website/testimonials';

/** Create or edit one testimonial on its own page (SRS 1.2 TSTM 005). */
export function TestimonialEditorPage() {
  const { id } = useParams();
  const creating = id === undefined || id === 'new';
  useDocumentTitle(creating ? 'New testimonial' : 'Edit testimonial');
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm<Values>();
  const { saving, error, submit } = useRecordEditor<Values>(form);

  const [state] = useAsync<Testimonial | null>(
    () => (creating ? Promise.resolve(null) : testimonialsApi.list({ pageSize: 50 }).then((r) => r.data.find((row) => row.id === id) ?? null)),
    [id, creating],
  );
  const record = state.status === 'ready' ? state.data : null;

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      displayName: record.displayName,
      relationship: record.relationship ?? '',
      quote: record.quote,
      businessId: record.businessId ?? '',
      mediaId: record.mediaId ?? '',
      displayOrder: record.displayOrder,
    });
  }, [record, form]);

  const persist = (values: Values) =>
    submit(async () => {
      const payload = {
        displayName: values.displayName,
        relationship: values.relationship?.trim() || null,
        quote: values.quote,
        businessId: values.businessId?.trim() || null,
        mediaId: values.mediaId?.trim() || null,
        displayOrder: values.displayOrder,
      };
      if (creating) await testimonialsApi.create(payload);
      else if (record) await testimonialsApi.update(record.id, { ...payload, expectedVersion: record.version });
      message.success(creating ? 'Testimonial created as a draft' : 'Testimonial updated');
    }).then((ok) => {
      if (ok) navigate(LIST);
    });

  const save = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    // Consent was given for particular words: say what changing them costs
    // before it happens, not after (SRS 1.2 TSTM 002).
    if (record?.approvedAt && record.quote !== values.quote.trim()) {
      modal.confirm({
        title: 'Change the quote?',
        content: 'The recorded approval covers the current wording. Changing it clears the approval, and the note that evidenced consent goes with it.',
        okText: 'Change the quote',
        onOk: () => persist(values),
      });
      return;
    }
    await persist(values);
  };

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Website' }, { label: 'Testimonials', href: LIST }, { label: creating ? 'New testimonial' : 'Edit' }]}
      title={creating ? 'New testimonial' : 'Edit testimonial'}
      description="Quotes on the public home page. Recording who approved a quote is optional."
      listHref={LIST}
      listLabel="Back to testimonials"
      form={form}
      initialValues={{ displayName: '', relationship: '', quote: '', businessId: '', mediaId: '', displayOrder: 0 }}
      loading={state.status === 'loading'}
      saving={saving}
      error={error ?? (state.status === 'error' ? state.message : null)}
      status={record ? `Version ${record.version} · last edited ${formatDateTime(record.updatedAt)}` : 'Not saved yet'}
      onSubmit={save}
      submitLabel={creating ? 'Create testimonial' : 'Save changes'}
      aside={
        record ? (
          <SectionCard title="Approval" description="Recorded consent to use these words. Publication is refused without it.">
            {record.approvedAt ? (
              <>
                <Alert type="success" showIcon message={`Recorded ${formatDateTime(record.approvedAt)}`} style={{ marginBottom: 12 }} />
                <Typography.Text type="secondary">{record.approvalNote ?? 'No note was recorded about how consent was given.'}</Typography.Text>
              </>
            ) : (
              <Alert type="warning" showIcon message="Not approved" description="Record the approval from the list before publishing." />
            )}
          </SectionCard>
        ) : undefined
      }
    >
      <Form.Item label="Name" name="displayName" extra="How the person is credited publicly." rules={[{ required: true, min: 2, max: 120, message: 'Between 2 and 120 characters' }]}>
        <Input maxLength={120} style={{ maxWidth: 420 }} placeholder="e.g. Sarah Nguyen" />
      </Form.Item>
      <Form.Item label="Role or relationship" name="relationship" extra="How the person is described under their name.">
        <Input maxLength={160} style={{ maxWidth: 420 }} placeholder="e.g. Owner, Carlton Corner Bakery" />
      </Form.Item>
      <Form.Item
        label="Quote"
        name="quote"
        extra="Plain text, in the person’s own words. Formatting is removed when you save."
        rules={[{ required: true, min: 20, max: 1000, message: 'Between 20 and 1000 characters' }]}
      >
        <Input.TextArea rows={7} maxLength={1000} showCount placeholder="What they said, in their own words." />
      </Form.Item>
      <Form.Item label="Linked listing" name="businessId" extra="The listing's reference, so the quote links to it. Copy it from the listing address.">
        <Input maxLength={64} style={{ maxWidth: 420 }} placeholder="Paste a listing reference" />
      </Form.Item>
      <Form.Item label="Portrait image" name="mediaId" extra="The reference of an approved image from the media library. Copy it from the image's page.">
        <Input maxLength={64} style={{ maxWidth: 420 }} placeholder="Paste an image reference" />
      </Form.Item>
      <Form.Item label="Display order" name="displayOrder">
        <InputNumber min={0} max={9999} placeholder="0" />
      </Form.Item>
    </RecordEditorPage>
  );
}
