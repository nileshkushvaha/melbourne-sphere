import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { PasswordService } from './password.service.js';
import { SecurityPolicyService } from './security-policy.service.js';

/**
 * Password reuse prevention (SRS 1.2 SECS 003).
 *
 * Only hashes are kept, and only as many as the configured depth needs: a
 * candidate is verified against them, never compared, and nothing here can
 * reveal a previous password. A depth of zero — the default — keeps no history
 * at all, and prunes what is already there so the setting means what it says.
 */
@Injectable()
export class PasswordHistoryService {
  constructor(
    private readonly database: DatabaseService,
    private readonly passwords: PasswordService,
    private readonly policy: SecurityPolicyService,
  ) {}

  /** Refuses a password the administrator has used within the configured depth. */
  async assertNotReused(adminId: string, candidate: string, currentHash: string | null): Promise<void> {
    const { passwordHistoryDepth } = await this.policy.policy();
    if (passwordHistoryDepth === 0) return;

    // The password in use counts as one of the previous ones; refusing to
    // "change" a password to itself is the least surprising behaviour.
    if (currentHash && (await this.passwords.verify(currentHash, candidate))) {
      throw this.refusal(passwordHistoryDepth);
    }

    const db = await this.database.client();
    const previous = await db.adminPasswordHistory.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      take: passwordHistoryDepth,
      select: { passwordHash: true },
    });
    for (const entry of previous) {
      if (await this.passwords.verify(entry.passwordHash, candidate)) throw this.refusal(passwordHistoryDepth);
    }
  }

  /**
   * Records the hash being replaced and prunes beyond the configured depth, so
   * the store never holds more history than the policy asks for.
   */
  async record(adminId: string, replacedHash: string | null): Promise<void> {
    const { passwordHistoryDepth } = await this.policy.policy();
    const db = await this.database.client();
    if (passwordHistoryDepth === 0) {
      await db.adminPasswordHistory.deleteMany({ where: { adminId } });
      return;
    }
    if (replacedHash) await db.adminPasswordHistory.create({ data: { adminId, passwordHash: replacedHash } });

    const keep = await db.adminPasswordHistory.findMany({ where: { adminId }, orderBy: { createdAt: 'desc' }, take: passwordHistoryDepth, select: { id: true } });
    await db.adminPasswordHistory.deleteMany({ where: { adminId, id: { notIn: keep.map((row) => row.id) } } });
  }

  private refusal(depth: number): HttpException {
    return new HttpException(
      {
        code: 'PASSWORD_REUSED',
        message: `Choose a password you have not used in your last ${depth} password${depth === 1 ? '' : 's'}.`,
        fields: { newPassword: ['This password has been used before'] },
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
