import { createHmac } from 'node:crypto';
import { ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Comment, Prisma } from '@melbourne-sphere/database';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../auth/auth.service.js';
import { FieldEncryptionService } from '../common/field-encryption.service.js';
import { collectionMeta, skipFor } from '../common/pagination.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { DatabaseService } from '../database/database.service.js';
import type { AdminPrincipal } from '../identity/identity.service.js';
import { MODERATION_ACTIONS, isNoOpDecision, type ModerationAction } from '../reviews/review-rules.js';
import { ReviewsService } from '../reviews/reviews.service.js';
import type {
  AdminCommentDto,
  ListAdminCommentsQueryDto,
  ListPublicCommentsQueryDto,
  ModerateCommentDto,
  PublicCommentDto,
  RedactCommentDto,
  SubmitCommentDto,
  CommentReceiptDto,
} from './dto/comment.dto.js';

/** SRS SEC 002: comment ceilings match reviews (five per 15 minutes, 20 per day per IP). */
const COMMENT_LIMITS = [
  { scope: 'comment:15m', max: 5, windowSeconds: 900 },
  { scope: 'comment:24h', max: 20, windowSeconds: 86_400 },
] as const;

const notFound = () => new NotFoundException({ code: 'NOT_FOUND', message: 'Comment not found' });
const stale = () => new ConflictException({ code: 'STALE_VERSION', message: 'This comment was changed by someone else. Reload and try again.' });

/**
 * Article comments (SRS COM 001–002). They follow the review moderation rules:
 * every comment starts pending, only approved comments are public, and the
 * original text is always preserved.
 */
@Injectable()
export class CommentsService {
  private readonly secret: string;
  private readonly termsVersion: string;

  constructor(
    private readonly database: DatabaseService,
    private readonly audit: AuditService,
    private readonly encryption: FieldEncryptionService,
    private readonly reviews: ReviewsService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.secret = config.get('APP_SECRET_KEY', { infer: true });
    this.termsVersion = config.get('SUBMISSION_TERMS_VERSION', { infer: true });
  }

