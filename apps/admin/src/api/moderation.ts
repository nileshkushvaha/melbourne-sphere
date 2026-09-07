import type { components } from '@melbourne-sphere/contracts';
import { httpClient, type HttpClient, type QueryValue } from './http-client';
import type { CollectionMeta } from './admins';

export type AdminReview = components['schemas']['AdminReviewDto'];
export type AdminReport = components['schemas']['AdminReportDto'];
export type AdminComment = components['schemas']['AdminCommentDto'];
export type ReviewStatus = AdminReview['status'];
export type ReportStatus = AdminReport['status'];
export type ReportOutcome = NonNullable<AdminReport['outcome']>;
export type ReviewDecision = 'approve' | 'reject' | 'spam';

export const REVIEW_STATUSES: ReviewStatus[] = ['pending', 'approved', 'rejected', 'spam'];
export const REPORT_STATUSES: ReportStatus[] = ['open', 'investigating', 'resolved'];

export interface CommentListQuery {
  status?: ReviewStatus;
  postId?: string;
  reported?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ReviewListQuery {
  status?: ReviewStatus;
  businessId?: string;
  repeatFlagged?: boolean;
  reported?: boolean;
  page?: number;
  pageSize?: number;
}

const asQuery = (q: object): Record<string, QueryValue> => Object.fromEntries(Object.entries(q).filter(([, v]) => v !== undefined && v !== '' && v !== false));

/** Review moderation and abuse reports; the API enforces `reviews.moderate` and `reports.manage`. */
export function moderationApi(client: HttpClient = httpClient) {
  return {
    listReviews: (query: ReviewListQuery = {}, signal?: AbortSignal) => client.request<{ data: AdminReview[]; meta: CollectionMeta }>('/admin/reviews', { query: asQuery(query), signal }).then((r) => r.data),
    decide: (id: string, decision: ReviewDecision, body: { expectedVersion: number; reason?: string }) =>
      client.request<{ data: AdminReview }>(`/admin/reviews/${encodeURIComponent(id)}/${decision}`, { method: 'POST', body }).then((r) => r.data.data),
    redact: (id: string, body: { expectedVersion: number; publicText: string | null; reason: string }) =>
      client.request<{ data: AdminReview }>(`/admin/reviews/${encodeURIComponent(id)}/redaction`, { method: 'PATCH', body }).then((r) => r.data.data),
    listReports: (query: { status?: ReportStatus; page?: number; pageSize?: number } = {}, signal?: AbortSignal) =>
      client.request<{ data: AdminReport[]; meta: CollectionMeta }>('/admin/reports', { query: asQuery(query), signal }).then((r) => r.data),
    investigate: (id: string, expectedVersion: number) => client.request<{ data: AdminReport }>(`/admin/reports/${encodeURIComponent(id)}/investigate`, { method: 'POST', body: { expectedVersion } }).then((r) => r.data.data),
    resolve: (id: string, body: { expectedVersion: number; outcome: ReportOutcome; note?: string }) =>
      client.request<{ data: AdminReport }>(`/admin/reports/${encodeURIComponent(id)}/resolve`, { method: 'POST', body }).then((r) => r.data.data),
    listComments: (query: CommentListQuery = {}, signal?: AbortSignal) => client.request<{ data: AdminComment[]; meta: CollectionMeta }>('/admin/comments', { query: asQuery(query), signal }).then((r) => r.data),
    decideComment: (id: string, decision: ReviewDecision, body: { expectedVersion: number; reason?: string }) =>
      client.request<{ data: AdminComment }>(`/admin/comments/${encodeURIComponent(id)}/${decision}`, { method: 'POST', body }).then((r) => r.data.data),
    redactComment: (id: string, body: { expectedVersion: number; publicText: string | null; reason: string }) =>
      client.request<{ data: AdminComment }>(`/admin/comments/${encodeURIComponent(id)}/redaction`, { method: 'PATCH', body }).then((r) => r.data.data),
  };
}
