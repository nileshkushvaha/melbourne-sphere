
/** One queue for MVP; job names distinguish the work (SRS ARC 003). */
export const QUEUE_NAME = 'melbourne-sphere';
export const ENQUIRY_EMAIL_JOB = 'enquiry.email';
export const MEDIA_PROCESS_JOB = 'media.process';
export const CACHE_INVALIDATE_JOB = 'cache.invalidate';

export interface JobRetryPolicy {
  attempts: number;
  backoff: { type: 'exponential'; delay: number };
  removeOnComplete: { age: number; count: number };
  removeOnFail: boolean;
}

/** SRS EVT 002: five attempts, exponential backoff with jitter, visible failures. */
export const defaultJobOptions: JobRetryPolicy = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2_000 },
  removeOnComplete: { age: 86_400, count: 1_000 },
  removeOnFail: false,
};

export interface RedisConnection {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest: null;
}

/** BullMQ needs connection parts, not a URL, and requires maxRetriesPerRequest: null. */
export function redisConnectionFromUrl(url: string): RedisConnection {
  const parsed = new URL(url);
  const db = Number(parsed.pathname.replace('/', ''));
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
    ...(Number.isInteger(db) && db > 0 ? { db } : {}),
    maxRetriesPerRequest: null,
  };
}

/** Dispatcher-side backoff with jitter (SRS EVT 002); the queue applies its own per-job backoff. */
export const MAX_DISPATCH_ATTEMPTS = 5;

export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(2 ** attempt * 1_000, 60_000);
  return Math.round(base * (0.5 + random() * 0.5));
}

/**
 * Cache tags shared by the API, the worker and the web tier (SRS CACHE 001).
 * A publication change names the tags it affects; the worker asks the web tier
 * to purge exactly those, so a removal never waits for a TTL to expire.
 */
export const CACHE_TAGS = {
  businesses: 'businesses',
  business: (slug: string) => `business:${slug}`,
  posts: 'posts',
  post: (slug: string) => `post:${slug}`,
  reviews: 'reviews',
  reviewsFor: (businessId: string) => `reviews:${businessId}`,
  comments: 'comments',
  commentsFor: (postId: string) => `comments:${postId}`,
  taxonomy: 'taxonomy',
  settings: 'settings',
  pages: 'pages',
  page: (slug: string) => `page:${slug}`,
  sitemap: 'sitemap',
  redirects: 'redirects',
  // Website content modules (SRS 1.2 section 26). Service alerts render above
  // the header on every public page, so their tag purges the shell.
  faqs: 'faqs',
  alerts: 'alerts',
  testimonials: 'testimonials',
  partners: 'partners',
} as const;

/** Bounded, de-duplicated tag list; the API and worker both enforce it. */
export const MAX_CACHE_TAGS = 20;

export function normaliseCacheTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  for (const tag of tags) {
    const trimmed = String(tag).trim();
    if (trimmed.length > 0 && trimmed.length <= 120) seen.add(trimmed);
    if (seen.size >= MAX_CACHE_TAGS) break;
  }
  return [...seen];
}
