import { useRef, useState } from 'react';
import { Alert, App, Button, Card, Form, Input, InputNumber, Modal, Select, Space, Tag, Typography } from 'antd';
import { DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { useOnError } from '@refinedev/core';
import { useSearchParams } from 'react-router';
import { MEDIA_STATUSES, localFileProblem, mediaApi, uploadImage, variantUrl, type MediaAsset, type MediaStatus } from '@/api/media';
import { isApiError } from '@/api/errors';
import { formatDateTime } from '@/shared/format';
import { errorMessage, useAsync } from '@/shared/useAsync';
import { PageHeader } from '@/components/ui';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

const STATUS_COLOURS: Record<MediaStatus, string> = { quarantined: 'gold', ready: 'green', rejected: 'red' };
const STATUS_LABELS: Record<MediaStatus, string> = { quarantined: 'processing', ready: 'ready', rejected: 'rejected' };

/**
 * Media library (SRS MED 001–004). Uploads go straight to storage through a
 * signed URL; the API validates the bytes and the worker publishes the
 * renditions, so an image only becomes usable once it is processed.
 */
export function MediaLibraryPage() {
  useDocumentTitle('Media library');
  const api = mediaApi();
  const { message, modal } = App.useApp();
  const { mutate: onAuthError } = useOnError();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as MediaStatus | null) ?? undefined;
  const page = Number(params.get('page') ?? '1') || 1;
  const [state, reload] = useAsync((signal) => api.list({ status, page, pageSize: 24 }, signal), [status, page]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadForm] = Form.useForm<{ altText: string }>();
  const [editForm] = Form.useForm<{ altText: string; credit: string; rightsNote: string; focalX: number; focalY: number }>();

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next);
  };

  const handleError = (error: unknown, setter: (msg: string) => void) => {
    if (isApiError(error) && error.kind === 'unauthorized') onAuthError(error);
    else setter(errorMessage(error));
  };

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    const problem = localFileProblem(file);
    setUploadError(problem);
    setPendingFile(problem ? null : file);
    if (!problem) uploadForm.setFieldsValue({ altText: '' });
  };

  const startUpload = async () => {
    if (!pendingFile) return;
    const values = await uploadForm.validateFields().catch(() => null);
    if (!values) return;
    setUploading(true);
    setUploadError(null);
    try {
      const asset = await uploadImage(pendingFile, values.altText, api);
      if (asset.status === 'rejected') message.error(asset.rejectionReason ?? 'That image was rejected');
      else message.success('Uploaded. Processing usually takes a few seconds.');
      setPendingFile(null);
      uploadForm.resetFields();
      if (fileInput.current) fileInput.current.value = '';
      reload();
    } catch (error) {
      handleError(error, setUploadError);
    } finally {
      setUploading(false);
    }
  };

  const saveDetails = async () => {
    if (!editing) return;
    setDialogError(null);
    const values = await editForm.validateFields().catch(() => null);
    if (!values) return;
    try {
      await api.update(editing.id, {
        expectedVersion: editing.version,
        altText: values.altText || null,
        credit: values.credit || null,
        rightsNote: values.rightsNote || null,
        ...(values.focalX === undefined ? {} : { focalX: values.focalX }),
        ...(values.focalY === undefined ? {} : { focalY: values.focalY }),
      });
      message.success('Image details saved');
      setEditing(null);
      reload();
    } catch (error) {
      handleError(error, setDialogError);
    }
  };

  const remove = (asset: MediaAsset) => {
    modal.confirm({
      title: 'Delete this image?',
      content: asset.usages.length > 0 ? `It is used in ${asset.usages.length} place(s) and cannot be deleted until those usages are removed.` : 'The original and every published rendition are removed. This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true, disabled: asset.usages.length > 0 },
      onOk: async () => {
        try {
          await api.remove(asset.id);
          message.success('Image deleted');
          reload();
        } catch (error) {
          handleError(error, (msg) => message.error(msg));
        }
      },
    });
  };

  const assets = state.status === 'ready' ? state.data.data : [];

  return (
    <div>
      <PageHeader crumbs={[{ label: 'Editorial' }, { label: 'Media library' }]} title="Media library" description="JPEG, PNG or WebP up to 10 MB. Images are checked and re-encoded before they can appear on the site; location data is removed. Every image needs alt text before it can be used." />
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space align="start" wrap>
          <div>
            <label htmlFor="media-file" style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
              Choose an image
            </label>
            <input id="media-file" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => onFileChosen(e.target.files?.[0])} />
          </div>
          <Form form={uploadForm} layout="vertical" requiredMark={false} style={{ minWidth: 280 }}>
            <Form.Item label="Alt text" name="altText" extra="Describe the image for people who cannot see it." rules={[{ required: true, message: 'Alt text is required' }]}>
              <Input maxLength={255} disabled={!pendingFile} />
            </Form.Item>
          </Form>
          <Button type="primary" icon={<UploadOutlined aria-hidden="true" />} loading={uploading} disabled={!pendingFile} onClick={() => void startUpload()} style={{ marginTop: 28 }}>
            Upload
          </Button>
        </Space>
        {uploadError && <Alert type="error" showIcon role="alert" message={uploadError} style={{ marginTop: 12 }} />}
      </Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Select aria-label="Filter by status" allowClear placeholder="All statuses" value={status} onChange={(v) => setParam('status', v)} style={{ width: 180 }} options={MEDIA_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))} />
        <Button onClick={reload}>Refresh</Button>
      </Space>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} description={state.reference} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 16 }} />}
      {state.status === 'ready' && assets.length === 0 && <Typography.Paragraph type="secondary">No images yet.</Typography.Paragraph>}
      <ul style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', listStyle: 'none', margin: 0, padding: 0 }}>
        {assets.map((asset) => {
          const preview = variantUrl(asset, 320);
          return (
            <li key={asset.id}>
              <Card
                size="small"
                cover={
                  preview ? (
                    <img src={preview} alt={asset.altText ?? ''} style={{ aspectRatio: '4 / 3', objectFit: 'cover', width: '100%' }} />
                  ) : (
                    <div style={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', background: '#f0f2f5', color: '#4b5a73' }}>{STATUS_LABELS[asset.status]}</div>
                  )
                }
                actions={[
                  <Button key="edit" type="link" onClick={() => { setDialogError(null); editForm.setFieldsValue({ altText: asset.altText ?? '', credit: asset.credit ?? '', rightsNote: asset.rightsNote ?? '', focalX: asset.focalX ?? undefined, focalY: asset.focalY ?? undefined }); setEditing(asset); }}>
                    Details
                  </Button>,
                  <Button key="delete" type="link" danger icon={<DeleteOutlined aria-hidden="true" />} aria-label={`Delete ${asset.sourceName}`} onClick={() => remove(asset)} />,
                ]}
              >
                <Space direction="vertical" size={2} style={{ width: '100%' }}>
                  <Typography.Text ellipsis title={asset.sourceName}>
                    {asset.sourceName}
                  </Typography.Text>
                  <Space size={4} wrap>
                    <Tag color={STATUS_COLOURS[asset.status]}>{STATUS_LABELS[asset.status]}</Tag>
                    {asset.width && asset.height && (
                      <Typography.Text type="secondary">
                        {asset.width}×{asset.height}
                      </Typography.Text>
                    )}
                    {asset.usages.length > 0 && <Tag>{asset.usages.length} use{asset.usages.length === 1 ? '' : 's'}</Tag>}
                  </Space>
                  {!asset.altText && asset.status === 'ready' && <Typography.Text type="danger">Alt text needed</Typography.Text>}
                  {asset.rejectionReason && <Typography.Text type="danger">{asset.rejectionReason}</Typography.Text>}
                  <Typography.Text type="secondary">{formatDateTime(asset.createdAt)}</Typography.Text>
                </Space>
              </Card>
            </li>
          );
        })}
      </ul>
      {state.status === 'ready' && state.data.meta.pageCount > 1 && (
        <Space style={{ marginTop: 16 }}>
          <Button disabled={page <= 1} onClick={() => setParam('page', String(page - 1))}>
            Previous
          </Button>
          <Typography.Text>
            Page {state.data.meta.page} of {state.data.meta.pageCount}
          </Typography.Text>
          <Button disabled={page >= state.data.meta.pageCount} onClick={() => setParam('page', String(page + 1))}>
            Next
          </Button>
        </Space>
      )}
      <Modal open={editing !== null} title="Image details" okText="Save" onOk={() => void saveDetails()} onCancel={() => setEditing(null)} destroyOnHidden>
        {dialogError && <Alert type="error" showIcon role="alert" message={dialogError} style={{ marginBottom: 12 }} />}
        <Form form={editForm} layout="vertical" requiredMark={false}>
          <Form.Item label="Alt text" name="altText" extra="Required before the image can be used on a page.">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item label="Credit" name="credit">
            <Input maxLength={255} />
          </Form.Item>
          <Form.Item label="Rights or source note" name="rightsNote">
            <Input.TextArea rows={2} maxLength={500} />
          </Form.Item>
          <Space>
            <Form.Item label="Focal point X" name="focalX" extra="0 = left, 1 = right">
              <InputNumber min={0} max={1} step={0.05} />
            </Form.Item>
            <Form.Item label="Focal point Y" name="focalY" extra="0 = top, 1 = bottom">
              <InputNumber min={0} max={1} step={0.05} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  );
}
