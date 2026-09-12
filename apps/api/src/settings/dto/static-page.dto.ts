import { SettingsImageDto } from './general-settings.dto.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';
import { BODY_FORMATS } from '../../blog/dto/blog.dto.js';
import type { BodyFormat } from '../../blog/sanitise.js';
import { MAX_SLUG_LENGTH, SYSTEM_PAGE_SLUGS } from '../static-pages.js';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
const emptyToNull = () => Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? null : value));

export class StaticPageDto {
  @ApiProperty({ description: `Public address. The system pages are ${SYSTEM_PAGE_SLUGS.join(', ')}; anything else is a page an administrator created.` }) slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ description: 'Sanitised HTML actually rendered (SRS SEC 001)' }) sanitizedBody!: string;
  @ApiProperty({ description: 'Source exactly as the editor wrote it' }) bodySource!: string;
  @ApiProperty({ enum: BODY_FORMATS }) bodyFormat!: BodyFormat;
  @ApiProperty({ type: String, nullable: true }) seoTitle!: string | null;
  @ApiProperty({ type: String, nullable: true }) seoDescription!: string | null;
  @ApiProperty({ type: String, nullable: true }) seoKeywords!: string | null;
  @ApiProperty({ type: String, nullable: true }) ogImageMediaId!: string | null;
  @ApiProperty({ type: SettingsImageDto, nullable: true, description: 'Resolved share image, or null when the site image is used' }) ogImage!: SettingsImageDto | null;
  @ApiProperty({ enum: ['draft', 'published'] }) status!: 'draft' | 'published';
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) publishedAt!: string | null;
  @ApiProperty({ type: [String], description: 'Reasons this page cannot be published yet (SRS CFG 002)' }) publicationBlockers!: string[];
  @ApiProperty({ description: 'Editor-facing explanation of what the page is for' }) purpose!: string;
  @ApiProperty({ enum: ['generic', 'about'], description: 'Which public template renders this page' }) template!: 'generic' | 'about';
  @ApiProperty({ description: 'True for a page the product refers to by address: not creatable, renameable or deletable' }) isSystem!: boolean;
  @ApiProperty({ description: 'True only for a custom page that is not currently published' }) canDelete!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: String, nullable: true }) updatedByAdminId!: string | null;
}

export class CreateStaticPageDto {
  @ApiProperty({ maxLength: MAX_SLUG_LENGTH, example: 'community-guidelines', description: 'Public address; lower-case letters, numbers and single hyphens. Reserved and taken addresses are refused.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(2, MAX_SLUG_LENGTH)
  slug!: string;

  @ApiProperty({ minLength: 3, maxLength: 180 }) @trim() @IsString() @Length(3, 180) title!: string;
  @ApiProperty({ maxLength: 200_000 }) @IsString() @MaxLength(200_000) body!: string;
  @ApiPropertyOptional({ enum: BODY_FORMATS, default: 'html' }) @IsOptional() @IsIn(BODY_FORMATS) bodyFormat?: BodyFormat;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 180 }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(180) seoTitle?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(300) seoDescription?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: 'Comma-separated; recorded, not read by search engines' }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(255) seoKeywords?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Ready media asset used when the page is shared' }) @IsOptional() @emptyToNull() @IsString() @MaxLength(64) ogImageMediaId?: string | null;
}

export class UpdateStaticPageDto {
  @ApiProperty({ minimum: 0, description: '0 for a page that has never been saved' }) @IsInt() @Min(0) expectedVersion!: number;
  @ApiProperty({ minLength: 3, maxLength: 180 }) @trim() @IsString() @Length(3, 180) title!: string;
  @ApiProperty({ maxLength: 200_000 }) @IsString() @MaxLength(200_000) body!: string;
  @ApiPropertyOptional({ enum: BODY_FORMATS, default: 'html' }) @IsOptional() @IsIn(BODY_FORMATS) bodyFormat?: BodyFormat;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 180 }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(180) seoTitle?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(300) seoDescription?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 255, description: 'Comma-separated; recorded, not read by search engines' }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(255) seoKeywords?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, description: 'Ready media asset used when the page is shared' }) @IsOptional() @emptyToNull() @IsString() @MaxLength(64) ogImageMediaId?: string | null;
  @ApiPropertyOptional({ maxLength: 500, description: 'Stored with the revision of the previous published text' }) @IsOptional() @trim() @IsString() @MaxLength(500) revisionReason?: string;
}

export class StaticPageStateDto {
  @ApiProperty({ minimum: 1 }) @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @trim() @IsString() @MaxLength(500) reason?: string;
}

export class PublicStaticPageDto {
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ description: 'Sanitised HTML' }) body!: string;
  @ApiProperty({ type: String, nullable: true }) seoTitle!: string | null;
  @ApiProperty({ type: String, nullable: true }) seoDescription!: string | null;
  @ApiProperty({ type: String, nullable: true }) seoKeywords!: string | null;
  @ApiProperty({ type: String, nullable: true }) ogImageMediaId!: string | null;
  @ApiProperty({ type: SettingsImageDto, nullable: true, description: 'Resolved share image, or null when the site image is used' }) ogImage!: SettingsImageDto | null;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PublicStaticPageSummaryDto {
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
}

/**
 * Narrowing for the page list.
 *
 * Applied after the list is assembled rather than in the query, because half of
 * it does not come from the database: the system pages are defined in code and
 * appear whether or not anyone has ever edited them. A `WHERE` clause would
 * silently drop exactly the pages an administrator is most likely to be looking
 * for.
 */
export class ListStaticPagesQueryDto {
  @ApiPropertyOptional({ maxLength: 80, description: 'Matches title and address' }) @IsOptional() @IsString() @MaxLength(80) q?: string;
  @ApiPropertyOptional({ enum: ['draft', 'published'] }) @IsOptional() @IsIn(['draft', 'published']) status?: 'draft' | 'published';
}
