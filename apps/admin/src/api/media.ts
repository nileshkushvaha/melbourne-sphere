import type { components } from '@melbourne-sphere/contracts';
import { httpClient, type HttpClient, type QueryValue } from './http-client';
import type { CollectionMeta } from './admins';

export type MediaAsset = components['schemas']['MediaAssetDto'];
export type MediaVariant = components['schemas']['MediaVariantDto'];
export type GalleryEntry = components['schemas']['GalleryEntryDto'];
export type GalleryItem = components['schemas']['GalleryItemDto'];
export type MediaStatus = MediaAsset['status'];

export const MEDIA_STATUSES: MediaStatus[] = ['quarantined', 'ready', 'rejected'];
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export interface MediaListQuery {
  status?: MediaStatus;
  q?: string;
  unused?: boolean;
  page?: number;
  pageSize?: number;
}

const asQuery = (q: object): Record<string, QueryValue> => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== false));

/** Checks the file before any request, so an obviously invalid file never leaves the browser. */
export function localFileProblem(file: File): string | null {
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) return 'Only JPEG, PNG and WebP images are accepted';
  if (file.size > MAX_UPLOAD_BYTES) return 'Images must be 10 MB or smaller';
  if (file.size === 0) return 'That file is empty';
  return null;
}

/** SHA-256 of the file, so the server can confirm the upload arrived intact. */
export async function fileChecksum(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Media library and gallery usage (SRS MED 001–004); the API enforces `media.manage`. */
export function mediaApi(client: HttpClient = httpClient) {
  return {
    list: (query: MediaListQuery = {}, signal?: AbortSignal) => client.request<{ data: MediaAsset[]; meta: CollectionMeta }>('/admin/media', { query: asQuery(query), signal }).then((r) => r.data),
    get: (id: string, signal?: AbortSignal) => client.request<{ data: MediaAsset }>(`/admin/media/${encodeURIComponent(id)}`, { signal }).then((r) => r.data.data),
    requestUpload: (body: { fileName: string; contentType: string; bytes: number }) =>
      client.request<{ data: { assetId: string; uploadUrl: string; headers: Record<string, string>; expiresInSeconds: number } }>('/admin/media/uploads', { method: 'POST', body }).then((r) => r.data.data),
    complete: (id: string, body: { checksum?: string; altText?: string | null }) => client.request<{ data: MediaAsset }>(`/admin/media/${encodeURIComponent(id)}/complete`, { method: 'POST', body }).then((r) => r.data.data),
    update: (id: string, body: Record<string, unknown> & { expectedVersion: number }) => client.request<{ data: MediaAsset }>(`/admin/media/${encodeURIComponent(id)}`, { method: 'PATCH', body }).then((r) => r.data.data),
    remove: (id: string) => client.request<undefined>(`/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(() => undefined),
    gallery: (businessId: string, signal?: AbortSignal) => client.request<{ data: GalleryEntry[] }>(`/admin/businesses/${encodeURIComponent(businessId)}/gallery`, { signal }).then((r) => r.data.data),
    setGallery: (businessId: string, body: { expectedVersion: number; items: GalleryItem[] }) =>
      client.request<{ data: GalleryEntry[] }>(`/admin/businesses/${encodeURIComponent(businessId)}/gallery`, { method: 'PUT', body }).then((r) => r.data.data),
  };
}

/**
 * Full upload flow (SRS MED 002): ask for a signed URL, PUT the bytes straight
 * to storage, then tell the API to validate them. The API never sees the bytes.
 */
export async function uploadImage(file: File, altText: string | null, api = mediaApi()): Promise<MediaAsset> {
  const ticket = await api.requestUpload({ fileName: file.name, contentType: file.type, bytes: file.size });
  const response = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file });
  if (!response.ok) throw new Error(`The upload failed (${response.status}). Please try again.`);
  return api.complete(ticket.assetId, { checksum: await fileChecksum(file), altText });
}

/** Smallest variant at or above the requested width, for previews. */
export function variantUrl(asset: Pick<MediaAsset, 'variants'>, minWidth = 320): string | null {
  const sorted = [...asset.variants].sort((a, b) => a.width - b.width);
  return (sorted.find((variant) => variant.width >= minWidth) ?? sorted.at(-1))?.url ?? null;
}
