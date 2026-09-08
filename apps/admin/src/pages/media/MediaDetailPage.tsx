import { useEffect } from 'react';
import { App, Form, Input, InputNumber, Space, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router';
import { mediaApi, variantUrl, type MediaAsset } from '@/api/media';
import { RecordEditorPage } from '@/components/ui';
import { formatDateTime } from '@/shared/format';
import { useAsync } from '@/shared/useAsync';
import { useRecordEditor } from '@/shared/useRecordEditor';
import { useDocumentTitle } from '@/shared/useDocumentTitle';

interface Values {
  altText: string;
  credit: string;
  rightsNote: string;
  focalX?: number;
  focalY?: number;
}

/**
 * One image's details (SRS MED 003). Alt text, credit and rights live on a page
 * beside the image itself, because judging whether a description is accurate
 * means looking at the picture while typing — which a dialog over the grid did
 * not allow.
 */
export function MediaDetailPage() {
  const { id = '' } = useParams();
  const api = mediaApi();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm<Values>();
  const { saving, error, submit } = useRecordEditor<Values>(form);
  const [state, reload] = useAsync((signal) => api.get(id, signal), [id]);
  const asset: MediaAsset | null = state.status === 'ready' ? state.data : null;
  useDocumentTitle(asset?.sourceName ?? 'Image');

  useEffect(() => {
    if (!asset) return;
    form.setFieldsValue({
      altText: asset.altText ?? '',
      credit: asset.credit ?? '',
      rightsNote: asset.rightsNote ?? '',
      focalX: asset.focalX ?? undefined,
      focalY: asset.focalY ?? undefined,
    });
  }, [asset, form]);

  const save = () =>
    submit(async (values) => {
      if (!asset) return;
      await api.update(asset.id, {
        expectedVersion: asset.version,
        altText: values.altText || null,
        credit: values.credit || null,
        rightsNote: values.rightsNote || null,
        ...(values.focalX === undefined ? {} : { focalX: values.focalX }),
        ...(values.focalY === undefined ? {} : { focalY: values.focalY }),
      });
      message.success('Image details saved');
    }).then((ok) => {
      if (ok) navigate('/media');
    });

  const preview = asset ? variantUrl(asset, 640) : null;

  return (
    <RecordEditorPage<Values>
      crumbs={[{ label: 'Editorial' }, { label: 'Media library', href: '/media' }, { label: asset?.sourceName ?? 'Image' }]}
      title={asset?.sourceName ?? 'Image'}
      description="Alt text is what someone hears instead of seeing the picture, so describe what matters in it rather than naming the file."
      listHref="/media"
      listLabel="All images"
      form={form}
      loading={state.status === 'loading'}
      saving={saving}
      error={error ?? (state.status === 'error' ? state.message : null)}
      status={asset ? `Version ${asset.version} · uploaded ${formatDateTime(asset.createdAt)}` : undefined}
      onSubmit={save}
      aside={
        asset ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {preview ? (
              <img src={preview} alt={asset.altText ?? ''} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--ant-color-border)' }} />
            ) : (
              <div style={{ aspectRatio: '4 / 3', display: 'grid', placeItems: 'center', background: '#f0f2f5', color: '#4b5a73', borderRadius: 8 }}>Still processing</div>
            )}
            <Space size={4} wrap>
              <Tag>{asset.status}</Tag>
              {asset.width && asset.height && (
                <Typography.Text type="secondary">
                  {asset.width}×{asset.height}
                </Typography.Text>
              )}
            </Space>
            {asset.usages.length > 0 && (
              <Typography.Text type="secondary">
                Used in {asset.usages.length} place{asset.usages.length === 1 ? '' : 's'}; it cannot be deleted until those uses are removed.
              </Typography.Text>
            )}
            {asset.rejectionReason && <Typography.Text type="danger">{asset.rejectionReason}</Typography.Text>}
          </div>
        ) : undefined
      }
    >
      <Form.Item label="Alt text" name="altText" extra="Required before the image can be used on a page.">
        <Input maxLength={255} />
      </Form.Item>
      <Form.Item label="Credit" name="credit" extra="Shown with the image where the licence requires it.">
        <Input maxLength={255} />
      </Form.Item>
      <Form.Item label="Rights or source note" name="rightsNote" extra="Internal: where this came from and what we may do with it.">
        <Input.TextArea rows={3} maxLength={500} />
      </Form.Item>
      <Space>
        <Form.Item label="Focal point X" name="focalX" extra="0 = left, 1 = right" style={{ marginBottom: 0 }}>
          <InputNumber min={0} max={1} step={0.05} />
        </Form.Item>
        <Form.Item label="Focal point Y" name="focalY" extra="0 = top, 1 = bottom" style={{ marginBottom: 0 }}>
          <InputNumber min={0} max={1} step={0.05} />
        </Form.Item>
      </Space>
      {state.status === 'error' && (
        <Typography.Link onClick={reload} style={{ display: 'inline-block', marginTop: 12 }}>
          Try loading this image again
        </Typography.Link>
      )}
    </RecordEditorPage>
  );
}
