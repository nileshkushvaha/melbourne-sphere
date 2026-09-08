import { Worker, type Job } from 'bullmq';
import { createDatabaseClient, type DatabaseClient } from '@melbourne-sphere/database';
import { loadWorkerConfig } from './config.js';
import { deliverEnquiry, markDeliveryFailed, type DeliveryJobData } from './enquiry-delivery.js';
import { ConsoleEnquiryMailer } from './mailer/console-mailer.js';
import { EnquiryMailerPort } from './mailer/mailer.port.js';
import { SmtpEnquiryMailer } from './mailer/smtp-mailer.js';
import { randomBytes } from 'node:crypto';
import { CACHE_INVALIDATE_JOB, ENQUIRY_EMAIL_JOB, MEDIA_PROCESS_JOB, QUEUE_NAME, SCHEDULED_TASK_JOB, buildEnquiryMail, redisConnectionFromUrl } from '@melbourne-sphere/domain';
import { ScheduleRunner } from './schedule-runner.js';
import type { ScheduledTaskJobData } from './scheduled-tasks.js';
import { processMediaAsset, type MediaJobData } from './media-processing.js';
import { invalidateCache, type CacheInvalidationJobData } from './cache-invalidation.js';
import { S3Storage } from './s3-storage.js';
import { decryptField, encryptField } from './field-encryption.js';

/**
 * Worker entrypoint (SRS ARC 003): an independently operable process that
 * consumes queue jobs. It shares the database and encryption key with the API
 * but exposes no HTTP surface.
 */
async function main(): Promise<void> {
  const config = loadWorkerConfig();
  const db: DatabaseClient = createDatabaseClient({ url: config.databaseUrl, allowPublicKeyRetrieval: process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true' });
  // Configuration has already refused console/none in production, so the
  // fallback sender below can only ever appear in a development transport.
  const mailer: EnquiryMailerPort = config.smtp ? new SmtpEnquiryMailer(config.smtp) : new ConsoleEnquiryMailer();
  const fromAddress = config.mailFromAddress ?? 'no-reply@melbourne-sphere.local';

  const storage = new S3Storage(config.media);

  // One identity per replica, so a run record says which process did the work
  // and a lock can only be released by its holder (SRS TASK 004/005).
  const runnerId = `${process.pid}-${randomBytes(4).toString('hex')}`;
  const schedules = new ScheduleRunner(db, config.redisUrl, runnerId, (line) => process.stdout.write(`${line}\n`), storage);

  const worker = new Worker<DeliveryJobData & MediaJobData & CacheInvalidationJobData & ScheduledTaskJobData>(
    QUEUE_NAME,
    async (job: Job<DeliveryJobData & MediaJobData & CacheInvalidationJobData & ScheduledTaskJobData>) => {
      if (job.name === SCHEDULED_TASK_JOB) return schedules.run(job.data);
      if (job.name === CACHE_INVALIDATE_JOB) return invalidateCache(job.data, { target: config.revalidate });
      if (job.name === MEDIA_PROCESS_JOB) return processMediaAsset(job.data, { db, storage, randomKey: () => randomBytes(12).toString('hex') });
      if (job.name !== ENQUIRY_EMAIL_JOB) throw new Error(`Unknown job ${job.name}`);
      return deliverEnquiry(job.data, {
        db,
        mailer,
        decrypt: (stored, aad) => decryptField(config.fieldEncryptionKey, stored, aad),
        encrypt: (plaintext, aad) => encryptField(config.fieldEncryptionKey, plaintext, aad),
        buildMail: buildEnquiryMail,
        fromAddress,
        siteRecipient: config.siteEnquiryRecipient,
      });
    },
    { connection: redisConnectionFromUrl(config.redisUrl), concurrency: config.concurrency },
  );

  worker.on('completed', (job, result) => {
    process.stdout.write(`[worker] ${job.name} ${job.id} ${String(result)}\n`);
  });
  worker.on('failed', (job, error) => {
    process.stderr.write(`[worker] ${job?.name ?? 'job'} ${job?.id ?? '?'} attempt ${job?.attemptsMade ?? 0} failed: ${error.message}\n`);
    // Attempts exhausted: record a visible failure so an admin can retry (SRS EVT 002).
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1) && job.data?.enquiryId) {
      void markDeliveryFailed(db, job.data.enquiryId, error.message);
    }
  });

  await schedules.start();

  process.stdout.write(`[worker] listening on ${QUEUE_NAME} (transport: ${mailer.describe?.() ?? mailer.transportName}, concurrency: ${config.concurrency})\n`);

  const shutdown = async (signal: string) => {
    process.stdout.write(`[worker] ${signal} received, draining\n`);
    await worker.close();
    await schedules.close();
    mailer.close?.();
    await db.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error: unknown) => {
  process.stderr.write(`[worker] failed to start: ${(error as Error).message}\n`);
  process.exit(1);
});
