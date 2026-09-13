import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricDto {
  @ApiProperty({ description: 'Stable key the UI maps to a route and label' }) key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() value!: number;
  @ApiProperty({ description: 'Admin route this metric links to' }) href!: string;
  @ApiProperty({ enum: ['neutral', 'attention', 'critical'], description: 'Severity for presentation only' }) tone!: 'neutral' | 'attention' | 'critical';
}

export class DashboardActivityDto {
  @ApiProperty() id!: string;
  @ApiProperty() action!: string;
  @ApiProperty({ type: String, nullable: true }) actorName!: string | null;
  @ApiProperty({ type: String, nullable: true }) targetType!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class DashboardScheduledPostDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ format: 'date-time' }) scheduledAt!: string;
  @ApiProperty({ description: 'True when the scheduled time has passed and the article is still not published' }) overdue!: boolean;
}

export class DashboardTrendSeriesDto {
  @ApiProperty({ enum: ['reviews', 'comments', 'enquiries'] }) key!: 'reviews' | 'comments' | 'enquiries';
  @ApiProperty() label!: string;
  @ApiProperty({ description: 'Admin route for this queue' }) href!: string;
  @ApiProperty({ type: [Number], description: 'Submissions per Melbourne calendar day, aligned with `days`' }) points!: number[];
  @ApiProperty({ description: 'Submissions in the current period' }) total!: number;
  @ApiProperty({ description: 'Submissions in the period before it, for the change figure' }) previousTotal!: number;
}

export class DashboardTrendDto {
  @ApiProperty({ type: [String], description: 'Melbourne calendar days (YYYY-MM-DD), oldest first' }) days!: string[];
  @ApiProperty({ type: [DashboardTrendSeriesDto], description: 'Only the queues the caller may moderate or read' }) series!: DashboardTrendSeriesDto[];
}

export class DashboardFigureDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() value!: number;
  @ApiProperty() href!: string;
  @ApiProperty({ type: Number, nullable: true, description: 'How many were added in the current period, where that is meaningful' }) recent!: number | null;
}

export class DashboardBreakdownItemDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
  @ApiProperty() value!: number;
}

export class DashboardDto {
  @ApiProperty({ type: [DashboardMetricDto], description: 'Only metrics the signed-in administrator may see' }) metrics!: DashboardMetricDto[];
  @ApiProperty({ type: [DashboardScheduledPostDto] }) scheduledPosts!: DashboardScheduledPostDto[];
  @ApiProperty({ type: [DashboardActivityDto], description: 'Recent audit entries; never private message text (SRS ADM 003)' }) activity!: DashboardActivityDto[];
  @ApiProperty({ description: 'Length of the reporting period in days' }) periodDays!: number;
  @ApiProperty({ type: DashboardTrendDto }) trend!: DashboardTrendDto;
  @ApiProperty({ type: [DashboardFigureDto], description: 'Headline totals the caller may see' }) figures!: DashboardFigureDto[];
  @ApiProperty({ type: Number, nullable: true, description: 'Mean of approved ratings to one decimal; null without reviews.moderate or without approved reviews' }) averageRating!: number | null;
  @ApiProperty({ type: [DashboardBreakdownItemDto], description: 'Approved reviews by rating, five stars first; empty without reviews.moderate' }) ratingDistribution!: DashboardBreakdownItemDto[];
  @ApiProperty({ type: [DashboardBreakdownItemDto], description: 'Enquiries received in the period by delivery state; empty without enquiries.read' }) enquiryDelivery!: DashboardBreakdownItemDto[];
  @ApiProperty({ type: [DashboardBreakdownItemDto], description: 'Listings by status; empty without listings.read' }) listingStatus!: DashboardBreakdownItemDto[];
  @ApiProperty({ type: [DashboardBreakdownItemDto], description: 'Primary categories with the most published listings; empty without listings.read' }) topCategories!: DashboardBreakdownItemDto[];
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
}
