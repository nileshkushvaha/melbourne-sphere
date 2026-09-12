import { describe, expect, it } from 'vitest';
import { submissionFailureMessage, validateCommentForm, validateContactForm, validateReviewForm, type CommentFormValues, type ContactFormValues, type ReviewFormValues } from './submissions';

const valid: ReviewFormValues = {
  rating: 5,
  displayName: 'Jo Visitor',
  email: 'jo@example.com',
  text: 'Excellent coffee and friendly staff every single morning this month.',
  acknowledged: true,
};

describe('review form validation', () => {
  it('accepts a complete submission', () => {
    expect(validateReviewForm(valid)).toEqual({});
  });

  it('reports each rule with its own field', () => {
    const errors = validateReviewForm({ rating: 0, displayName: 'A', email: 'nope', text: 'too short', acknowledged: false });
    expect(Object.keys(errors).sort()).toEqual(['acknowledged', 'displayName', 'email', 'rating', 'text']);
    expect(validateReviewForm({ ...valid, rating: 6 }).rating).toBeDefined();
    expect(validateReviewForm({ ...valid, rating: null }).rating).toBeDefined();
    expect(validateReviewForm({ ...valid, displayName: 'x'.repeat(81) }).displayName).toBeDefined();
    expect(validateReviewForm({ ...valid, text: 'x'.repeat(3001) }).text).toBeDefined();
  });
});

describe('validateContactForm', () => {
  const valid: ContactFormValues = {
    name: 'Sam Taylor',
    email: 'sam@example.com',
    topic: 'Correct a published listing',
    message: 'The opening hours for the Carlton bakery are wrong on Sundays.',
    acknowledged: true,
  };

  it('accepts a complete message', () => {
    expect(validateContactForm(valid)).toEqual({});
  });

  it('rejects a topic that is not one of the offered options, so the queue subject is always known', () => {
    expect(validateContactForm({ ...valid, topic: 'anything I like' }).subject).toEqual(['Choose what your message is about']);
  });

  it.each([
    ['name', { ...valid, name: 'A' }],
    ['email', { ...valid, email: 'not-an-email' }],
    ['message', { ...valid, message: 'too short' }],
    ['acknowledged', { ...valid, acknowledged: false }],
  ])('rejects a bad %s', (field, values) => {
    expect(Object.keys(validateContactForm(values))).toContain(field);
  });

  it('measures the trimmed message, so whitespace cannot satisfy the minimum', () => {
    expect(validateContactForm({ ...valid, message: `   ${' '.repeat(40)}   ` }).message).toBeDefined();
  });
});

describe('validateCommentForm (SRS COM 001)', () => {
  const valid: CommentFormValues = { displayName: 'Dev Reader', email: 'reader@example.com', text: 'A useful thought about this article.', acknowledged: true };

  it('accepts a complete comment', () => {
    expect(validateCommentForm(valid)).toEqual({});
  });

  it('tells a visitor what to do rather than restating a constraint', () => {
    expect(validateCommentForm({ ...valid, displayName: '  ' }).displayName).toEqual(['Enter your name.']);
    expect(validateCommentForm({ ...valid, email: '' }).email).toEqual(['Enter your email address.']);
    expect(validateCommentForm({ ...valid, email: 'not-an-email' }).email).toEqual(['Enter a valid email address.']);
    expect(validateCommentForm({ ...valid, text: '   ' }).text).toEqual(['Write a comment before submitting.']);
  });

  it('separates an empty field from one that is merely too short', () => {
    expect(validateCommentForm({ ...valid, displayName: 'A' }).displayName?.[0]).toMatch(/at least/);
    expect(validateCommentForm({ ...valid, text: 'a' }).text).toEqual(['Your comment is too short.']);
  });

  it('refuses the API maximums, so an over-long field fails here rather than at the server', () => {
    expect(validateCommentForm({ ...valid, displayName: 'n'.repeat(81) }).displayName).toBeDefined();
    expect(validateCommentForm({ ...valid, text: 't'.repeat(2001) }).text).toBeDefined();
  });

  it('requires the acknowledgement, which is never assumed', () => {
    expect(validateCommentForm({ ...valid, acknowledged: false }).acknowledged).toBeDefined();
  });
});

describe('submissionFailureMessage (SRS API 002)', () => {
  it('names rate limiting as something to wait out', () => {
    expect(submissionFailureMessage(429, 'RATE_LIMITED')).toMatch(/too quickly/i);
  });

  it('distinguishes a network failure, a closed service, a validation failure and a server fault', () => {
    expect(submissionFailureMessage(0)).toMatch(/could not reach the server/i);
    expect(submissionFailureMessage(503)).toMatch(/temporarily unavailable/i);
    expect(submissionFailureMessage(422)).toMatch(/highlighted fields/i);
    expect(submissionFailureMessage(500)).toMatch(/at our end/i);
  });

  it('falls back to a safe sentence for a status it does not recognise', () => {
    expect(submissionFailureMessage(418)).toBe('Your comment could not be submitted. Please try again.');
  });

  it('never returns an empty message, whatever the status', () => {
    for (const status of [0, 400, 401, 403, 404, 409, 413, 422, 429, 500, 502, 503]) {
      expect(submissionFailureMessage(status).length).toBeGreaterThan(10);
    }
  });
});
