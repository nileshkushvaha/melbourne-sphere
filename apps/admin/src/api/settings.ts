import type { components } from '@melbourne-sphere/contracts';
import { httpClient, type HttpClient } from './http-client';
import { queryParams } from './query';

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

export type SeoSettings = components['schemas']['SeoSettingsRecordDto'];
export type UpdateSeoSettings = components['schemas']['UpdateSeoSettingsDto'];

/** Search metadata for routes with no record of their own (SRS SEO 001). */
export function seoSettingsApi(client: HttpClient = httpClient) {
  return {
    get: (signal?: AbortSignal) => client.request<{ data: SeoSettings }>('/admin/settings/seo', { signal }).then((r) => r.data.data),
    put: (body: UpdateSeoSettings) => client.request<{ data: SeoSettings }>('/admin/settings/seo', { method: 'PUT', body }).then((r) => r.data.data),
  };
}

export type GeneralSettings = components['schemas']['GeneralSettingsRecordDto'];
export type UpdateGeneralSettings = components['schemas']['UpdateGeneralSettingsDto'];

/** Social platforms the general settings accept, in the order the public shell renders them. */
export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'x', 'youtube', 'pinterest'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** General settings (SRS CFG 001); `settings.manage` is enforced by the API. */
export function generalSettingsApi(client: HttpClient = httpClient) {
  return {
    get: (signal?: AbortSignal) => client.request<{ data: GeneralSettings }>('/admin/settings/general', { signal }).then((r) => r.data.data),
    put: (body: UpdateGeneralSettings) => client.request<{ data: GeneralSettings }>('/admin/settings/general', { method: 'PUT', body }).then((r) => r.data.data),
  };
}

export type StaticPage = components['schemas']['StaticPageDto'];

export interface CreateStaticPage {
  /** Public address; the API refuses reserved and taken ones. */
  slug: string;
  title: string;
  body: string;
  bodyFormat?: 'html' | 'markdown';
  seoTitle?: string | null;
  seoDescription?: string | null;
  layout?: StaticPage['layout'];
}

export interface UpdateStaticPage {
  expectedVersion: number;
  title: string;
  body: string;
  bodyFormat?: 'html' | 'markdown';
  seoTitle?: string | null;
  seoDescription?: string | null;
  /** Omitted by a form that does not offer the choice; the API then keeps what the page has. */
  layout?: StaticPage['layout'];
  revisionReason?: string;
}

/** Information pages (SRS CFG 002); the API enforces `settings.manage`. */
export function pagesApi(client: HttpClient = httpClient) {
  return {
    list: (query: { q?: string; status?: 'draft' | 'published' } = {}, signal?: AbortSignal) =>
      client.request<{ data: StaticPage[] }>('/admin/pages', { query: queryParams(query), signal }).then((r) => r.data.data),
    get: (slug: string, signal?: AbortSignal) => client.request<{ data: StaticPage }>(`/admin/pages/${encodeURIComponent(slug)}`, { signal }).then((r) => r.data.data),
    create: (body: CreateStaticPage) => client.request<{ data: StaticPage }>('/admin/pages', { method: 'POST', body }).then((r) => r.data.data),
    remove: (slug: string) => client.request<void>(`/admin/pages/${encodeURIComponent(slug)}`, { method: 'DELETE' }).then(() => undefined),
    save: (slug: string, body: UpdateStaticPage) => client.request<{ data: StaticPage }>(`/admin/pages/${encodeURIComponent(slug)}`, { method: 'PUT', body }).then((r) => r.data.data),
    setStatus: (slug: string, action: 'publish' | 'unpublish', body: { expectedVersion: number; reason?: string }) =>
      client.request<{ data: StaticPage }>(`/admin/pages/${encodeURIComponent(slug)}/${action}`, { method: 'POST', body }).then((r) => r.data.data),
  };
}