  private hash(value: string): string {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  async submit(postId: string, input: SubmitCommentDto, ctx: RequestContext): Promise<CommentReceiptDto> {
    const db = await this.database.client();
    // Publication and commentsEnabled are rechecked here, not trusted from the page (SRS COM 002).
    const post = await db.post.findUnique({ where: { id: postId }, select: { id: true, status: true, commentsEnabled: true } });
    if (!post || post.status !== 'published') throw new NotFoundException({ code: 'NOT_FOUND', message: 'Article not found' });
    if (!post.commentsEnabled) throw new ConflictException({ code: 'COMMENTS_CLOSED', message: 'Comments are closed on this article.' });
    if (!input.acknowledged) {
      throw new HttpException({ code: 'VALIDATION_ERROR', message: 'Please accept the comment guidelines and privacy notice', fields: { acknowledged: ['Acceptance is required'] } }, HttpStatus.BAD_REQUEST);
    }
    await this.reviews.guardPublicWrite({ honeypot: input.website, captchaToken: input.captchaToken, action: 'comment', limits: COMMENT_LIMITS }, ctx);

    const email = input.email.toLowerCase();
    const comment = await db.comment.create({
      data: {
        postId,
        displayName: input.displayName,
        privateEmailEncrypted: this.encryption.encrypt(email, 'comment'),
        emailHash: this.hash(email),
        originalText: input.text,
        status: 'pending',
        acknowledgedVersion: this.termsVersion,
        acknowledgedAt: new Date(),
        submitterIpHash: this.hash(ctx.ip),
      },
      select: { id: true },
    });
    await this.audit.record({ action: 'comment.submitted', targetType: 'comment', targetId: comment.id, metadata: { postId }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return { receiptId: comment.id.slice(-12), status: 'pending', message: 'Submitted for moderation' };
  }

  async publicList(postId: string, query: ListPublicCommentsQueryDto): Promise<{ data: PublicCommentDto[]; meta: ReturnType<typeof collectionMeta> }> {
    const db = await this.database.client();
    const post = await db.post.findFirst({ where: { id: postId, status: 'published' }, select: { id: true } });
    if (!post) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Article not found' });
    const where: Prisma.CommentWhereInput = { postId, status: 'approved' };
    const [rows, total] = await Promise.all([
      db.comment.findMany({ where, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: skipFor(query.page, query.pageSize), take: query.pageSize }),
      db.comment.count({ where }),
    ]);
    return {
      data: rows.map((row) => ({ id: row.id, displayName: row.displayName, text: row.publicText ?? row.originalText, redacted: row.publicText !== null, createdAt: row.createdAt.toISOString() })),
      meta: collectionMeta(query.page, query.pageSize, total),
    };
  }

  async approvedCount(postId: string): Promise<number> {
    const db = await this.database.client();
    return db.comment.count({ where: { postId, status: 'approved' } });
  }

  // ---- moderation ----------------------------------------------------------

  async adminList(query: ListAdminCommentsQueryDto): Promise<{ data: AdminCommentDto[]; meta: ReturnType<typeof collectionMeta> }> {
    const db = await this.database.client();
    const where: Prisma.CommentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.id ? { id: query.id } : {}),
      ...(query.postId ? { postId: query.postId } : {}),
      ...(query.reported ? { reports: { some: { status: { in: ['open', 'investigating'] } } } } : {}),
    };
    const [rows, total] = await Promise.all([
      db.comment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: skipFor(query.page, query.pageSize),
        take: query.pageSize,
        include: { post: { select: { title: true, slug: true } }, _count: { select: { reports: { where: { status: { in: ['open', 'investigating'] } } } } } },
      }),
      db.comment.count({ where }),
    ]);
    return { data: rows.map((row) => this.toAdminDto(row, row.post.title, row._count.reports)), meta: collectionMeta(query.page, query.pageSize, total) };
  }

  async adminGet(id: string): Promise<AdminCommentDto> {
    const db = await this.database.client();
    const row = await db.comment.findUnique({ where: { id }, include: { post: { select: { title: true } }, _count: { select: { reports: { where: { status: { in: ['open', 'investigating'] } } } } } } });
    if (!row) throw notFound();
    return this.toAdminDto(row, row.post.title, row._count.reports);
  }

  async moderate(id: string, action: ModerationAction, input: ModerateCommentDto, actor: AdminPrincipal, ctx: RequestContext): Promise<AdminCommentDto> {
    const db = await this.database.client();
    const current = await db.comment.findUnique({ where: { id }, select: { id: true, postId: true, status: true, version: true } });
    if (!current) throw notFound();
    if (current.version !== input.expectedVersion) throw stale();
    if (isNoOpDecision(current.status, action)) throw new ConflictException({ code: 'INVALID_STATE', message: `This comment is already ${current.status}` });
    if (action !== 'approve' && !input.reason) {
      throw new HttpException({ code: 'VALIDATION_ERROR', message: 'A reason is required', fields: { reason: ['Give a reason for this decision'] } }, HttpStatus.BAD_REQUEST);
    }
    const next = MODERATION_ACTIONS[action];
    const updated = await db.comment.updateMany({
      where: { id, version: input.expectedVersion },
      data: { status: next, moderationReason: input.reason ?? null, moderatorAdminId: actor.id, decidedAt: new Date(), version: { increment: 1 } },
    });
    if (updated.count !== 1) throw stale();
    await this.audit.record({ action: `comment.${action}`, actorAdminId: actor.id, targetType: 'comment', targetId: id, reason: input.reason ?? null, metadata: { postId: current.postId, from: current.status, to: next }, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.adminGet(id);
  }

  async redact(id: string, input: RedactCommentDto, actor: AdminPrincipal, ctx: RequestContext): Promise<AdminCommentDto> {
    const db = await this.database.client();
    const current = await db.comment.findUnique({ where: { id }, select: { version: true } });
    if (!current) throw notFound();
    if (current.version !== input.expectedVersion) throw stale();
    const updated = await db.comment.updateMany({ where: { id, version: input.expectedVersion }, data: { publicText: input.publicText ?? null, redactionReason: input.reason, version: { increment: 1 } } });
    if (updated.count !== 1) throw stale();
    await this.audit.record({ action: 'comment.redact', actorAdminId: actor.id, targetType: 'comment', targetId: id, reason: input.reason, requestId: ctx.requestId, ipAddress: ctx.ip });
    return this.adminGet(id);
  }

  private toAdminDto(row: Comment, postTitle: string, openReportCount: number): AdminCommentDto {
    return {
      id: row.id,
      postId: row.postId,
      postTitle,
      displayName: row.displayName,
      email: this.encryption.decrypt(row.privateEmailEncrypted, 'comment'),
      originalText: row.originalText,
      publicText: row.publicText,
      redactionReason: row.redactionReason,
      status: row.status,
      moderationReason: row.moderationReason,
      moderatorAdminId: row.moderatorAdminId,
      decidedAt: row.decidedAt?.toISOString() ?? null,
      openReportCount,
      acknowledgedVersion: row.acknowledgedVersion,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
