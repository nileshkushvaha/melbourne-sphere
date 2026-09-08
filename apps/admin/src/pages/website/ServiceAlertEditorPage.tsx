import { useEffect } from 'react';
import { App, DatePicker, Form, Input, InputNumber, Select, Switch, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router';
import { serviceAlertsApi, type AlertSeverity, type ServiceAlert } from '@/api/website';
import { RecordEditorPage, SectionCard } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  title: string;
  message: string;
  severity: AlertSeverity;
  window?: [dayjs.Dayjs | null, dayjs.Dayjs | null];
  linkLabel: string;
  linkUrl: string;
  dismissible: boolean;
  priority: number;
  displayOrder: number;
}

const LIST = '/website/service-alerts';

/** Create or edit one alert on its own page (SRS 1.2 ALRT 007). */
export function ServiceAlertEditorPage() {
  const { id } = useParams();
  const creating = id === undefined || id === 'new';
  useDocumentTitle(creating ? 'New alert' : 'Edit alert');
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<Values>();
  const { saving, error, submit } = useRecordEditor<Values>(form);

  const [state] = useAsync<ServiceAlert | null>(
    () => (creating ? Promise.resolve(null) : serviceAlertsApi.list({ pageSize: 50 }).then((r) => r.data.find((row) => row.id === id) ?? null)),
    [id, creating],
  );
  const record = state.status === 'ready' ? state.data : null;

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      title: record.title,
      message: record.message,
      severity: record.severity,
      linkLabel: record.linkLabel ?? '',
      linkUrl: record.linkUrl ?? '',
      dismissible: record.dismissible,
      priority: record.priority,
      displayOrder: record.displayOrder,
      window: record.startsAt || record.endsAt ? [record.startsAt ? dayjs(record.startsAt) : null, record.endsAt ? dayjs(record.endsAt) : null] : undefined,
    });
  }, [record, form]);

  const save = () =>
    submit(async (values) => {
      const [startsAt, endsAt] = values.window ?? [];
      const payload = {
        title: values.title,
        message: values.message,
        severity: values.severity,
        linkLabel: values.linkLabel?.trim() || null,
        linkUrl: values.linkUrl?.trim() || null,
        // Entered in Melbourne time, sent as an instant (SRS 1.2 ALRT 003).
        startsAt: startsAt ? startsAt.toISOString() : null,
        endsAt: endsAt ? endsAt.toISOString() : null,
        dismissible: values.dismissible,
        priority: values.priority,
        displayOrder: values.displayOrder,
      };
      if (creating) await serviceAlertsApi.create(payload);
      else if (record) await serviceAlertsApi.update(record.id, { ...payload, expectedVersion: record.version });
      message.success(creating ? 'Alert created as a draft' : 'Alert updated');
    }).then((ok) => {
      if (ok) navigate(LIST);
    });

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Website' }, { label: 'Service alerts', href: LIST }, { label: creating ? 'New alert' : 'Edit' }]}
      title={creating ? 'New service alert' : 'Edit service alert'}
      description="Alerts appear above the header on every public page while they are published and inside their display window. Times are Melbourne time."
      listHref={LIST}
      listLabel="Back to alerts"
      form={form}
      initialValues={{ title: '', message: '', severity: 'informational', linkLabel: '', linkUrl: '', dismissible: true, priority: 0, displayOrder: 0 }}
      loading={state.status === 'loading'}
      saving={saving}
      error={error ?? (state.status === 'error' ? state.message : null)}
      status={record ? `Version ${record.version} · last edited ${formatDateTime(record.updatedAt)}` : 'Not saved yet'}
      onSubmit={save}
      submitLabel={creating ? 'Create alert' : 'Save changes'}
      aside={
        record ? (
          <SectionCard title="Status" description="Publishing is done from the list, so it is always a deliberate step.">
            <Typography.Paragraph style={{ marginBottom: 8 }}>
              {record.status === 'published' ? 'Published — shown while inside its display window.' : 'Draft — not visible to the public.'}
            </Typography.Paragraph>
            <Typography.Text type="secondary">
              Editing the wording or severity brings this alert back for anyone who dismissed the earlier version.
            </Typography.Text>
          </SectionCard>
        ) : undefined
      }
    >
      <Form.Item label="Title" name="title" rules={[{ required: true, min: 3, max: 120, message: 'Between 3 and 120 characters' }]}>
        <Input maxLength={120} showCount />
      </Form.Item>
      <Form.Item label="Message" name="message" extra="One or two sentences. It appears on every page, so keep it short." rules={[{ required: true, min: 5, max: 400, message: 'Between 5 and 400 characters' }]}>
        <Input.TextArea rows={4} maxLength={400} showCount />
      </Form.Item>
      <Form.Item label="Severity" name="severity" extra="Emergency interrupts screen readers mid-sentence, so keep it for genuine outages." rules={[{ required: true }]}>
        <Select
          style={{ maxWidth: 280 }}
          options={[
            { value: 'informational', label: 'Informational' },
            { value: 'warning', label: 'Warning' },
            { value: 'emergency', label: 'Emergency' },
          ]}
        />
      </Form.Item>
      <Form.Item label="Display window (Melbourne time)" name="window" extra="Leave empty to show it until you unpublish it.">
        <DatePicker.RangePicker showTime allowEmpty={[true, true]} style={{ width: '100%', maxWidth: 460 }} />
      </Form.Item>
      <Form.Item label="Link text" name="linkLabel" extra="Leave both link fields empty for an alert with no link.">
        <Input maxLength={60} style={{ maxWidth: 320 }} />
      </Form.Item>
      <Form.Item label="Link address" name="linkUrl" extra="A page on this site (starting with /) or an https address. Checked when you save.">
        <Input maxLength={300} />
      </Form.Item>
      <Form.Item label="Visitors can dismiss it" name="dismissible" valuePropName="checked">
        <Switch />
      </Form.Item>
      <Form.Item label="Priority" name="priority" extra="Higher shows first among alerts of the same severity.">
        <InputNumber min={0} max={100} />
      </Form.Item>
      <Form.Item label="Display order" name="displayOrder">
        <InputNumber min={0} max={9999} />
      </Form.Item>
    </RecordEditorPage>
  );
}
