import type { Queue } from 'bullmq';
import type { DatabaseClient } from '@melbourne-sphere/database';
import {
  CACHE_TAGS,
  MEDIA_SETTING_REFERENCES,
  QUARANTINE_MAX_AGE_HOURS,
  SCHEDULED_RUN_RETENTION_DAYS,
  UNUSED_READY_MAX_AGE_DAYS,
  scheduledTask,
  scheduledTaskLockKey,
  unusedMediaRelations,
  type ScheduledTaskDefinition,
} from '@melbourne-sphere/domain';

export interface ScheduledTaskJobData {
  taskCode?: string;
  trigger?: 'scheduled' | 'manual';
  actorAdminId?: string | null;
}

export interface TaskContext {
  db: DatabaseClient;
  now: Date;
  /** The queue itself, for the housekeeping task that tidies its own records. */
  queue: Queue;
  /**
   * Object storage, for the one task that deletes stored bytes. Optional so a
   * deployment without storage still runs every other task; the media task
   * reports that it could not run rather than failing the schedule.
   */
  storage?: { delete(bucket: 'quarantine' | 'public', key: string): Promise<void> };
}

/** One line describing what a run did; counts only, never rows or addresses. */
export type TaskResult = string;

/** Days after which a delivery record's protected recipient is removed (SRS 1.2 MAIL 010). */
export const EMAIL_RECIPIENT_ANONYMISE_DAYS = 90;
/** Days after which the delivery record itself is deleted (MAIL 010). */
export const EMAIL_RECORD_RETENTION_DAYS = 180;
/** Activity events are kept a year (ACT 006); mirrored from the API's catalogue. */
export const ACTIVITY_RETENTION_DAYS = 365;

const daysAgo = (now: Date, days: number) => new Date(now.getTime() - days * 86_400_000);

/**
 * What each registered task actually does (SRS 1.2 TASK 001–004).
 *
 * Every implementation is idempotent: it works from "everything older than X"
 * rather than from a cursor, so a repeat after a crash, a manual run during a
 * scheduled one, or a retry after a timeout all converge on the same state.
 * Each returns one line for the run record — a count of what changed, never
 * what was in it.
 */
export const TASK_IMPLEMENTATIONS: Record<string, (ctx: TaskContext) => Promise<TaskResult>> = {
  /**
   * Publishes articles whose scheduled time has passed (SRS BLOG 004). Late is
   * not cancelled: a run picks up everything due, however long the worker was
   * down. Each article is published in its own transaction with the cache
   * invalidation that makes it visible, so a failure part-way leaves published
   * articles visible rather than published-but-hidden.
   */
  'content.publish-scheduled': async ({ db, now }) => {
    const due = await db.post.findMany({ where: { status: 'scheduled', scheduledAt: { lte: now } }, select: { id: true, slug: true }, take: 200 });
    let published = 0;
    for (const post of due) {
      await db.$transaction(async (tx) => {
        const updated = await tx.post.updateMany({ where: { id: post.id, status: 'scheduled' }, data: { status: 'published', publishedAt: now } });
        // Another replica may have taken it between the read and here.
        if (updated.count === 0) return;
        await tx.outboxEvent.create({
          data: {
            type: 'cache.invalidate',
            resourceType: 'post',
            resourceId: post.id,
            payload: { tags: [CACHE_TAGS.posts, CACHE_TAGS.post(post.slug), CACHE_TAGS.sitemap].join(',') },
          },
        });
        published += 1;
      });
    }
    return published === 0 ? 'Nothing was due' : `Published ${published} article${published === 1 ? '' : 's'}`;
  },

  /** Activity retention (ACT 006, PRIV 001). */
  'activity.retention': async ({ db, now }) => {
    const { count } = await db.auditLog.deleteMany({ where: { createdAt: { lt: daysAgo(now, ACTIVITY_RETENTION_DAYS) } } });
    return `Removed ${count} activity event${count === 1 ? '' : 's'}`;
  },

  /**
   * Email log retention (MAIL 010). Two stages, deliberately separate: the
   * address is removed from a record long before the record itself goes, so an
   * operator keeps the delivery evidence without keeping the personal data.
   */
  'email.retention': async ({ db, now }) => {
    const anonymised = await db.emailDelivery.updateMany({
      where: { updatedAt: { lt: daysAgo(now, EMAIL_RECIPIENT_ANONYMISE_DAYS) }, NOT: { recipientEncrypted: '' } },
      data: { recipientEncrypted: '', recipientMasked: 'removed' },
    });
    const { count: deleted } = await db.emailDelivery.deleteMany({ where: { updatedAt: { lt: daysAgo(now, EMAIL_RECORD_RETENTION_DAYS) } } });
    return `Removed the address from ${anonymised.count} record${anonymised.count === 1 ? '' : 's'}; deleted ${deleted}`;
  },

  /**
   * Media retention (SRS MED 004). Two windows: an upload abandoned in
   * quarantine goes after a day, and a processed image nothing has used goes
   * after a month. Bytes are deleted before the row, and a storage failure is
   * tolerated per object — an orphaned object costs money, an orphaned row
   * costs a broken page.
   */
  'media.retention': async ({ db, now, storage }) => {
    if (!storage) return 'Object storage is not configured; nothing was removed';
    const abandoned = await db.mediaAsset.findMany({
      where: { status: { in: ['quarantined', 'rejected'] }, createdAt: { lt: new Date(now.getTime() - QUARANTINE_MAX_AGE_HOURS * 3_600_000) } },
      select: { id: true, objectKey: true },
      take: 100,
    });
    for (const asset of abandoned) {
      await storage.delete('quarantine', asset.objectKey).catch(() => undefined);
      await db.mediaAsset.delete({ where: { id: asset.id } }).catch(() => undefined);
    }
    // "Unused" is the shared definition the media library also refuses deletion
    // by: every relation that shows an image, plus the settings documents that
    // name one by id (site logo, icon, sharing image, home hero). Deciding it
    // here from a shorter list is how a partner's logo was once eligible for
    // deletion a month after it was uploaded.
    const referenced = await db.setting.findMany({
      where: { OR: MEDIA_SETTING_REFERENCES.map((ref) => ({ group: ref.group, key: ref.key })) },
      select: { group: true, key: true, data: true },
    });
    const namedBySettings = referenced.flatMap((row) => MEDIA_SETTING_REFERENCES.find((ref) => ref.group === row.group && ref.key === row.key)?.mediaIds(row.data) ?? []);
    const unused = await db.mediaAsset.findMany({
      where: {
        status: 'ready',
        readyAt: { lt: new Date(now.getTime() - UNUSED_READY_MAX_AGE_DAYS * 86_400_000) },
        ...unusedMediaRelations(),
        ...(namedBySettings.length > 0 ? { id: { notIn: [...new Set(namedBySettings)] } } : {}),
      },
      select: { id: true, objectKey: true, variants: { select: { objectKey: true } } },
      take: 100,
    });
    for (const asset of unused) {
      for (const variant of asset.variants) await storage.delete('public', variant.objectKey).catch(() => undefined);
      await storage.delete('quarantine', asset.objectKey).catch(() => undefined);
      await db.mediaAsset.delete({ where: { id: asset.id } }).catch(() => undefined);
    }
    return `Removed ${abandoned.length} abandoned upload${abandoned.length === 1 ? '' : 's'} and ${unused.length} unused image${unused.length === 1 ? '' : 's'}`;
  },

  /** Queue housekeeping (QMON 003 bounds: completed only, never recent). */
  'queue.clean-metadata': async ({ queue }) => {
    const removed = await queue.clean(7 * 86_400_000, 1_000, 'completed');
    return `Removed ${removed.length} completed job record${removed.length === 1 ? '' : 's'}`;
  },

  /** The history of these runs is itself retained for 30 days (TASK 002). */
  'schedule.run-retention': async ({ db, now }) => {
    const { count } = await db.scheduledTaskRun.deleteMany({ where: { startedAt: { lt: daysAgo(now, SCHEDULED_RUN_RETENTION_DAYS) } } });
    return `Removed ${count} run record${count === 1 ? '' : 's'}`;
  },
};

