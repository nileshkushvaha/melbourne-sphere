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

export class DashboardDto {
  @ApiProperty({ type: [DashboardMetricDto], description: 'Only metrics the signed-in administrator may see' }) metrics!: DashboardMetricDto[];
  @ApiProperty({ type: [DashboardScheduledPostDto] }) scheduledPosts!: DashboardScheduledPostDto[];
  @ApiProperty({ type: [DashboardActivityDto], description: 'Recent audit entries; never private message text (SRS ADM 003)' }) activity!: DashboardActivityDto[];
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
}
