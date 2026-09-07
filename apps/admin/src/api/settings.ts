import type { components } from '@melbourne-sphere/contracts';
import { httpClient, type HttpClient } from './http-client';

export type HomeSettings = components['schemas']['HomeSettingsRecordDto'];
export type UpdateHomeSettings = components['schemas']['UpdateHomeSettingsDto'];

export const MIN_HERO_PHRASES = 2;
export const MAX_HERO_PHRASES = 5;

/** Site settings (SRS CFG 001); `settings.manage` is enforced by the API. */
export function settingsApi(client: HttpClient = httpClient) {
  return {
    getHome: (signal?: AbortSignal) => client.request<{ data: HomeSettings }>('/admin/settings/home', { signal }).then((r) => r.data.data),
    putHome: (body: UpdateHomeSettings) => client.request<{ data: HomeSettings }>('/admin/settings/home', { method: 'PUT', body }).then((r) => r.data.data),
  };
}

export type StaticPage = components['schemas']['StaticPageDto'];

export interface UpdateStaticPage {
  expectedVersion: number;
  title: string;
  body: string;
  bodyFormat?: 'html' | 'markdown';
  seoTitle?: string | null;
  seoDescription?: string | null;
  contactEmail?: string | null;
  revisionReason?: string;
}

/** Information pages (SRS CFG 002); the API enforces `settings.manage`. */
export function pagesApi(client: HttpClient = httpClient) {
  return {
    list: (signal?: AbortSignal) => client.request<{ data: StaticPage[] }>('/admin/pages', { signal }).then((r) => r.data.data),
    get: (slug: string, signal?: AbortSignal) => client.request<{ data: StaticPage }>(`/admin/pages/${encodeURIComponent(slug)}`, { signal }).then((r) => r.data.data),
    save: (slug: string, body: UpdateStaticPage) => client.request<{ data: StaticPage }>(`/admin/pages/${encodeURIComponent(slug)}`, { method: 'PUT', body }).then((r) => r.data.data),
    setStatus: (slug: string, action: 'publish' | 'unpublish', body: { expectedVersion: number; reason?: string }) =>
      client.request<{ data: StaticPage }>(`/admin/pages/${encodeURIComponent(slug)}/${action}`, { method: 'POST', body }).then((r) => r.data.data),
  };
}
