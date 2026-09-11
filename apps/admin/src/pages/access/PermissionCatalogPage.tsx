import { useMemo } from 'react';
import { Table, Tag, Typography } from 'antd';
import { authorizationApi, type PermissionCatalogEntry } from '@/api/authorization';
import { useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { PageHeader, PageLoader, SectionCard, StatusTag, PageLoadError } from '@/components/ui';

/**
 * The registered permission catalogue, read-only by design (SRS RBAC 002).
 * Codes are declared in application code and synchronised into the database, so
 * there is deliberately no way to invent one here: an unknown or misspelt code
 * could never be enforced, and offering to create one would suggest otherwise.
 */
export function PermissionCatalogPage() {
  useDocumentTitle('Permission catalogue');
  const api = useMemo(() => authorizationApi(), []);
  const [state, reload] = useAsync((signal) => api.permissions(signal), []);

  if (state.status === 'error') {
    return <PageLoadError title="Permission catalogue" crumbs={[{ label: 'Configuration' }, { label: 'Permission catalogue' }]} message={state.message} reference={state.reference} onRetry={reload} />;
  }

  return (
    <>
      <PageHeader
        title="Permission catalogue"
        description="Every permission and what it allows. New permissions arrive with a release."
      />
      <SectionCard>
        {state.status === 'loading' ? (
          <PageLoader label="Loading the catalogue…" />
        ) : (
          <Table<PermissionCatalogEntry>
            className="ms-scroll-table"
            scroll={{ x: 560 }}
            rowKey="key"
            dataSource={state.data}
            pagination={false}
            columns={[
              { title: 'Permission', dataIndex: 'label', render: (label: string, entry) => (
                <div>
                  <Typography.Text strong>{label}</Typography.Text>
                  <br />
                  {/* Plain monospace rather than Ant's `code`, whose grey ground
                      under secondary text falls below 4.5:1. */}
                  <Typography.Text type="secondary" style={{ fontSize: 12, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                    {entry.key}
                  </Typography.Text>
                </div>
              ) },
              { title: 'Module', dataIndex: 'module', filters: [...new Set(state.data.map((entry) => entry.module))].map((module) => ({ text: module, value: module })), onFilter: (value, entry) => entry.module === value },
              { title: 'What it allows', dataIndex: 'description', responsive: ['md'] },
              {
                title: 'State',
                dataIndex: 'isActive',
                render: (_value, entry) => (
                  <>
                    <StatusTag status={entry.isActive ? 'active' : 'retired'} />
                    {entry.isSystem && <Tag>Code-managed</Tag>}
                  </>
                ),
              },
            ]}
          />
        )}
      </SectionCard>
    </>
  );
}
