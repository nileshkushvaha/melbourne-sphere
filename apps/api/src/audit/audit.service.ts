import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

export interface AuditEntry {
  action: string;
  actorAdminId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  reason?: string | null;
  /** Non-sensitive keys only. Values are stringified and capped. */
  metadata?: Record<string, string | number | boolean | null> | null;
  requestId?: string | null;
  ipAddress?: string | null;
}

const FORBIDDEN_METADATA_KEYS = /password|token|secret|cookie|authorization|hash/i;

/**
 * Append-only audit log (SRS section 14, MON 001). Writes never throw into the
 * caller: a failed audit write is logged and the business operation proceeds
 * (losing an audit row is preferable to failing a login), except where a
 * caller explicitly awaits `recordOrThrow` inside a transaction.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly database: DatabaseService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.recordOrThrow(entry);
    } catch (error) {
      this.logger.error(`audit write failed for ${entry.action}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async recordOrThrow(entry: AuditEntry): Promise<void> {
    const db = await this.database.client();
    await db.auditLog.create({
      data: {
        action: entry.action.slice(0, 64),
        actorAdminId: entry.actorAdminId ?? null,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        reason: entry.reason ? entry.reason.slice(0, 500) : null,
        metadata: entry.metadata ? sanitiseMetadata(entry.metadata) : undefined,
        requestId: entry.requestId ?? null,
        ipAddress: entry.ipAddress ? entry.ipAddress.slice(0, 45) : null,
      },
    });
  }
}

export function sanitiseMetadata(metadata: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.test(key)) continue;
    if (value === null || typeof value === 'boolean' || typeof value === 'number') out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, 200);
  }
  return out;
}
