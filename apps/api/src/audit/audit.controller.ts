import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import type { Prisma } from '@melbourne-sphere/database';
import { RequirePermissions } from '../auth/decorators.js';
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

  @ApiPropertyOptional({ enum: ['createdAt'], default: 'createdAt' })
  @IsOptional()
  @IsIn(['createdAt'])
  sort = 'createdAt' as const;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  override order: 'asc' | 'desc' = 'desc';
}

/** Read-only, filtered audit access (SRS section 16 AuditModule, RBAC audit.read). */
@ApiTags('admin-audit')
@Controller('admin/audit')
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
      ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
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
