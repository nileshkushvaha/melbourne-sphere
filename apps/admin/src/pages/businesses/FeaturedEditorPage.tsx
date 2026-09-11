import { App, Form, Input, InputNumber, Typography } from 'antd';
import { useNavigate } from 'react-router';
import { businessesApi, featuredApi } from '@/api/businesses';
import { melbourneLocalToUtc, utcToMelbourneLocal, melbourneOffsetLabel } from '@/api/blog';
import { RecordEditorPage } from '@/components/ui';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { FormSelect } from '@/components/FormSelect';

interface Values {
  businessId: string;
  startsLocal: string;
  endsLocal?: string;
  position?: number;
  note?: string;
}

/**
 * A new featured placement on its own route (SRS DIR 007).
 *
 * A placement is created and removed, never edited: the audit trail of "this
 * listing was featured from then until then" is more useful than a record whose
 * dates were quietly moved. Times are entered in Melbourne time and converted
 * once, here, so what is stored is unambiguous.
 */
export function FeaturedEditorPage() {
  useDocumentTitle('Feature a listing');
  const api = featuredApi();
  const listings = businessesApi();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<Values>();
  const { saving, error, setError, submit } = useRecordEditor<Values>(form);
  const [published] = useAsync((signal) => listings.list({ status: 'published', pageSize: 50, sort: 'name', order: 'asc' }, signal), []);
  // The offset of the dates being entered, not of today: across a daylight-saving
  // change the two differ by an hour, and the label is what the operator trusts.
  const startsLocal = Form.useWatch('startsLocal', form) as string | undefined;
  const endsLocal = Form.useWatch('endsLocal', form) as string | undefined;
  const startOffset = melbourneOffsetLabel(melbourneLocalToUtc(startsLocal ?? '') ?? new Date());
  const endOffset = melbourneOffsetLabel(melbourneLocalToUtc(endsLocal ?? '') ?? melbourneLocalToUtc(startsLocal ?? '') ?? new Date());

  const save = () =>
    submit(async (values) => {
      // Entered in Melbourne time and converted once, here, so what reaches the
      // API is unambiguous whatever the operator's own clock says.
      const startsAt = melbourneLocalToUtc(values.startsLocal);
      if (!startsAt) {
        setError('Choose a valid start date and time');
        throw new Error('invalid-start');
      }
      const endsAt = values.endsLocal ? melbourneLocalToUtc(values.endsLocal) : null;
      if (values.endsLocal && !endsAt) {
        setError('Choose a valid end date and time');
        throw new Error('invalid-end');
      }
      await api.create({ businessId: values.businessId, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, position: values.position ?? 0, note: values.note });
      message.success('Placement created');
    }).then((ok) => {
      if (ok) navigate('/businesses/featured');
    });

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Business', href: '/businesses' }, { label: 'Featured listings', href: '/businesses/featured' }, { label: 'Feature a listing' }]}
      title="Feature a listing"
      description="Shown in a labelled block above results. It must still match the search and be published."
      listHref="/businesses/featured"
      listLabel="All placements"
      form={form}
      initialValues={{ startsLocal: utcToMelbourneLocal(new Date()), position: 0 }}
      saving={saving}
      error={error}
      submitLabel="Create placement"
      onSubmit={save}
      aside={
        <div style={{ border: '1px solid var(--ant-color-border)', borderRadius: 8, padding: 16 }}>
          <Typography.Text strong>What this does not do</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
            It never changes ranking, bypasses a filter or shows an unpublished listing. There is no payment involved.
          </Typography.Paragraph>
        </div>
      }
    >
      <Form.Item label="Listing" name="businessId" rules={[{ required: true, message: 'Choose a published listing' }]}>
        <FormSelect
          showSearch
          optionFilterProp="label"
          placeholder="Choose a published listing"
          loading={published.status === 'loading'}
          options={published.status === 'ready' ? published.data.data.map((business) => ({ value: business.id, label: business.name })) : []}
        />
      </Form.Item>
      <Form.Item label={`Starts (Melbourne time, ${startOffset})`} name="startsLocal" rules={[{ required: true, message: 'Choose when the placement starts' }]}>
        <Input type="datetime-local" />
      </Form.Item>
      <Form.Item label={`Ends (optional, Melbourne time, ${endOffset})`} name="endsLocal" extra="Leave empty for an open-ended placement.">
        <Input type="datetime-local" />
      </Form.Item>
      <Form.Item label="Position" name="position" extra="Lower positions appear first.">
        <InputNumber min={0} max={999} style={{ width: 120 }} />
      </Form.Item>
      <Form.Item label="Editorial note" name="note" extra="Recorded in the audit log; never shown publicly." style={{ marginBottom: 0 }}>
        <Input maxLength={500} />
      </Form.Item>
    </RecordEditorPage>
  );
}
