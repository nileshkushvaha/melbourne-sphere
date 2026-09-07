import { postPublicationBlockers, relatedScore, scheduleBlockers, POST_TRANSITIONS } from './post-rules.js';
import { renderSanitisedBody } from './sanitise.js';

const body = renderSanitisedBody('Some article body. '.repeat(20));

describe('post publication rules (SRS BLOG 002)', () => {
  it('accepts a complete post', () => {
    expect(postPublicationBlockers({ title: 'Melbourne laneway cafes', slug: 'melbourne-laneway-cafes', excerpt: 'A guide to the best laneway cafes.', sanitizedBody: body, authorActive: true, categoryActive: true })).toEqual([]);
  });

  it('lists every unmet requirement', () => {
    expect(
      postPublicationBlockers({ title: 'Hi', slug: 'Not A Slug', excerpt: 'short', sanitizedBody: renderSanitisedBody('tiny'), authorActive: false, categoryActive: false }),
    ).toEqual([
      'Title must be at least 3 characters',
      'A valid slug is required',
      'Excerpt must be at least 20 characters',
      'Article body must be at least 200 characters',
      'An active author is required',
      'An active category is required',
    ]);
  });

  it('requires a future schedule', () => {
    const now = new Date('2026-09-06T00:00:00Z');
    expect(scheduleBlockers(new Date('2026-09-07T00:00:00Z'), now)).toEqual([]);
    expect(scheduleBlockers(new Date('2026-09-05T00:00:00Z'), now)).toEqual(['The scheduled time must be in the future']);
    expect(scheduleBlockers(null, now)).toEqual(['Choose a date and time to publish']);
    expect(scheduleBlockers(new Date('nonsense'), now)).toEqual(['The scheduled time is not a valid date']);
  });

  it('defines only the documented transitions', () => {
    expect(POST_TRANSITIONS.publish.from).toEqual(['draft', 'scheduled']);
    expect(POST_TRANSITIONS.unpublish.to).toBe('draft');
    expect(POST_TRANSITIONS.restore.from).toEqual(['archived']);
  });

  it('ranks related articles by category first, then shared tags', () => {
    const source = { categoryId: 'c1', tagIds: ['t1', 't2'] };
    expect(relatedScore({ categoryId: 'c1', tagIds: ['t1'] }, source)).toBe(101);
    expect(relatedScore({ categoryId: 'c1', tagIds: [] }, source)).toBe(100);
    expect(relatedScore({ categoryId: 'c2', tagIds: ['t1', 't2'] }, source)).toBe(2);
    expect(relatedScore({ categoryId: 'c2', tagIds: [] }, source)).toBe(0);
  });
});
