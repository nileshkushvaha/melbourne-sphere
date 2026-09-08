import { Alert, Button, Space } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router';
import { pagesApi } from '@/api/settings';
import { PageHeader, PageLoader, StatusTag } from '@/components/ui';
import { useAsync } from '@/shared/useAsync';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { StaticPageEditor, StaticPagePublishAction } from './StaticPageEditor';

/** Editor-facing note for the pages whose template adds fixed sections. */
const ABOUT_NOTE = (
  <Alert
    type="info"
    showIcon
    style={{ marginBottom: 16 }}
    message="This page uses the About template"
    description="Your title and content appear in the page's introduction. The template adds the sections around it — the live directory counts, how a listing becomes published, why the site covers Melbourne only, and the closing links — from the product's own settings and data, so those stay accurate without being retyped here."
  />
);

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
      <StaticPageEditor
        page={page}
        onSaved={reload}
        intro={page.template === 'about' ? ABOUT_NOTE : undefined}
        bodyLabel={page.template === 'about' ? 'Introduction' : 'Content'}
        bodyDescription={
          page.template === 'about'
            ? 'Sanitised rich text shown at the top of the About page, under the heading. Scripts and styles are removed on save.'
            : 'Sanitised rich text: headings, lists, links and emphasis. Scripts and styles are removed on save.'
        }
      />
    </div>
  );
}
