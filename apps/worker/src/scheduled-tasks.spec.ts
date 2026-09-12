import { describe, expect, it, vi } from 'vitest';
import type { DatabaseClient } from '@melbourne-sphere/database';
import type { Queue } from 'bullmq';
import { TASK_IMPLEMENTATIONS, runScheduledTask, type RunDeps } from './scheduled-tasks.js';

const NOW = new Date('2026-09-08T02:00:00.000Z');

function fakeDb(overrides: Record<string, unknown> = {}) {
  const runs: Record<string, unknown>[] = [];
  const db = {
    scheduledTaskRun: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        runs.push(data);
        return { id: `run-${runs.length}`, ...data };
      }),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(runs.at(-1)!, data);
        return runs.at(-1);
      }),
      deleteMany: vi.fn(async () => ({ count: 3 })),
    },
    auditLog: { deleteMany: vi.fn(async () => ({ count: 7 })) },
    emailDelivery: { updateMany: vi.fn(async () => ({ count: 2 })), deleteMany: vi.fn(async () => ({ count: 1 })) },
    post: { findMany: vi.fn(async () => []) },
    setting: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(db)),
    ...overrides,
  } as unknown as DatabaseClient & { __runs: Record<string, unknown>[] };
  (db as unknown as { __runs: Record<string, unknown>[] }).__runs = runs;
  return db as DatabaseClient & { __runs: Record<string, unknown>[] };
}

function deps(db: DatabaseClient, overrides: Partial<RunDeps> = {}): RunDeps {
  return {
    db,
    now: NOW,
    queue: { clean: vi.fn(async () => ['a', 'b']) } as unknown as Queue,
    runnerId: 'runner-1',
    acquireLock: vi.fn(async () => true),
    releaseLock: vi.fn(async () => undefined),
    ...overrides,
  };
}

/** Scheduled tasks (SRS 1.2 TASK 001–004). */
describe('runScheduledTask', () => {
  it('refuses a code that is not in the registry, without running anything', async () => {
    const db = fakeDb();
    const result = await runScheduledTask({ taskCode: 'rm -rf /', trigger: 'manual' }, deps(db));
    expect(result).toEqual({ outcome: 'skipped', detail: 'Unknown task code' });
    expect(db.scheduledTaskRun.create).not.toHaveBeenCalled();
  });

  it('records a successful run with its duration and a one-line detail', async () => {
    const db = fakeDb();
    const result = await runScheduledTask({ taskCode: 'activity.retention', trigger: 'scheduled' }, deps(db));
    expect(result.outcome).toBe('succeeded');
    expect(result.detail).toBe('Removed 7 activity events');
    const run = db.__runs.at(-1)!;
    expect(run).toMatchObject({ taskCode: 'activity.retention', trigger: 'scheduled', outcome: 'succeeded', runnerId: 'runner-1' });
    expect(typeof run.durationMs).toBe('number');
  });

  it('skips rather than running twice when another replica holds the lock', async () => {
    const db = fakeDb();
    const acquireLock = vi.fn(async () => false);
    const result = await runScheduledTask({ taskCode: 'activity.retention', trigger: 'manual' }, deps(db, { acquireLock }));
    expect(result).toEqual({ outcome: 'skipped', detail: 'Already running elsewhere' });
    expect(db.auditLog.deleteMany).not.toHaveBeenCalled();
    expect(db.__runs.at(-1)).toMatchObject({ outcome: 'skipped' });
  });

  it('does not take a lock for a task the registry marks safe to overlap', async () => {
    const db = fakeDb();
    const acquireLock = vi.fn(async () => false);
    const result = await runScheduledTask({ taskCode: 'queue.clean-metadata', trigger: 'scheduled' }, deps(db, { acquireLock }));
    expect(acquireLock).not.toHaveBeenCalled();
    expect(result.outcome).toBe('succeeded');
  });

  it('records a failure as one line, never a stack trace', async () => {
    const db = fakeDb({ auditLog: { deleteMany: vi.fn(async () => { throw new Error('ER_LOCK_DEADLOCK: deadlock found\n    at Object.<anonymous> (/app/secret/path.js:1:1)'); }) } });
    const result = await runScheduledTask({ taskCode: 'activity.retention', trigger: 'scheduled' }, deps(db));
    expect(result.outcome).toBe('failed');
    expect(result.detail).toBe('ER_LOCK_DEADLOCK: deadlock found');
    expect(result.detail).not.toContain('/app/');
  });

  it('releases the lock whether the task succeeded or failed', async () => {
    const releaseLock = vi.fn(async () => undefined);
    await runScheduledTask({ taskCode: 'activity.retention', trigger: 'scheduled' }, deps(fakeDb(), { releaseLock }));
    const failing = fakeDb({ auditLog: { deleteMany: vi.fn(async () => { throw new Error('nope'); }) } });
    await runScheduledTask({ taskCode: 'activity.retention', trigger: 'scheduled' }, deps(failing, { releaseLock }));
    expect(releaseLock).toHaveBeenCalledTimes(2);
  });

  it('stops a task that exceeds its timeout and records it as timed out', async () => {
    const db = fakeDb({ auditLog: { deleteMany: vi.fn(() => new Promise(() => {})) } });
    vi.useFakeTimers();
    const promise = runScheduledTask({ taskCode: 'activity.retention', trigger: 'scheduled' }, deps(db));
    await vi.advanceTimersByTimeAsync(300_001);
    const result = await promise;
    vi.useRealTimers();
    expect(result.outcome).toBe('timedOut');
    expect(result.detail).toMatch(/Stopped after 300s/);
  });
});

