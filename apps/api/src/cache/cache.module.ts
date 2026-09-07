import { Global, Module } from '@nestjs/common';
import { OutboxModule } from '../outbox/outbox.module.js';
import { CacheService } from './cache.service.js';

/** Public read cache and purge recording (SRS CACHE 001-003). */
@Global()
@Module({ imports: [OutboxModule], providers: [CacheService], exports: [CacheService] })
export class CacheModule {}
