import type { components } from '@melbourne-sphere/contracts';
import { httpClient, type HttpClient, type QueryValue } from './http-client';
import type { CollectionMeta } from './admins';

export type Redirect = components['schemas']['RedirectDto'];
export type RedirectKind = Redirect['kind'];

export interface RedirectListQuery {
  q?: string;
  kind?: RedirectKind;
  page?: number;
  pageSize?: number;
}

const asQuery = (q: object): Record<string, QueryValue> => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== ''));

/** Redirect administration (SRS SEO 004); the API enforces `redirects.manage`. */
export function seoApi(client: HttpClient = httpClient) {
  return {
    list: (query: RedirectListQuery = {}, signal?: AbortSignal) =>
      client.request<{ data: Redirect[]; meta: CollectionMeta }>('/admin/redirects', { query: asQuery(query), signal }).then((r) => r.data),
    create: (body: { sourcePath: string; targetPath?: string | null; kind?: RedirectKind; reason?: string }) =>
      client.request<{ data: Redirect }>('/admin/redirects', { method: 'POST', body }).then((r) => r.data.data),
    remove: (id: string) => client.request<void>(`/admin/redirects/${encodeURIComponent(id)}`, { method: 'DELETE' }).then(() => undefined),
  };
}
