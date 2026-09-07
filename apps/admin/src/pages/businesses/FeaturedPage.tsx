import { useState } from 'react';
import { Alert, App, Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { Link } from 'react-router';
import { businessesApi, featuredApi, type FeaturedPlacement } from '@/api/businesses';
import { isApiError } from '@/api/errors';
import { melbourneLocalToUtc, utcToMelbourneLocal, melbourneOffsetLabel } from '@/api/blog';
import { EmptyState, PageHeader, SectionCard, StatusTag } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, fieldErrors, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

interface FormValues {
  businessId: string;
  startsLocal: string;
  endsLocal?: string;
  position?: number;
  note?: string;
}

/**
 * Manual featured placements (SRS DIR 007). At most three ever appear for a
 * query, they never bypass matching or publication rules, and there is no
 * payment or billing anywhere in the flow.
 */
export function FeaturedPage() {
  useDocumentTitle('Featured listings');
  const api = featuredApi();
  const listings = businessesApi();
  const { message } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const { can } = useCapabilities();
  const canManage = can(PERMISSION.listingsPublish);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form] = Form.useForm<FormValues>();
  const [state, reload] = useAsync((signal) => api.list(signal), []);
  const [published] = useAsync((signal) => listings.list({ status: 'published', pageSize: 50, sort: 'name', order: 'asc' }, signal), []);
  const offsetLabel = melbourneOffsetLabel(new Date());

  const handleError = (error: unknown) => {
    if (isApiError(error) && error.kind === 'unauthorized') {
      onAuthError(error);
      return;
    }
    const errors = fieldErrors(error);
    if (Object.keys(errors).length > 0) form.setFields(Object.entries(errors).map(([name, list]) => ({ name, errors: list })) as never);
    setFormError(Object.values(errors).flat()[0] ?? errorMessage(error));
  };

  const submit = async (values: FormValues) => {
    setFormError(null);
    const startsAt = melbourneLocalToUtc(values.startsLocal);
    if (!startsAt) {
      setFormError('Choose a valid start date and time');
      return;
    }
    const endsAt = values.endsLocal ? melbourneLocalToUtc(values.endsLocal) : null;
    if (values.endsLocal && !endsAt) {
      setFormError('Choose a valid end date and time');
      return;
    }
    try {
      await api.create({ businessId: values.businessId, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null, position: values.position ?? 0, note: values.note });
      message.success('Placement created');
      setCreating(false);
      form.resetFields();
      reload();
    } catch (error) {
      handleError(error);
    }
  };

  const remove = async (row: FeaturedPlacement) => {
    try {
      await api.remove(row.id);
      message.success('Placement removed');
      reload();
    } catch (error) {
      if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
      else message.error(errorMessage(error));
    }
  };

  const rows = state.status === 'ready' ? state.data : [];

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Directory', href: '/businesses' }, { label: 'Featured listings' }]}
        title="Featured listings"
        description="Editorial placements shown in a separate labelled block above the results. At most three appear for any search, and a featured listing still has to match the visitor's filters and be published."
        actions={
          canManage ? (
            <Button
              type="primary"
              icon={<PlusOutlined aria-hidden="true" />}
              onClick={() => {
                setFormError(null);
                form.resetFields();
                form.setFieldsValue({ startsLocal: utcToMelbourneLocal(new Date()), position: 0 });
                setCreating(true);
              }}
            >
              Feature a listing
            </Button>
          ) : null
        }
      />
      {state.status === 'error' && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />}

      <SectionCard title="Placements" description="Ordered by position; the three lowest positions that match a query are the ones shown." bodyPadding={0}>
        <Table<FeaturedPlacement>
          rowKey="id"
          loading={state.status === 'loading'}
          dataSource={rows}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: state.status === 'ready' ? <EmptyState title="Nothing featured" description="Feature a published listing to highlight it above the directory results." /> : ' ' }}
          columns={[
            {
              title: 'Listing',
              render: (_: unknown, row) => (
                <span>
                  <Link to={`/businesses/${row.businessId}`} style={{ fontWeight: 600 }}>
                    {row.businessName}
                  </Link>
                  <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                    /business/{row.businessSlug}
                  </Typography.Text>
                </span>
              ),
            },
            { title: 'Position', dataIndex: 'position', width: 100 },
            { title: 'From', dataIndex: 'startsAt', render: formatDateTime },
            { title: 'Until', render: (_: unknown, row) => (row.endsAt ? formatDateTime(row.endsAt) : 'Open-ended') },
            {
              title: 'State',
              render: (_: unknown, row) => <StatusTag status={row.state === 'not-published' ? 'draft' : row.state === 'live' ? 'published' : row.state} />,
            },
            { title: 'Note', dataIndex: 'note', render: (value: string | null) => value ?? '—' },
            ...(canManage
              ? [
                  {
                    title: <span className="sr-only">Actions</span>,
                    render: (_: unknown, row: FeaturedPlacement) => (
                      <Popconfirm title="Remove this placement?" description="The listing stays published; it simply stops being featured." okText="Remove" okButtonProps={{ danger: true }} onConfirm={() => void remove(row)}>
                        <Button type="link" danger aria-label={`Remove placement for ${row.businessName}`}>
                          Remove
                        </Button>
                      </Popconfirm>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </SectionCard>

      <Modal open={creating} title="Feature a listing" okText="Create placement" onOk={() => form.submit()} onCancel={() => setCreating(false)} destroyOnHidden>
        {formError && <Alert type="error" showIcon role="alert" message={formError} style={{ marginBottom: 12 }} />}
        <Form form={form} layout="vertical" requiredMark={false} onFinish={submit}>
          <Form.Item label="Listing" name="businessId" rules={[{ required: true, message: 'Choose a published listing' }]}>
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="Choose a published listing"
              options={published.status === 'ready' ? published.data.data.map((business) => ({ value: business.id, label: business.name })) : []}
            />
          </Form.Item>
          <Form.Item label={`Starts (Melbourne time, ${offsetLabel})`} name="startsLocal" rules={[{ required: true, message: 'Choose when the placement starts' }]}>
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item label={`Ends (optional, ${offsetLabel})`} name="endsLocal" extra="Leave empty for an open-ended placement.">
            <Input type="datetime-local" />
          </Form.Item>
          <Form.Item label="Position" name="position" extra="Lower positions appear first.">
            <InputNumber min={0} max={999} style={{ width: 120 }} />
          </Form.Item>
          <Form.Item label="Editorial note" name="note" extra="Recorded in the audit log; never shown publicly.">
            <Input maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
