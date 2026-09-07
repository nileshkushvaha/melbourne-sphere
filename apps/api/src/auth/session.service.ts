import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { DatabaseService } from '../database/database.service.js';
import type { EnvironmentVariables } from '../config/env.validation.js';

export const SESSION_COOKIE_NAME = 'ms_admin_session';
/** Narrowest path that covers every admin route (SRS AUTH 002). */
export const SESSION_COOKIE_PATH = '/api/v1/admin';
/** lastSeenAt/idle deadline are persisted at most this often to limit writes. */
const TOUCH_INTERVAL_MS = 60_000;

export interface SessionSummary {
  id: string;
  createdAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
}

export type SessionValidation =
  | { ok: true; session: SessionSummary; adminId: string }
  | { ok: false; reason: 'missing' | 'unknown' | 'revoked' | 'expired' | 'idle' };

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Opaque server-side sessions (SRS AUTH 002): random 256-bit token in an
 * HttpOnly cookie, SHA-256 hash in MySQL, sliding idle timeout and absolute
 * lifetime, revocation on the server record. Redis lookup caching is an
 * optional later optimisation; MySQL is authoritative.
 */
@Injectable()
export class SessionService {
  private readonly idleMs: number;
  private readonly absoluteMs: number;
  private readonly cookieSecure: boolean;

  constructor(
    private readonly database: DatabaseService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.idleMs = config.get('SESSION_IDLE_MINUTES', { infer: true }) * 60_000;
    this.absoluteMs = config.get('SESSION_ABSOLUTE_HOURS', { infer: true }) * 3_600_000;
    this.cookieSecure = config.get('SESSION_COOKIE_SECURE', { infer: true });
  }

  get cookieOptions(): CookieOptions {
    return { httpOnly: true, secure: this.cookieSecure, sameSite: 'strict', path: SESSION_COOKIE_PATH, maxAge: this.absoluteMs };
  }

  async create(adminId: string, context: { ipAddress?: string | null; userAgent?: string | null }): Promise<{ token: string; session: SessionSummary }> {
    const db = await this.database.client();
    const token = randomBytes(32).toString('base64url');
    const now = new Date();
    const record = await db.adminSession.create({
      data: {
        tokenHash: hashSessionToken(token),
        adminId,
        idleExpiresAt: new Date(now.getTime() + this.idleMs),
        expiresAt: new Date(now.getTime() + this.absoluteMs),
        ipAddress: context.ipAddress?.slice(0, 45) ?? null,
        userAgent: context.userAgent?.slice(0, 255) ?? null,
      },
      select: { id: true, createdAt: true, idleExpiresAt: true, expiresAt: true },
    });
    return { token, session: record };
  }

  /** Validates a presented token and slides the idle deadline (throttled). */
  async validate(token: string | undefined): Promise<SessionValidation> {
    if (!token || token.length < 32 || token.length > 128) return { ok: false, reason: 'missing' };
    const db = await this.database.client();
    const record = await db.adminSession.findUnique({ where: { tokenHash: hashSessionToken(token) } });
    if (!record) return { ok: false, reason: 'unknown' };
    if (record.revokedAt) return { ok: false, reason: 'revoked' };
    const now = Date.now();
    if (record.expiresAt.getTime() <= now) {
      await this.markRevoked(record.id, 'expired');
      return { ok: false, reason: 'expired' };
    }
    if (record.idleExpiresAt.getTime() <= now) {
      await this.markRevoked(record.id, 'idle_timeout');
      return { ok: false, reason: 'idle' };
    }
    let idleExpiresAt = record.idleExpiresAt;
    if (now - record.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
      idleExpiresAt = new Date(Math.min(now + this.idleMs, record.expiresAt.getTime()));
      await db.adminSession.update({ where: { id: record.id }, data: { lastSeenAt: new Date(now), idleExpiresAt } });
    }
    return {
      ok: true,
      adminId: record.adminId,
      session: { id: record.id, createdAt: record.createdAt, idleExpiresAt, expiresAt: record.expiresAt },
    };
  }

  async revoke(sessionId: string, reason: string): Promise<void> {
    await this.markRevoked(sessionId, reason);
  }

  /** Revokes every active session of an admin (password reset, disable, privilege change). */
  async revokeAllForAdmin(adminId: string, reason: string, exceptSessionId?: string): Promise<number> {
    const db = await this.database.client();
    const result = await db.adminSession.updateMany({
      where: { adminId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
      data: { revokedAt: new Date(), revokedReason: reason.slice(0, 64) },
    });
    return result.count;
  }

  setCookie(res: Response, token: string): void {
    res.cookie(SESSION_COOKIE_NAME, token, this.cookieOptions);
  }

  clearCookie(res: Response): void {
    res.clearCookie(SESSION_COOKIE_NAME, { ...this.cookieOptions, maxAge: undefined });
  }

  private async markRevoked(sessionId: string, reason: string): Promise<void> {
    const db = await this.database.client();
    await db.adminSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date(), revokedReason: reason } });
  }
}
