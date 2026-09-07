import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, RedirectKind } from '@melbourne-sphere/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../auth/auth.service.js';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { normalisePath, RedirectRuleError, validateRedirect } from './redirect-rules.js';
import type { CreateRedirectDto, ListRedirectsQueryDto, RedirectDto, RedirectResolutionDto } from './dto/redirect.dto.js';

type Tx = Prisma.TransactionClient;

interface RecordChangeInput {
  sourcePath: string;
  targetPath: string;
  resourceType: 'business' | 'post';
  resourceId: string;
  actorAdminId: string;
  reason?: string | null;
}

const toDto = (row: {
  id: string;
  sourcePath: string;
  targetPath: string | null;
  kind: RedirectKind;
  reason: string | null;
  resourceType: string | null;
  resourceId: string | null;
  createdByAdminId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): RedirectDto => ({
  id: row.id,
  sourcePath: row.sourcePath,
  targetPath: row.targetPath,
  kind: row.kind,
  reason: row.reason,
  resourceType: row.resourceType,
  resourceId: row.resourceId,
  createdByAdminId: row.createdByAdminId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * Public path redirects (SRS SEO 004). Every write goes through
 * {@link writeRedirect}, which keeps three invariants:
 *  - one source resolves one way (unique column plus upsert);
 *  - no chains: aliases already pointing at the old path are repointed at the
 *    new target in the same transaction;
 *  - no cycles: a redirect whose source equals the new target is removed,
 *    because that path is now live content again.
 */
@Injectable()
export class RedirectsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
  ) {}

  /** Resolution for the web tier; unknown paths return null so the site can render its own 404. */
  async resolve(path: string): Promise<RedirectResolutionDto | null> {
    const sourcePath = normalisePath(path);
    if (!sourcePath) return null;
    const db = await this.database.client();
    const row = await db.redirect.findUnique({ where: { sourcePath } });
    if (!row) return null;
    if (row.kind === 'gone') return { kind: 'gone', status: 410, targetPath: null };
    // targetPath is non-null for permanent rows by construction; a defensive
    // check keeps a hand-edited row from producing a redirect to nowhere.
    if (!row.targetPath) return null;
    return { kind: 'permanent', status: 301, targetPath: row.targetPath };
  }

  async list(query: ListRedirectsQueryDto): Promise<{ data: RedirectDto[]; meta: { total: number; page: number; pageSize: number } }> {
    const db = await this.database.client();
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 25;
    const where: Prisma.RedirectWhereInput = {};
    if (query.kind) where.kind = query.kind;
    if (query.q) {
      const q = query.q.trim().toLowerCase();
      where.OR = [{ sourcePath: { contains: q } }, { targetPath: { contains: q } }];
    }
    const [rows, total] = await Promise.all([
      db.redirect.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      db.redirect.count({ where }),
    ]);
    return { data: rows.map(toDto), meta: { total, page, pageSize } };
  }

  async create(input: CreateRedirectDto, actor: AdminPrincipal, ctx: RequestContext): Promise<RedirectDto> {
    const kind = input.kind ?? 'permanent';
    const pair = this.validate(input.sourcePath, input.targetPath ?? null, kind);
    const db = await this.database.client();
    const row = await db.$transaction((tx) =>
      this.writeRedirect(tx, { ...pair, kind, reason: input.reason ?? null, resourceType: input.resourceType ?? null, resourceId: input.resourceId ?? null, actorAdminId: actor.id }),
    );
    await this.audit.record({ action: 'seo.redirect.create', actorAdminId: actor.id, targetType: 'redirect', targetId: row.id, metadata: { sourcePath: row.sourcePath, targetPath: row.targetPath, kind }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return toDto(row);
  }

  async remove(id: string, actor: AdminPrincipal, ctx: RequestContext): Promise<void> {
    const db = await this.database.client();
    const row = await db.redirect.findUnique({ where: { id } });
    if (!row) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Resource not found' });
    await db.redirect.delete({ where: { id } });
    await this.audit.record({ action: 'seo.redirect.delete', actorAdminId: actor.id, targetType: 'redirect', targetId: id, metadata: { sourcePath: row.sourcePath }, requestId: ctx.requestId, ipAddress: ctx.ip });
  }

  /**
   * Called inside the slug-change transaction of a published listing or
   * article. Returns nothing: failures throw so the slug change rolls back
   * with the redirect rather than leaving a dead URL.
   */
  async recordSlugChange(tx: Tx, input: RecordChangeInput): Promise<void> {
    const pair = this.validate(input.sourcePath, input.targetPath, 'permanent');
    await this.writeRedirect(tx, {
      ...pair,
      kind: 'permanent',
      reason: input.reason ?? null,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      actorAdminId: input.actorAdminId,
    });
  }

  private validate(source: string, target: string | null, kind: RedirectKind) {
    try {
      return validateRedirect(source, target, kind);
    } catch (error) {
      if (error instanceof RedirectRuleError) {
        throw new HttpException({ code: 'VALIDATION_ERROR', message: error.message, fields: { [error.field]: [error.message] } }, HttpStatus.BAD_REQUEST);
      }
      throw error;
    }
  }

  private async writeRedirect(
    tx: Tx,
    input: { sourcePath: string; targetPath: string | null; kind: RedirectKind; reason: string | null; resourceType: string | null; resourceId: string | null; actorAdminId: string },
  ) {
    const { sourcePath, targetPath, kind } = input;
    if (targetPath) {
      // The new target is live content: it must not itself redirect away (cycle).
      await tx.redirect.deleteMany({ where: { sourcePath: targetPath } });
      // Older aliases of the old path now point at the new target (no chains).
      await tx.redirect.updateMany({ where: { targetPath: sourcePath, kind: 'permanent' }, data: { targetPath } });
    }
    const existing = await tx.redirect.findUnique({ where: { sourcePath } });
    if (existing && existing.resourceType && input.resourceType && existing.resourceType !== input.resourceType) {
      throw new ConflictException({ code: 'REDIRECT_IN_USE', message: 'That path already redirects for a different resource', fields: { sourcePath: ['That path already redirects for a different resource'] } });
    }
    const data = { targetPath, kind, reason: input.reason, resourceType: input.resourceType, resourceId: input.resourceId, createdByAdminId: input.actorAdminId };
    return tx.redirect.upsert({ where: { sourcePath }, create: { sourcePath, ...data }, update: data });
  }
}