export interface RunDeps extends TaskContext {
  /** Redis lock primitives, so this module never talks to Redis directly. */
  acquireLock: (key: string, ttlMs: number) => Promise<boolean>;
  releaseLock: (key: string) => Promise<void>;
  runnerId: string;
  log?: (line: string) => void;
}

export type RunOutcome = 'succeeded' | 'failed' | 'skipped' | 'timedOut';

/**
 * Runs one registered task with a lock, a timeout and a recorded outcome
 * (TASK 002–004).
 *
 * Nothing here trusts the job's payload beyond the code: an unregistered code
 * is refused, and the implementation comes from this module rather than from
 * the message. A task already running elsewhere is *skipped*, not queued behind
 * the first: these are periodic jobs, and the next occurrence will do the work
 * anyway.
 */
export async function runScheduledTask(data: ScheduledTaskJobData, deps: RunDeps): Promise<{ outcome: RunOutcome; detail: string }> {
  const code = String(data.taskCode ?? '');
  const definition: ScheduledTaskDefinition | undefined = scheduledTask(code);
  const implementation = TASK_IMPLEMENTATIONS[code];
  if (!definition || !implementation) {
    // A job naming a task this build does not have is a deployment mismatch,
    // not a task failure; it is recorded and dropped rather than retried.
    deps.log?.(`[schedule] refusing unknown task ${JSON.stringify(code).slice(0, 80)}`);
    return { outcome: 'skipped', detail: 'Unknown task code' };
  }

  const trigger = data.trigger === 'manual' ? 'manual' : 'scheduled';
  const lockKey = scheduledTaskLockKey(code);
  const holdsLock = definition.safeToOverlap || (await deps.acquireLock(lockKey, definition.timeoutMs + 30_000));
  if (!holdsLock) {
    await deps.db.scheduledTaskRun.create({
      data: { taskCode: code, trigger, outcome: 'skipped', finishedAt: deps.now, durationMs: 0, detail: 'Already running elsewhere', actorAdminId: data.actorAdminId ?? null, runnerId: deps.runnerId },
    });
    return { outcome: 'skipped', detail: 'Already running elsewhere' };
  }

  const run = await deps.db.scheduledTaskRun.create({
    data: { taskCode: code, trigger, outcome: 'running', startedAt: deps.now, actorAdminId: data.actorAdminId ?? null, runnerId: deps.runnerId },
  });
  const started = Date.now();
  let outcome: RunOutcome = 'succeeded';
  let detail = '';
  try {
    detail = await withTimeout(implementation(deps), definition.timeoutMs);
  } catch (error) {
    outcome = (error as Error).message === TIMEOUT ? 'timedOut' : 'failed';
    detail = outcome === 'timedOut' ? `Stopped after ${Math.round(definition.timeoutMs / 1000)}s` : (error as Error).message.split('\n')[0]!.slice(0, 300);
  } finally {
    const finishedAt = new Date();
    await deps.db.scheduledTaskRun.update({
      where: { id: run.id },
      data: { outcome, finishedAt, durationMs: Date.now() - started, detail: detail.slice(0, 300) },
    });
    if (!definition.safeToOverlap) await deps.releaseLock(lockKey);
  }
  return { outcome, detail };
}

const TIMEOUT = 'scheduled-task-timeout';

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(TIMEOUT)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
