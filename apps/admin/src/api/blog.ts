import type { components } from '@melbourne-sphere/contracts';
import { httpClient, type HttpClient } from './http-client';
import { queryParams } from './query';
import type { CollectionMeta } from './admins';

export type Author = components['schemas']['AuthorDto'];
export type BlogTerm = components['schemas']['BlogTermDto'];
export type Post = components['schemas']['PostDto'];
export type PostSummary = components['schemas']['PostSummaryDto'];
export type PostStatus = PostSummary['status'];
export type PostAction = 'publish' | 'schedule' | 'unpublish' | 'archive' | 'restore';
export type BlogTermKind = 'blog-categories' | 'blog-tags';

export const POST_STATUSES: PostStatus[] = ['draft', 'scheduled', 'published', 'archived'];

export interface BlogTermListQuery {
  q?: string;
  status?: 'active' | 'inactive';
}

export interface PostListQuery {
  status?: PostStatus;
  categoryId?: string;
  tagId?: string;
  authorId?: string;
  q?: string;
  sort?: 'updatedAt' | 'publishedAt' | 'scheduledAt' | 'title';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/** Editorial API (SRS BLOG 001–003); the API enforces `posts.write` and `posts.publish`. */
export function blogApi(client: HttpClient = httpClient) {
  return {
    listPosts: (query: PostListQuery = {}, signal?: AbortSignal) => client.request<{ data: PostSummary[]; meta: CollectionMeta }>('/admin/posts', { query: queryParams(query), signal }).then((r) => r.data),
    getPost: (id: string, signal?: AbortSignal) => client.request<{ data: Post }>(`/admin/posts/${encodeURIComponent(id)}`, { signal }).then((r) => r.data.data),
    /**
     * The server's own rendering of the saved draft, including the author and
     * category as a reader would see them. Never indexable (SRS BLOG 003).
     */
    previewPost: (id: string, signal?: AbortSignal) =>
      client
        .request<{ data: { id: string; title: string; excerpt: string; sanitizedBody: string; authorName: string; categoryName: string; status: string; noindex: boolean } }>(
          `/admin/posts/${encodeURIComponent(id)}/preview`,
          { signal },
        )
        .then((r) => r.data.data),
    createPost: (body: Record<string, unknown>) => client.request<{ data: Post }>('/admin/posts', { method: 'POST', body }).then((r) => r.data.data),
    updatePost: (id: string, body: Record<string, unknown> & { expectedVersion: number }) => client.request<{ data: Post }>(`/admin/posts/${encodeURIComponent(id)}`, { method: 'PATCH', body }).then((r) => r.data.data),
    transition: (id: string, action: PostAction, body: Record<string, unknown> & { expectedVersion: number }) =>
      client.request<{ data: Post }>(`/admin/posts/${encodeURIComponent(id)}/${action}`, { method: 'POST', body }).then((r) => r.data.data),
    changePostSlug: (id: string, body: { slug: string; expectedVersion: number; reason?: string }) =>
      client.request<{ data: Post }>(`/admin/posts/${encodeURIComponent(id)}/slug`, { method: 'POST', body }).then((r) => r.data.data),
    getAuthor: (id: string, signal?: AbortSignal) => client.request<{ data: Author }>(`/admin/authors/${encodeURIComponent(id)}`, { signal }).then((r) => r.data.data),
    listAuthors: (query: BlogTermListQuery = {}, signal?: AbortSignal) =>
      client.request<{ data: Author[] }>('/admin/authors', { query: queryParams(query), signal }).then((r) => r.data.data),
    createAuthor: (body: Record<string, unknown>) => client.request<{ data: Author }>('/admin/authors', { method: 'POST', body }).then((r) => r.data.data),
    updateAuthor: (id: string, body: Record<string, unknown> & { expectedVersion: number }) => client.request<{ data: Author }>(`/admin/authors/${encodeURIComponent(id)}`, { method: 'PATCH', body }).then((r) => r.data.data),
    setAuthorActive: (id: string, active: boolean, expectedVersion: number) =>
      client.request<{ data: Author }>(`/admin/authors/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`, { method: 'POST', body: { expectedVersion } }).then((r) => r.data.data),
    listTerms: (kind: BlogTermKind, query: BlogTermListQuery = {}, signal?: AbortSignal) =>
      client.request<{ data: BlogTerm[] }>(`/admin/${kind}`, { query: queryParams(query), signal }).then((r) => r.data.data),
    createTerm: (kind: BlogTermKind, body: Record<string, unknown>) => client.request<{ data: BlogTerm }>(`/admin/${kind}`, { method: 'POST', body }).then((r) => r.data.data),
    updateTerm: (kind: BlogTermKind, id: string, body: Record<string, unknown> & { expectedVersion: number }) =>
      client.request<{ data: BlogTerm }>(`/admin/${kind}/${encodeURIComponent(id)}`, { method: 'PATCH', body }).then((r) => r.data.data),
    setTermActive: (kind: BlogTermKind, id: string, active: boolean, expectedVersion: number) =>
      client.request<{ data: BlogTerm }>(`/admin/${kind}/${encodeURIComponent(id)}/${active ? 'activate' : 'deactivate'}`, { method: 'POST', body: { expectedVersion } }).then((r) => r.data.data),
  };
}

/** Melbourne-time helpers for the schedule picker (SRS BLOG 002: admins choose local time, the API stores UTC). */
const MELBOURNE = 'Australia/Melbourne';

export function melbourneOffsetLabel(instant: Date): string {
  const name = new Intl.DateTimeFormat('en-AU', { timeZone: MELBOURNE, timeZoneName: 'short' }).formatToParts(instant).find((p) => p.type === 'timeZoneName')?.value;
  return name ?? 'AEST';
}

/** Converts a `YYYY-MM-DDTHH:mm` value the admin typed (Melbourne time) into a UTC instant. */
export function melbourneLocalToUtc(local: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number) as unknown as number[];
  const wall = Date.UTC(y!, mo! - 1, d!, h!, mi!);
  // Two candidate offsets bracket every DST change; pick the one that round-trips.
  for (const probe of [wall - 86_400_000, wall + 86_400_000]) {
    const offset = melbourneOffsetMinutes(new Date(probe));
    const instant = wall - offset * 60_000;
    if (melbourneOffsetMinutes(new Date(instant)) === offset) return new Date(instant);
  }
  return new Date(wall - melbourneOffsetMinutes(new Date(wall)) * 60_000);
}

/** Formats a UTC instant as the `YYYY-MM-DDTHH:mm` the picker shows. */
export function utcToMelbourneLocal(instant: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: MELBOURNE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

function melbourneOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: MELBOURNE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}
