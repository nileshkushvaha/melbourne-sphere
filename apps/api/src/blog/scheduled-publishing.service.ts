import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { BlogService } from './blog.service.js';

const SCAN_INTERVAL_MS = 60_000;

/**
 * Periodic catch-up scan for scheduled articles (SRS BLOG 002). Publication
 * itself is idempotent and guarded by the row version, so a scan that overlaps
 * another run, or one that starts after downtime, publishes each due post
 * exactly once and never strands one.
 */
@Injectable()
export class ScheduledPublishingService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledPublishingService.name);
  private timer: ReturnType<typeof setInterval> | undefined;
  private running = false;

  constructor(private readonly blog: BlogService) {}

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === 'test') return; // tests call `runOnce` directly
    this.timer = setInterval(() => void this.runOnce(), SCAN_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  async runOnce(now = new Date()): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const { published, skipped } = await this.blog.publishDueScheduled(now);
      if (published.length > 0) this.logger.log(`published ${published.length} scheduled article(s)${skipped ? `, skipped ${skipped}` : ''}`);
      return published.length;
    } catch (error) {
      this.logger.warn(`scheduled publishing scan failed: ${(error as Error).message}`);
      return 0;
    } finally {
      this.running = false;
    }
  }
}
