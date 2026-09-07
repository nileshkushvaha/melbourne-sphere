import { Alert, Button, Input, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router';
import { POST_STATUSES, blogApi, type PostStatus, type PostSummary } from '@/api/blog';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';

const STATUS_COLOURS: Record<PostStatus, string> = { draft: 'default', scheduled: 'blue', published: 'green', archived: 'orange' };

/** Article index (SRS BLOG 001–002). Filters live in the URL so a shared link reproduces the view. */
export function PostsPage() {
  useDocumentTitle('Articles');
  const api = blogApi();
  const [params, setParams] = useSearchParams();
  const { can } = useCapabilities();
  const canWrite = can(PERMISSION.postsWrite);
  const status = (params.get('status') as PostStatus | null) ?? undefined;
  const q = params.get('q') ?? '';
  const page = Number(params.get('page') ?? '1') || 1;
  const [state, reload] = useAsync((signal) => api.listPosts({ status, q: q || undefined, page, pageSize: 20 }, signal), [status, q, page]);
  const [authors] = useAsync((signal) => api.listAuthors(signal), []);

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PageHeader
        crumbs={[{ label: 'Editorial' }, { label: 'Articles' }]}
        title="Articles"
        description={<>Articles are written in Markdown and stored with sanitised HTML. Publishing and scheduling need the publish permission.</>}
        actions={
          <>
            {canWrite && (
          <Link to="/posts/new">
            <Button type="primary" icon={<PlusOutlined aria-hidden="true" />}>
              New article
            </Button>
          </Link>
        )}
          </>
        }
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search aria-label="Search by title or slug" placeholder="Search title or slug" allowClear defaultValue={q} onSearch={(v) => setParam('q', v.trim() || undefined)} style={{ width: 260 }} />
        <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => setParam('status', v)} style={{ width: 160 }} options={POST_STATUSES.map((s) => ({ value: s, label: s }))} />
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      <Table<PostSummary>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => setParam('page', String(p)) } : false}
        scroll={{ x: 900 }}
        columns={[
          { title: 'Title', dataIndex: 'title', render: (v: string, post) => <Link to={`/posts/${encodeURIComponent(post.id)}`}>{v}</Link> },
          { title: 'Author', dataIndex: 'authorName' },
          { title: 'Category', dataIndex: 'categoryName' },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (v: PostStatus, post) => (
              <Space size={4}>
                <Tag color={STATUS_COLOURS[v]}>{v}</Tag>
                {v === 'draft' && post.publicationBlockers.length > 0 && <Tag>incomplete</Tag>}
                {v === 'scheduled' && post.scheduledAt && <span>{formatDateTime(post.scheduledAt)}</span>}
              </Space>
            ),
          },
          { title: 'Updated', dataIndex: 'updatedAt', render: formatDateTime },
        ]}
        locale={{ emptyText: state.status === 'ready' ? `No articles match${authors.status === 'ready' && authors.data.length === 0 ? '. Create an author first.' : '.'}` : ' ' }}
      />
    </div>
  );
}
