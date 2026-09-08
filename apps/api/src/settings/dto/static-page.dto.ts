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
}

export class UpdateStaticPageDto {
  @ApiProperty({ minimum: 0, description: '0 for a page that has never been saved' }) @IsInt() @Min(0) expectedVersion!: number;
  @ApiProperty({ minLength: 3, maxLength: 180 }) @trim() @IsString() @Length(3, 180) title!: string;
  @ApiProperty({ maxLength: 200_000 }) @IsString() @MaxLength(200_000) body!: string;
  @ApiPropertyOptional({ enum: BODY_FORMATS, default: 'html' }) @IsOptional() @IsIn(BODY_FORMATS) bodyFormat?: BodyFormat;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 180 }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(180) seoTitle?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 300 }) @IsOptional() @emptyToNull() @trim() @IsString() @MaxLength(300) seoDescription?: string | null;
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
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PublicStaticPageSummaryDto {
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
}
