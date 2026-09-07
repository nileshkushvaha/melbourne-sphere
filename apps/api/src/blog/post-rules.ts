import { toPlainText } from './sanitise.js';

export const POST_STATES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type PostStatus = (typeof POST_STATES)[number];

/** Explicit transitions (SRS BLOG 002); anything else is refused. */
export const POST_TRANSITIONS = {
  publish: { from: ['draft', 'scheduled'] as PostStatus[], to: 'published' as PostStatus },
  schedule: { from: ['draft', 'scheduled'] as PostStatus[], to: 'scheduled' as PostStatus },
  unpublish: { from: ['published', 'scheduled'] as PostStatus[], to: 'draft' as PostStatus },
  archive: { from: ['draft', 'scheduled', 'published'] as PostStatus[], to: 'archived' as PostStatus },
  restore: { from: ['archived'] as PostStatus[], to: 'draft' as PostStatus },
} as const;

export type PostAction = keyof typeof POST_TRANSITIONS;

export const MIN_BODY_CHARACTERS = 200;

export interface PublicationInput {
  title: string;
  slug: string;
  excerpt: string;
  sanitizedBody: string;
  authorActive: boolean;
  categoryActive: boolean;
}

/** Everything BLOG 002 requires before a post may be published or scheduled. */
export function postPublicationBlockers(input: PublicationInput): string[] {
  const blockers: string[] = [];
  if (input.title.trim().length < 3) blockers.push('Title must be at least 3 characters');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) blockers.push('A valid slug is required');
  if (input.excerpt.trim().length < 20) blockers.push('Excerpt must be at least 20 characters');
  if (toPlainText(input.sanitizedBody).length < MIN_BODY_CHARACTERS) blockers.push(`Article body must be at least ${MIN_BODY_CHARACTERS} characters`);
  if (!input.authorActive) blockers.push('An active author is required');
  if (!input.categoryActive) blockers.push('An active category is required');
  return blockers;
}

/** A schedule must be in the future; the API stores UTC while admins choose Melbourne time. */
export function scheduleBlockers(scheduledAt: Date | null, now: Date): string[] {
  if (!scheduledAt) return ['Choose a date and time to publish'];
  if (Number.isNaN(scheduledAt.getTime())) return ['The scheduled time is not a valid date'];
  if (scheduledAt.getTime() <= now.getTime()) return ['The scheduled time must be in the future'];
  return [];
}

/** Related-article ordering (SRS BLOG 004): same category first, then shared tags, stable by id. */
export function relatedScore(candidate: { categoryId: string; tagIds: string[] }, source: { categoryId: string; tagIds: string[] }): number {
  const sameCategory = candidate.categoryId === source.categoryId ? 100 : 0;
  const sharedTags = candidate.tagIds.filter((tag) => source.tagIds.includes(tag)).length;
  return sameCategory + sharedTags;
}
