import { Alert, App, Button, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { partnersApi, type PartnerOrganisation } from '@/api/website';
import { PERMISSION } from '@/auth/permissions';
import { useCapabilities } from '@/auth/access-control';
import { PageHeader } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

/**
 * Client and partner logos (SRS 1.2 PTNR 005). These records are public
 * marketing content: they are not accounts and grant nobody any access.
 * Publication needs an approved logo, alternative text naming the organisation,
 * and a recorded authorisation to display the mark — the server refuses each
 * separately, and this screen says which one is missing before you try.
 */
export function PartnersPage() {
  useDocumentTitle('Clients and partners');
  const { can } = useCapabilities();
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? '1') || 1;
  const status = (params.get('status') ?? '') as '' | 'draft' | 'published';

  const [state, reload] = useAsync(() => partnersApi.list({ page, pageSize: 20, status: status || undefined }), [page, status]);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const authorise = (record: PartnerOrganisation) => {
    let note = '';
    modal.confirm({
      title: 'Record permission',
      content: (
        <div>
          <p>Confirm that {record.name} has given permission for their logo to be displayed. Your name and the time are recorded.</p>
          <Input placeholder="How permission was given, e.g. Signed agreement 2 Sep 2026" maxLength={300} onChange={(event) => (note = event.target.value)} aria-label="How permission was given" />
        </div>
      ),
      okText: 'Record permission',
      onOk: async () => {
        try {
          await partnersApi.authorise(record.id, record.version, note.trim() || null);
          message.success('Authorisation recorded');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const setPublished = (record: PartnerOrganisation, published: boolean) => {
    modal.confirm({
      title: published ? 'Publish this organisation?' : 'Unpublish this organisation?',
      content: published ? 'Its logo appears on the public home page immediately.' : 'Its logo disappears from the public home page immediately. Nothing is deleted.',
      okText: published ? 'Publish' : 'Unpublish',
      onOk: async () => {
        try {
          await partnersApi.setPublished(record.id, published, record.version);
          message.success(published ? 'Published' : 'Unpublished');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  const remove = (record: PartnerOrganisation) => {
    modal.confirm({
      title: 'Delete this organisation?',
      content: 'This cannot be undone, including the record of who authorised the logo. If you only want it off the site, unpublish it instead.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await partnersApi.remove(record.id);
          message.success('Deleted');
          reload();
        } catch (error) {
          message.error(errorMessage(error));
        }
      },
    });
  };

  /**
   * Why publishing is not available yet, in the order the server checks. Both
   * reasons are about the logo strip being renderable and readable; recording
   * permission is optional and never blocks (client instruction, 8 Sep 2026).
   */
  const blocker = (record: PartnerOrganisation): string | null => {
    if (record.status === 'published') return null;
    if (!record.mediaId) return 'Add the logo before publishing';
    if (!record.logoAlt) return 'Add alternative text naming the organisation before publishing';
    return null;
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Website' }, { label: 'Clients and partners' }]}
        title="Clients and partners"
        description="Organisations whose logos appear on the public home page. These records are content only — they are not accounts and grant no access. A logo needs alternative text before it can be published."
        actions={
          can(PERMISSION.websiteClientsCreate) ? (
            <Link to="/website/partners/new">
              <Button type="primary" icon={<PlusOutlined />}>
                New organisation
              </Button>
            </Link>
          ) : null
        }
      />

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          aria-label="Filter by status"
          placeholder="Status"
          allowClear
          value={status || undefined}
          style={{ width: 160 }}
          onChange={(value?: string) => setParam('status', value)}
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
          ]}
        />
      </Space>

      {state.status === 'error' && (
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />
      )}

      <Table<PartnerOrganisation>
        rowKey="id"
        size="small"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        locale={{ emptyText: 'No organisations yet.' }}
        pagination={
          state.status === 'ready'
            ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) }
            : false
        }
        scroll={{ x: 1000 }}
        columns={[
          { title: 'Order', dataIndex: 'displayOrder', width: 80 },
          { title: 'Organisation', dataIndex: 'name' },
          { title: 'Relationship', dataIndex: 'relationshipLabel', width: 180, render: (v: string | null) => v ?? '—' },
          {
            title: 'Permission recorded',
            width: 210,
            render: (_: unknown, record) =>
              record.authorisedAt ? (
                <Tooltip title={record.authorisationNote ?? 'No note recorded'}>
                  <Tag color="green">{formatDateTime(record.authorisedAt)}</Tag>
                </Tooltip>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              ),
          },
          { title: 'Status', dataIndex: 'status', width: 110, render: (value: string) => <Tag color={value === 'published' ? 'green' : 'default'}>{value}</Tag> },
          {
            title: 'Actions',
            width: 320,
            render: (_: unknown, record) => (
              <Space size={4} wrap>
                {can(PERMISSION.websiteClientsUpdate) && (
                  <Button size="small" onClick={() => navigate(`/website/partners/${record.id}`)}>
                    Edit
                  </Button>
                )}
                {can(PERMISSION.websiteClientsApprove) && !record.authorisedAt && (
                  <Tooltip title={!record.mediaId ? 'Add the logo first' : undefined}>
                    <Button size="small" disabled={!record.mediaId} onClick={() => authorise(record)}>
                      Record permission
                    </Button>
                  </Tooltip>
                )}
                {can(PERMISSION.websiteClientsPublish) && (
                  <Tooltip title={blocker(record) ?? undefined}>
                    <Button size="small" disabled={blocker(record) !== null} onClick={() => setPublished(record, record.status !== 'published')}>
                      {record.status === 'published' ? 'Unpublish' : 'Publish'}
                    </Button>
                  </Tooltip>
                )}
                {can(PERMISSION.websiteClientsDelete) && (
                  <Button size="small" danger onClick={() => remove(record)}>
                    Delete
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
    </div>
  );
}
