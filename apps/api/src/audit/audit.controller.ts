import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { Prisma } from '@melbourne-sphere/database';
import { RequirePermissions } from '../auth/decorators.js';
import { ACTIVITY_CATEGORIES, ACTIVITY_FAILURE_SUFFIXES, describeActivity, domainsInCategory, type ActivityCategory } from './activity-catalogue.js';
import { PaginationQueryDto, collectionMeta, skipFor } from '../common/pagination.js';
import { DatabaseService } from '../database/database.service.js';

export class ListAuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Exact action key or prefix ending with "*" (e.g. auth.*)', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z0-9_.]+\*?$/i, { message: 'Invalid action filter' })
  action?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) actorAdminId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) targetType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(64) targetId?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() from?: string;
  @ApiPropertyOptional({ format: 'date-time' }) @IsOptional() @IsISO8601() to?: string;

  @ApiPropertyOptional({ enum: ACTIVITY_CATEGORIES, description: 'Groups events by what they are about (SRS 1.2 ACT 002/005).' })
  @IsOptional()
  @IsIn(ACTIVITY_CATEGORIES)
  category?: ActivityCategory;

  @ApiPropertyOptional({ enum: ['success', 'failure'], description: 'Derived from the event code; a refused privileged operation is a failure.' })
  @IsOptional()
  @IsIn(['success', 'failure'])
  outcome?: 'success' | 'failure';

  @ApiPropertyOptional({ description: 'Exact request id, so one request can be followed across events.', maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  requestId?: string;

  @ApiPropertyOptional({ enum: ['createdAt'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt'])
  sort = 'createdAt' as const;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order: 'asc' | 'desc' = 'desc';
}

/**
 * The consolidated activity log (SRS 1.2 ACT 001–005; SRS section 16
 * AuditModule, RBAC `audit.read`).
 *
 * One surface, not several: administrative actions, authorization changes and
 * operational events are all read here, categorised and given an outcome by the
 * activity catalogue. It is append-only in practice as well as in principle —
 * this controller offers no create, update or delete route, and none exists
 * elsewhere. Redaction happens at write time in `AuditService`, so nothing here
 * has to remember to strip a secret.
 */
@ApiTags('admin-activity')
@Controller('admin/activity')
@RequirePermissions('audit.read')
export class AuditController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'List audit entries, newest first' })
  @ApiOkResponse({ description: '{data: AuditEntry[], meta}' })
  async list(@Query() query: ListAuditQueryDto) {
    const db = await this.database.client();
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? (query.action.endsWith('*') ? { action: { startsWith: query.action.slice(0, -1) } } : { action: query.action }) : {}),
      ...(query.actorAdminId ? { actorAdminId: query.actorAdminId } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
      // A category is a set of action prefixes, so it filters in the database
      // rather than by loading a page and discarding half of it.
      ...(query.category ? { OR: domainsInCategory(query.category).map((domain) => ({ action: { startsWith: `${domain}.` } })) } : {}),
      // Outcome is derived from the code, so it filters on the same suffixes the
      // derivation uses rather than on a second stored column that could disagree.
      ...(query.outcome === 'failure' ? { AND: [{ OR: ACTIVITY_FAILURE_SUFFIXES.map((suffix) => ({ action: { endsWith: `.${suffix}` } })) }] } : {}),
      ...(query.outcome === 'success' ? { NOT: { OR: ACTIVITY_FAILURE_SUFFIXES.map((suffix) => ({ action: { endsWith: `.${suffix}` } })) } } : {}),
    };
    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: [{ createdAt: query.order }, { id: 'asc' }],
        skip: skipFor(query.page, query.pageSize),
        take: query.pageSize,
        include: { actor: { select: { email: true, displayName: true } } },
      }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        action: r.action,
        ...describedFields(r.action),
        actor: r.actor ? { id: r.actorAdminId, email: r.actor.email, displayName: r.actor.displayName } : null,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        metadata: r.metadata,
        requestId: r.requestId,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt.toISOString(),
      })),
      meta: collectionMeta(query.page, query.pageSize, total),
    };
  }
}

/** Category, label and outcome for one event (ACT 002); derived, never stored twice. */
function describedFields(action: string) {
  const described = describeActivity(action);
  return { category: described.category, domainLabel: described.domainLabel, outcome: described.outcome };
}
