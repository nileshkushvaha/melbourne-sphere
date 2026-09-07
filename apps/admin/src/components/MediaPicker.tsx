import { useState } from 'react';
import { Alert, Button, Card, Empty, Modal, Space, Typography } from 'antd';
import { mediaApi, variantUrl, type MediaAsset } from '@/api/media';
import { useAsync } from '@/shared/useAsync';

/**
 * Picks processed images from the library. Only assets that are ready and have
 * alt text can be chosen, because a page may not show an image without it
 * (SRS MED 003).
 */
export function MediaPicker({ open, onCancel, onPick, multiple = false, excludeIds = [] }: { open: boolean; onCancel: () => void; onPick: (assets: MediaAsset[]) => void; multiple?: boolean; excludeIds?: string[] }) {
  const api = mediaApi();
  const [selected, setSelected] = useState<string[]>([]);
  const [state, reload] = useAsync((signal) => (open ? api.list({ status: 'ready', pageSize: 48 }, signal) : Promise.resolve({ data: [], meta: { page: 1, pageSize: 0, total: 0, pageCount: 1 } })), [open]);
  const assets = (state.status === 'ready' ? state.data.data : []).filter((asset) => !excludeIds.includes(asset.id));

  const toggle = (id: string) => setSelected((current) => (multiple ? (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]) : [id]));

  const confirm = () => {
    onPick(assets.filter((asset) => selected.includes(asset.id)));
    setSelected([]);
  };

  return (
    <Modal open={open} title="Choose an image" width={760} okText={multiple ? 'Add selected' : 'Use image'} okButtonProps={{ disabled: selected.length === 0 }} onOk={confirm} onCancel={() => { setSelected([]); onCancel(); }} destroyOnHidden>
      {state.status === 'error' && <Alert type="error" showIcon message={state.message} action={<Button onClick={reload}>Retry</Button>} style={{ marginBottom: 12 }} />}
      {state.status === 'ready' && assets.length === 0 && <Empty description="No processed images yet. Upload one in the Media library first." />}
      <ul style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', listStyle: 'none', margin: 0, padding: 0 }}>
        {assets.map((asset) => {
          const preview = variantUrl(asset, 320);
          const chosen = selected.includes(asset.id);
          const usable = Boolean(asset.altText);
          return (
            <li key={asset.id}>
              <Card
                size="small"
                hoverable={usable}
                onClick={() => usable && toggle(asset.id)}
                style={{ outline: chosen ? '3px solid #0369a1' : undefined, opacity: usable ? 1 : 0.5 }}
                cover={preview ? <img src={preview} alt={asset.altText ?? ''} style={{ aspectRatio: '4 / 3', objectFit: 'cover' }} /> : undefined}
              >
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Typography.Text ellipsis title={asset.sourceName}>
                    {asset.sourceName}
                  </Typography.Text>
                  {!usable && <Typography.Text type="danger">Add alt text first</Typography.Text>}
                </Space>
              </Card>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
