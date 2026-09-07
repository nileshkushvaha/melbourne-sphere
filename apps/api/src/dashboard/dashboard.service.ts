import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import type { DashboardActivityDto, DashboardDto, DashboardMetricDto, DashboardScheduledPostDto } from './dashboard.dto.js';

const ACTIVITY_LIMIT = 8;
const SCHEDULED_LIMIT = 5;

/**
 * Dashboard aggregates (SRS ADM 003). Counts only: no enquiry, review or
 * comment text ever reaches a widget, and every figure is filtered by the
 * permission that owns its screen, so the dashboard cannot leak the existence
 * of work an administrator is not allowed to open.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly database: DatabaseService) {}

  async summary(actor: AdminPrincipal, now = new Date()): Promise<DashboardDto> {
    const db = await this.database.client();
    const can = (permission: string) => actor.permissions.includes(permission);
    const metrics: DashboardMetricDto[] = [];

    const [pendingReviews, pendingComments, openReports, failedEnquiries, newEnquiries, draftListings, quarantinedMedia, duePosts] = await Promise.all([
      can('reviews.moderate') ? db.review.count({ where: { status: 'pending' } }) : Promise.resolve(0),
      can('comments.moderate') ? db.comment.count({ where: { status: 'pending' } }) : Promise.resolve(0),
      can('reports.manage') ? db.abuseReport.count({ where: { status: 'open' } }) : Promise.resolve(0),
      can('enquiries.read') ? db.enquiry.count({ where: { deliveryStatus: 'failed' } }) : Promise.resolve(0),
      can('enquiries.read') ? db.enquiry.count({ where: { handlingStatus: 'new' } }) : Promise.resolve(0),
      can('listings.read') ? db.business.count({ where: { status: 'draft' } }) : Promise.resolve(0),
      can('media.manage') ? db.mediaAsset.count({ where: { status: 'quarantined' } }) : Promise.resolve(0),
      can('posts.publish') ? db.post.count({ where: { status: 'scheduled', scheduledAt: { lte: now } } }) : Promise.resolve(0),
    ]);

    const add = (key: string, label: string, value: number, href: string, tone: DashboardMetricDto['tone'], allowed: boolean) => {
      if (allowed) metrics.push({ key, label, value, href, tone: value > 0 ? tone : 'neutral' });
    };
    add('pendingReviews', 'Reviews awaiting moderation', pendingReviews, '/reviews', 'attention', can('reviews.moderate'));
    add('pendingComments', 'Comments awaiting moderation', pendingComments, '/comments', 'attention', can('comments.moderate'));
    add('openReports', 'Open abuse reports', openReports, '/reports', 'critical', can('reports.manage'));
    add('failedEnquiries', 'Enquiries that failed to send', failedEnquiries, '/enquiries', 'critical', can('enquiries.read'));
    add('newEnquiries', 'New enquiries', newEnquiries, '/enquiries', 'attention', can('enquiries.read'));
    add('draftListings', 'Listings in draft', draftListings, '/businesses', 'neutral', can('listings.read'));
    add('quarantinedMedia', 'Uploads still processing', quarantinedMedia, '/media', 'neutral', can('media.manage'));
    add('duePosts', 'Scheduled articles past their time', duePosts, '/posts', 'critical', can('posts.publish'));

    const scheduledPosts: DashboardScheduledPostDto[] = can('posts.write')
      ? (
          await db.post.findMany({
            where: { status: 'scheduled' },
            orderBy: { scheduledAt: 'asc' },
            take: SCHEDULED_LIMIT,
            select: { id: true, title: true, scheduledAt: true },
          })
        ).map((row) => ({ id: row.id, title: row.title, scheduledAt: (row.scheduledAt ?? now).toISOString(), overdue: (row.scheduledAt?.getTime() ?? Infinity) <= now.getTime() }))
      : [];

    const activity: DashboardActivityDto[] = can('audit.read')
      ? (
          await db.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: ACTIVITY_LIMIT,
            select: { id: true, action: true, targetType: true, createdAt: true, actor: { select: { displayName: true } } },
          })
        ).map((row) => ({ id: row.id, action: row.action, actorName: row.actor?.displayName ?? null, targetType: row.targetType, createdAt: row.createdAt.toISOString() }))
      : [];

    return { metrics, scheduledPosts, activity, generatedAt: now.toISOString() };
  }
}
