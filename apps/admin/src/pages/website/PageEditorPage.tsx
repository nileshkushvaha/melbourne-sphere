import { Alert, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router';
import { pagesApi } from '@/api/settings';
import { PageHeader, PageLoader, StatusTag } from '@/components/ui';
import { useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { StaticPageEditor, StaticPagePublishAction } from './StaticPageEditor';

/**
 * One information page on its own route (SRS CFG 002). Editing lives on a page
 * rather than in a dialog so it can be linked to, reloaded and read at the
 * width long-form copy actually needs.
 */
export function PageEditorPage() {
  const { slug = '' } = useParams();
  const [state, reload] = useAsync((signal) => pagesApi().get(slug, signal), [slug]);
  useDocumentTitle(state.status === 'ready' ? state.data.title : 'Page');

  if (state.status === 'loading') return <PageLoader label="Loading this page…" />;
  if (state.status === 'error') {
    return (
      <div>
        <PageHeader crumbs={[{ label: 'Website' }, { label: 'Pages', href: '/website/pages' }]} title="Page" />
        <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} />
      </div>
    );
  }

  const page = state.data;
  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Website' }, { label: 'Pages', href: '/website/pages' }, { label: page.title }]}
        title={page.title}
        description={`Public address: /${page.slug}`}
        meta={<StatusTag status={page.status} />}
        actions={
          <Space wrap>
            <Link to="/website/pages">
              <Button icon={<ArrowLeftOutlined />}>All pages</Button>
            </Link>
            <StaticPagePublishAction page={page} onChanged={reload} />
          </Space>
        }
      />
      {/* Every page is now written entirely here: the About page used to be
          assembled around the editor's words by a template, so most of what it
          said could not be changed from the admin. */}
      <StaticPageEditor page={page} onSaved={reload} />
    </div>
  );
}
