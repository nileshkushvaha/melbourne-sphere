import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Length, Matches, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination.js';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../../common/slug.js';

const trim = () => Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export const TERM_SORT_FIELDS = ['name', 'slug', 'sortOrder', 'createdAt', 'updatedAt'] as const;

export class ListTermsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Case-insensitive match on name or slug', maxLength: 120 })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';

  @ApiPropertyOptional({ enum: TERM_SORT_FIELDS, default: 'name' })
  @IsOptional()
  @IsIn(TERM_SORT_FIELDS)
  sort: (typeof TERM_SORT_FIELDS)[number] = 'name';
}

class TermBaseDto {
  @ApiProperty({ minLength: 2, maxLength: 80 })
  @trim()
  @IsString()
  @Length(2, 80, { message: 'Name must be 2–80 characters' })
  name!: string;

  @ApiPropertyOptional({ description: 'Lowercase-hyphen slug; generated from the name when omitted', maxLength: SLUG_MAX_LENGTH })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(SLUG_MAX_LENGTH)
  @Matches(SLUG_PATTERN, { message: 'Slug must be lowercase letters, numbers and single hyphens' })
  slug?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  sortOrder?: number;
}

export class CreateCategoryDto extends TermBaseDto {
  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Parent category id (must be a root category); omit for a root', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  parentId?: string | null;
}

export class UpdateCategoryDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 }) @IsOptional() @trim() @IsString() @Length(2, 80, { message: 'Name must be 2–80 characters' }) name?: string;
  @ApiPropertyOptional({ maxLength: SLUG_MAX_LENGTH }) @IsOptional() @trim() @IsString() @MaxLength(SLUG_MAX_LENGTH) @Matches(SLUG_PATTERN, { message: 'Slug must be lowercase letters, numbers and single hyphens' }) slug?: string;
  @ApiPropertyOptional({ maxLength: 500, nullable: true }) @IsOptional() @trim() @IsString() @MaxLength(500) description?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @MaxLength(64) parentId?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10_000) sortOrder?: number;
}

export class CreateServiceDto extends TermBaseDto {
  @ApiPropertyOptional({ type: [String], description: 'Search synonyms (2–80 chars each, max 20)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Length(2, 80, { each: true, message: 'Synonyms must be 2–80 characters' })
  synonyms?: string[];
}

export class UpdateServiceDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 }) @IsOptional() @trim() @IsString() @Length(2, 80, { message: 'Name must be 2–80 characters' }) name?: string;
  @ApiPropertyOptional({ maxLength: SLUG_MAX_LENGTH }) @IsOptional() @trim() @IsString() @MaxLength(SLUG_MAX_LENGTH) @Matches(SLUG_PATTERN, { message: 'Slug must be lowercase letters, numbers and single hyphens' }) slug?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) @Length(2, 80, { each: true, message: 'Synonyms must be 2–80 characters' }) synonyms?: string[];
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10_000) sortOrder?: number;
}

export class CreateLocalAreaDto extends TermBaseDto {
  @ApiPropertyOptional({ description: 'Editorial introduction (plain text in MVP)', maxLength: 5000 })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(5000)
  editorialIntro?: string;

  @ApiPropertyOptional({ description: 'How eligibility was verified against the approved boundary', maxLength: 255 })
  @IsOptional()
  @trim()
  @IsString()
  @MaxLength(255)
  eligibilitySource?: string;
}

export class UpdateLocalAreaDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ minLength: 2, maxLength: 80 }) @IsOptional() @trim() @IsString() @Length(2, 80, { message: 'Name must be 2–80 characters' }) name?: string;
  @ApiPropertyOptional({ maxLength: SLUG_MAX_LENGTH }) @IsOptional() @trim() @IsString() @MaxLength(SLUG_MAX_LENGTH) @Matches(SLUG_PATTERN, { message: 'Slug must be lowercase letters, numbers and single hyphens' }) slug?: string;
  @ApiPropertyOptional({ maxLength: 5000, nullable: true }) @IsOptional() @trim() @IsString() @MaxLength(5000) editorialIntro?: string | null;
  @ApiPropertyOptional({ maxLength: 255, nullable: true }) @IsOptional() @trim() @IsString() @MaxLength(255) eligibilitySource?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) @Max(10_000) sortOrder?: number;
}

export class TermStateDto {
  @ApiProperty() @IsInt() @Min(1) expectedVersion!: number;
  @ApiPropertyOptional({ maxLength: 500 }) @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class CategoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: String, nullable: true }) parentId!: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

/**
 * A category as the admin list shows it: the record, plus the two facts the
 * list needs and the detail screen does not — how many listings use it, and
 * the parent's name rather than its id. Both are computed per page in one
 * query each, so the list stays a fixed number of round trips however many
 * rows it holds.
 */
export class CategoryListItemDto extends CategoryDto {
  @ApiProperty({ description: 'Draft and published listings using this as their primary or an additional category.' }) listingCount!: number;
  @ApiProperty({ type: String, nullable: true }) parentName!: string | null;
}

export class PublicCategoryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ type: () => [PublicCategoryDto] }) children!: PublicCategoryDto[];
}

export class ServiceDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: [String] }) synonyms!: string[];
  @ApiProperty() active!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class ServiceListItemDto extends ServiceDto {
  @ApiProperty({ description: 'Draft and published listings offering this service.' }) listingCount!: number;
}

export class LocalAreaDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ type: String, nullable: true }) editorialIntro!: string | null;
  @ApiProperty({ type: String, nullable: true }) eligibilitySource!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true }) eligibilityVerifiedAt!: string | null;
  @ApiProperty() sortOrder!: number;
  @ApiProperty() active!: boolean;
  @ApiProperty() version!: number;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class LocalAreaListItemDto extends LocalAreaDto {
  @ApiProperty({ description: 'Draft and published listings in this area.' }) listingCount!: number;
}
