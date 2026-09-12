import { Button, Input, Select, Space, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router';
import { POST_STATUSES, blogApi, type PostStatus, type PostSummary } from '@/api/blog';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { ErrorState, ListEmpty, PageHeader, StatusTag, TableCard } from '@/components/ui';
import { useListParams } from '@/shared/useListParams';
import { useDocumentTitle } from '@/shared/useDocumentTitle';
import { useCapabilities } from '@/auth/access-control';
import { PERMISSION } from '@/auth/permissions';


/** The parameters that narrow this list; everything else is sort or page. */
const FILTERS = ['q', 'status'] as const;

/** Article index (SRS BLOG 001–002). Filters live in the URL so a shared link reproduces the view. */
export function PostsPage() {
  useDocumentTitle('Articles');
  const api = blogApi();
  const list = useListParams(FILTERS);
  const { can } = useCapabilities();
  const canWrite = can(PERMISSION.postsWrite);
  const status = (list.get('status') as PostStatus | null) ?? undefined;
  const q = list.get('q') ?? '';
  const page = list.page;
  const [state, reload] = useAsync((signal) => api.listPosts({ status, q: q || undefined, page, pageSize: 20 }, signal), [status, q, page]);
  const [authors] = useAsync((signal) => api.listAuthors(signal), []);


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
      <TableCard
        toolbar={
          <>
            <Input.Search aria-label="Search articles" placeholder="Search by title" allowClear defaultValue={q} onSearch={(v) => list.set('q', v.trim() || undefined)} style={{ width: 260 }} />
            <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => list.set('status', v)} style={{ width: 160 }} options={POST_STATUSES.map((s) => ({ value: s, label: s }))} />
          </>
        }
      >
      {state.status === 'error' && <ErrorState message={state.message} reference={state.reference} onRetry={reload} />}
      <Table<PostSummary>
        rowKey="id"
        loading={state.status === 'loading'}
        dataSource={state.status === 'ready' ? state.data.data : []}
        pagination={state.status === 'ready' ? { current: state.data.meta.page, pageSize: state.data.meta.pageSize, total: state.data.meta.total, showSizeChanger: false, onChange: (p) => list.setPage(p) } : false}
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
                <StatusTag status={v} />
                {v === 'draft' && post.publicationBlockers.length > 0 && <Tag>incomplete</Tag>}
                {v === 'scheduled' && post.scheduledAt && <span>{formatDateTime(post.scheduledAt)}</span>}
              </Space>
            ),
          },
          { title: 'Updated', dataIndex: 'updatedAt', render: formatDateTime },
        ]}
        locale={{
          emptyText: (
            <ListEmpty
              state={state}
              filtered={list.filtered}
              noun="articles"
              onClear={list.clear}
              empty={{
                title: 'No articles yet',
                // An article needs an author, so say so before the writer
                // discovers it halfway through the editor.
                description: authors.status === 'ready' && authors.data.length === 0 ? 'Create an author first, then write the first article.' : 'Write the first article for the Melbourne Sphere blog.',
              }}
            />
          ),
        }}
      />
      </TableCard>
    </div>
  );
}
