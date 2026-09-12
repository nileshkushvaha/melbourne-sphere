import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { MAX_PAGE_SIZE } from '../../common/pagination.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** SRS BLOG 005: 12 articles per page by default, newest published first. */
export const BLOG_PAGE_SIZE = 12;

export class ListPublicPostsQueryDto {
  @ApiPropertyOptional({ description: 'Blog category slug' }) @IsOptional() @IsString() @MaxLength(100) @Matches(SLUG, { message: 'category must be a slug' }) category?: string;
  @ApiPropertyOptional({ description: 'Tag slug' }) @IsOptional() @IsString() @MaxLength(100) @Matches(SLUG, { message: 'tag must be a slug' }) tag?: string;
  @ApiPropertyOptional({ maxLength: 120 }) @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value)) @IsString() @MaxLength(120) q?: string;
  @ApiPropertyOptional({ minimum: 1, default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: BLOG_PAGE_SIZE }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_PAGE_SIZE) pageSize = BLOG_PAGE_SIZE;
}

export class PublicAuthorLinkDto {
  @ApiProperty() kind!: string;
  @ApiProperty() url!: string;
  @ApiProperty({ type: String, nullable: true }) label!: string | null;
}

export class PublicAuthorImageDto {
  @ApiProperty() url!: string;
  @ApiProperty() alt!: string;
}

/** Byline and author card (SRS BLOG 004); only published profile fields appear. */
export class PublicAuthorDto {
  @ApiProperty() displayName!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Editorial role shown under the byline' }) role!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Short card biography' }) shortBio!: string | null;
  @ApiProperty({ type: String, nullable: true, description: 'Sanitised HTML profile' }) bio!: string | null;
  @ApiProperty({ type: String, nullable: true }) pronouns!: string | null;
  @ApiProperty({ type: String, nullable: true }) location!: string | null;
  @ApiProperty({ type: String, nullable: true }) websiteUrl!: string | null;
  @ApiProperty({ type: [String] }) expertise!: string[];
  @ApiProperty({ type: [PublicAuthorLinkDto] }) links!: PublicAuthorLinkDto[];
  @ApiProperty({ type: PublicAuthorImageDto, nullable: true }) image!: PublicAuthorImageDto | null;
}

export class PublicTermRefDto {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
}

export class PublicImageVariantDto {
  @ApiProperty({ enum: ['thumbnail', 'card', 'hero'] }) kind!: 'thumbnail' | 'card' | 'hero';
  @ApiProperty() url!: string;
  @ApiProperty() width!: number;
  @ApiProperty() height!: number;
}

export class PublicPostCardDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() excerpt!: string;
  @ApiProperty({ type: PublicTermRefDto }) category!: PublicTermRefDto;
  @ApiProperty({ type: PublicAuthorDto }) author!: PublicAuthorDto;
  @ApiProperty({ type: [PublicTermRefDto] }) tags!: PublicTermRefDto[];
  @ApiProperty({ format: 'date-time' }) publishedAt!: string;
  @ApiProperty({ type: String, nullable: true }) coverAlt!: string | null;
  @ApiProperty({ type: [PublicImageVariantDto], description: 'Published cover renditions; empty when the article has no processed cover' }) cover!: PublicImageVariantDto[];
  @ApiProperty({ type: PublicImageVariantDto, nullable: true, description: 'Image used when the article is shared; null means the cover is used' }) shareImage!: PublicImageVariantDto | null;
}

export class PublicPostDto extends PublicPostCardDto {
  @ApiProperty({ description: 'Allowlist-sanitised HTML' }) body!: string;
  @ApiProperty({ type: String, nullable: true }) seoTitle!: string | null;
  @ApiProperty({ type: String, nullable: true }) seoDescription!: string | null;
  @ApiProperty({ description: 'Whether the article accepts new comments (SRS COM 002)' }) commentsEnabled!: boolean;
  @ApiProperty() approvedCommentCount!: number;
  @ApiProperty({ format: 'date-time' }) firstPublishedAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: [PublicPostCardDto], description: 'Up to four related articles (SRS BLOG 004)' }) related!: PublicPostCardDto[];
}

export class PublicBlogTermDto {
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true, description: 'Sanitised landing content; without it the page is noindex (SRS BLOG 005)' }) landingContent!: string | null;
  @ApiProperty() postCount!: number;
}
