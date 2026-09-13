import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { TREND_DAYS, bucketByDay, periods, trailingDays, windowStart } from './dashboard-trend.js';
import type {
  DashboardActivityDto,
  DashboardBreakdownItemDto,
  DashboardDto,
  DashboardFigureDto,
  DashboardMetricDto,
  DashboardScheduledPostDto,
  DashboardTrendSeriesDto,
} from './dashboard.dto.js';

const ACTIVITY_LIMIT = 8;
const SCHEDULED_LIMIT = 5;
const TOP_CATEGORY_LIMIT = 6;
/** Bounds the trend read: far above a month of submissions for one city, and never an unbounded scan. */
const TREND_ROW_CAP = 20_000;

const DELIVERY_STATES = [
  ['delivered', 'Delivered'],
  ['providerAccepted', 'Accepted by provider'],
  ['queued', 'Queued'],
  ['retrying', 'Retrying'],
  ['failed', 'Failed'],
  ['suppressed', 'Suppressed'],
] as const;

const LISTING_STATES = [
  ['published', 'Published'],
  ['draft', 'Draft'],
  ['archived', 'Archived'],
] as const;

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
    const mayReviews = can('reviews.moderate');
    const mayComments = can('comments.moderate');
    const mayEnquiries = can('enquiries.read');
    const mayListings = can('listings.read');
    const mayPosts = can('posts.write');
    const mayTaxonomy = can('taxonomy.manage') || mayListings;
    const metrics: DashboardMetricDto[] = [];

    const [pendingReviews, pendingComments, openReports, failedEnquiries, newEnquiries, draftListings, quarantinedMedia, duePosts] = await Promise.all([
      mayReviews ? db.review.count({ where: { status: 'pending' } }) : Promise.resolve(0),
      mayComments ? db.comment.count({ where: { status: 'pending' } }) : Promise.resolve(0),
      can('reports.manage') ? db.abuseReport.count({ where: { status: 'open' } }) : Promise.resolve(0),
      mayEnquiries ? db.enquiry.count({ where: { deliveryStatus: 'failed' } }) : Promise.resolve(0),
      mayEnquiries ? db.enquiry.count({ where: { handlingStatus: 'new' } }) : Promise.resolve(0),
      mayListings ? db.business.count({ where: { status: 'draft' } }) : Promise.resolve(0),
      can('media.manage') ? db.mediaAsset.count({ where: { status: 'quarantined' } }) : Promise.resolve(0),
      can('posts.publish') ? db.post.count({ where: { status: 'scheduled', scheduledAt: { lte: now } } }) : Promise.resolve(0),
    ]);

    const add = (key: string, label: string, value: number, href: string, tone: DashboardMetricDto['tone'], allowed: boolean) => {
      if (allowed) metrics.push({ key, label, value, href, tone: value > 0 ? tone : 'neutral' });
    };
    add('pendingReviews', 'Reviews awaiting moderation', pendingReviews, '/reviews', 'attention', mayReviews);
    add('pendingComments', 'Comments awaiting moderation', pendingComments, '/comments', 'attention', mayComments);
    add('openReports', 'Open abuse reports', openReports, '/reports', 'critical', can('reports.manage'));
    add('failedEnquiries', 'Enquiries that failed to send', failedEnquiries, '/enquiries', 'critical', mayEnquiries);
    add('newEnquiries', 'New enquiries', newEnquiries, '/enquiries', 'attention', mayEnquiries);
    add('draftListings', 'Listings in draft', draftListings, '/businesses', 'neutral', mayListings);
    add('quarantinedMedia', 'Uploads still processing', quarantinedMedia, '/media', 'neutral', can('media.manage'));
    add('duePosts', 'Scheduled articles past their time', duePosts, '/posts', 'critical', can('posts.publish'));

    // ---- trend: submissions per Melbourne day, with the previous period -----
    const days = trailingDays(now);
    const since = windowStart(now);
    const { currentStart, previousStart } = periods(now);
    const inWindow = { createdAt: { gte: since } };
    const inCurrent = { createdAt: { gte: currentStart } };
    const inPrevious = { createdAt: { gte: previousStart, lt: currentStart } };

    const series = async (
      key: DashboardTrendSeriesDto['key'],
      label: string,
      href: string,
      rows: Promise<{ createdAt: Date }[]>,
      current: Promise<number>,
      previous: Promise<number>,
    ): Promise<DashboardTrendSeriesDto> => {
      const [instants, total, previousTotal] = await Promise.all([rows, current, previous]);
      return { key, label, href, points: bucketByDay(instants.map((row) => row.createdAt), days), total, previousTotal };
    };
    const trendSeries = (
      await Promise.all([
        mayReviews
          ? series('reviews', 'Reviews received', '/reviews', db.review.findMany({ where: inWindow, select: { createdAt: true }, take: TREND_ROW_CAP }), db.review.count({ where: inCurrent }), db.review.count({ where: inPrevious }))
          : null,
        mayComments
          ? series('comments', 'Comments received', '/comments', db.comment.findMany({ where: inWindow, select: { createdAt: true }, take: TREND_ROW_CAP }), db.comment.count({ where: inCurrent }), db.comment.count({ where: inPrevious }))
          : null,
        mayEnquiries
          ? series('enquiries', 'Enquiries received', '/enquiries', db.enquiry.findMany({ where: inWindow, select: { createdAt: true }, take: TREND_ROW_CAP }), db.enquiry.count({ where: inCurrent }), db.enquiry.count({ where: inPrevious }))
          : null,
      ])
    ).filter((entry): entry is DashboardTrendSeriesDto => entry !== null);

    // ---- headline figures and breakdowns --------------------------------------
    const [publishedBusinesses, newBusinesses, publishedPosts, newPosts, approvedReviews, ratingMean, activeCategories, activeAreas, ratingGroups, deliveryGroups, statusGroups, categoryGroups] =
      await Promise.all([
        mayListings ? db.business.count({ where: { status: 'published' } }) : null,
        mayListings ? db.business.count({ where: { status: 'published', firstPublishedAt: { gte: currentStart } } }) : null,
        mayPosts ? db.post.count({ where: { status: 'published' } }) : null,
        mayPosts ? db.post.count({ where: { status: 'published', publishedAt: { gte: currentStart } } }) : null,
        mayReviews ? db.review.count({ where: { status: 'approved' } }) : null,
        mayReviews ? db.review.aggregate({ where: { status: 'approved' }, _avg: { rating: true } }) : null,
        mayTaxonomy ? db.category.count({ where: { active: true } }) : null,
        mayTaxonomy ? db.localArea.count({ where: { active: true } }) : null,
        mayReviews ? db.review.groupBy({ by: ['rating'], where: { status: 'approved' }, _count: { _all: true } }) : [],
        mayEnquiries ? db.enquiry.groupBy({ by: ['deliveryStatus'], where: inCurrent, _count: { _all: true } }) : [],
        mayListings ? db.business.groupBy({ by: ['status'], _count: { _all: true } }) : [],
        mayListings
          ? db.business.groupBy({ by: ['primaryCategoryId'], where: { status: 'published' }, _count: { primaryCategoryId: true }, orderBy: { _count: { primaryCategoryId: 'desc' } }, take: TOP_CATEGORY_LIMIT })
          : [],
      ]);

    const figures: DashboardFigureDto[] = [];
    if (publishedBusinesses !== null) figures.push({ key: 'publishedBusinesses', label: 'Published businesses', value: publishedBusinesses, href: '/businesses', recent: newBusinesses });
    if (publishedPosts !== null) figures.push({ key: 'publishedPosts', label: 'Published articles', value: publishedPosts, href: '/posts', recent: newPosts });
    if (approvedReviews !== null) figures.push({ key: 'approvedReviews', label: 'Approved reviews', value: approvedReviews, href: '/reviews', recent: null });
    if (activeCategories !== null) figures.push({ key: 'activeCategories', label: 'Active categories', value: activeCategories, href: '/categories', recent: null });
    if (activeAreas !== null) figures.push({ key: 'activeAreas', label: 'Local areas', value: activeAreas, href: '/areas', recent: null });

    const average = ratingMean?._avg.rating;
    const averageRating = average === null || average === undefined ? null : Math.round(average * 10) / 10;

    const ratingDistribution: DashboardBreakdownItemDto[] = mayReviews
      ? [5, 4, 3, 2, 1].map((rating) => ({ key: String(rating), label: rating === 1 ? '1 star' : `${rating} stars`, value: ratingGroups.find((group) => group.rating === rating)?._count._all ?? 0 }))
      : [];
    const enquiryDelivery: DashboardBreakdownItemDto[] = mayEnquiries
      ? DELIVERY_STATES.map(([key, label]) => ({ key, label, value: deliveryGroups.find((group) => group.deliveryStatus === key)?._count._all ?? 0 }))
      : [];
    const listingStatus: DashboardBreakdownItemDto[] = mayListings
      ? LISTING_STATES.map(([key, label]) => ({ key, label, value: statusGroups.find((group) => group.status === key)?._count._all ?? 0 }))
      : [];

    const categoryNames =
      categoryGroups.length > 0 ? await db.category.findMany({ where: { id: { in: categoryGroups.map((group) => group.primaryCategoryId) } }, select: { id: true, name: true } }) : [];
    const topCategories: DashboardBreakdownItemDto[] = categoryGroups.map((group) => ({
      key: group.primaryCategoryId,
      label: categoryNames.find((category) => category.id === group.primaryCategoryId)?.name ?? 'Unnamed category',
      value: group._count.primaryCategoryId ?? 0,
    }));

    const scheduledPosts: DashboardScheduledPostDto[] = mayPosts
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

    return {
      metrics,
      scheduledPosts,
      activity,
      periodDays: TREND_DAYS,
      trend: { days, series: trendSeries },
      figures,
      averageRating,
      ratingDistribution,
      enquiryDelivery,
      listingStatus,
      topCategories,
      generatedAt: now.toISOString(),
    };
  }
}
