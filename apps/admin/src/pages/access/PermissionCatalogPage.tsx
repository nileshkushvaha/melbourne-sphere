import { useMemo } from 'react';
import { Alert, Button, Table, Tag, Typography } from 'antd';
import { authorizationApi, type PermissionCatalogEntry } from '@/api/authorization';
import { useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { PageHeader, PageLoader, SectionCard } from '@/components/ui';

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
    return <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />;
  }

  return (
    <>
      <PageHeader
        title="Permission catalogue"
        description="Every permission the API recognises. Codes are declared in the application and synchronised on deployment; they cannot be created or renamed here."
      />
      <SectionCard>
        {state.status === 'loading' ? (
          <PageLoader label="Loading the catalogue…" />
        ) : (
          <Table<PermissionCatalogEntry>
            rowKey="key"
            dataSource={state.data}
            pagination={false}
            columns={[
              { title: 'Permission', dataIndex: 'label', render: (label: string, entry) => (
                <div>
                  <Typography.Text strong>{label}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary" code>
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
                    <Tag color={entry.isActive ? 'green' : 'default'}>{entry.isActive ? 'Active' : 'Retired'}</Tag>
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