describe('task implementations', () => {
  it('publishes only articles that are due, and asks for their pages to be refreshed', async () => {
    const created: Record<string, unknown>[] = [];
    const db = fakeDb({
      post: { findMany: vi.fn(async () => [{ id: 'p1', slug: 'a-guide' }]) },
      outboxEvent: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { created.push(data); return data; }) },
    });
    (db as unknown as { post: { updateMany: unknown } }).post = {
      ...(db as unknown as { post: object }).post,
      updateMany: vi.fn(async () => ({ count: 1 })),
    } as never;

    const detail = await TASK_IMPLEMENTATIONS['content.publish-scheduled']!({ db, now: NOW, queue: {} as Queue });
    expect(detail).toBe('Published 1 article');
    expect(created[0]).toMatchObject({ type: 'cache.invalidate', resourceType: 'post', resourceId: 'p1' });
    expect(String((created[0] as { payload: { tags: string } }).payload.tags)).toContain('post:a-guide');
  });

  it('removes the address from a delivery record long before deleting the record itself', async () => {
    const db = fakeDb();
    const detail = await TASK_IMPLEMENTATIONS['email.retention']!({ db, now: NOW, queue: {} as Queue });
    expect(detail).toBe('Removed the address from 2 records; deleted 1');
    const anonymise = (db.emailDelivery.updateMany as unknown as { mock: { calls: [{ data: Record<string, string> }][] } }).mock.calls[0]![0];
    expect(anonymise.data).toEqual({ recipientEncrypted: '', recipientMasked: 'removed' });
  });

  it('deletes the stored bytes before the row, and says so when there is no storage', async () => {
    const deleted: string[] = [];
    const storage = { delete: vi.fn(async (bucket: string, key: string) => { deleted.push(`${bucket}:${key}`); }) };
    const db = fakeDb({
      mediaAsset: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: 'a1', objectKey: 'q/a1' }])
          .mockResolvedValueOnce([{ id: 'r1', objectKey: 'q/r1', variants: [{ objectKey: 'p/r1-card' }] }]),
        delete: vi.fn(async () => ({})),
      },
    });
    const detail = await TASK_IMPLEMENTATIONS['media.retention']!({ db, now: NOW, queue: {} as Queue, storage });
    expect(detail).toBe('Removed 1 abandoned upload and 1 unused image');
    expect(deleted).toEqual(['quarantine:q/a1', 'public:p/r1-card', 'quarantine:q/r1']);

    // Without storage the task reports rather than deleting rows whose bytes
    // would then be orphaned.
    expect(await TASK_IMPLEMENTATIONS['media.retention']!({ db: fakeDb(), now: NOW, queue: {} as Queue })).toMatch(/not configured/i);
  });

  it('keeps an upload that is only waiting for processing, and clears one that never arrived', async () => {
    const findMany = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const db = fakeDb({ mediaAsset: { findMany, delete: vi.fn(async () => ({})) } });
    await TASK_IMPLEMENTATIONS['media.retention']!({ db, now: NOW, queue: {} as Queue, storage: { delete: vi.fn(async () => undefined) } });

    const abandoned = (findMany.mock.calls[0]![0] as { where: { OR: Record<string, unknown>[] } }).where;
    // A completed upload has a checksum and is merely queued: deleting it threw
    // away real images whenever the worker was behind for a day, while the
    // library promised nothing needed uploading twice.
    expect(abandoned.OR).toEqual([{ status: 'rejected' }, { status: 'quarantined', checksum: null }]);
  });

  it('never treats an image a testimonial, a partner or the site settings use as unused', async () => {
    const findMany = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const db = fakeDb({
      mediaAsset: { findMany, delete: vi.fn(async () => ({})) },
      setting: {
        findMany: vi.fn(async () => [
          { group: 'website', key: 'general', data: { logoMediaId: 'logo-1', faviconMediaId: null, shareImageMediaId: null } },
          { group: 'website', key: 'home', data: { heroSlides: [{ mediaId: 'hero-1' }] } },
        ]),
      },
    });
    await TASK_IMPLEMENTATIONS['media.retention']!({ db, now: NOW, queue: {} as Queue, storage: { delete: vi.fn(async () => undefined) } });

    const unusedQuery = findMany.mock.calls[1]![0] as { where: Record<string, unknown> };
    // Every relation that shows an image, not only listings, articles and authors…
    for (const relation of ['businesses', 'coverOf', 'authorOf', 'testimonials', 'partners']) {
      expect(unusedQuery.where[relation], relation).toEqual({ none: {} });
    }
    // …and the images the settings name by id, which no foreign key protects.
    expect(unusedQuery.where.id).toEqual({ notIn: ['logo-1', 'hero-1'] });
  });

  it('cleans only completed job records, and only ones a week old', async () => {
    const clean = vi.fn(async () => ['a']);
    await TASK_IMPLEMENTATIONS['queue.clean-metadata']!({ db: fakeDb(), now: NOW, queue: { clean } as unknown as Queue });
    expect(clean).toHaveBeenCalledWith(7 * 86_400_000, 1_000, 'completed');
  });
});
