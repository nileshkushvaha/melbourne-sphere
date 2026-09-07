import { describe, expect, it } from 'vitest';
import { validateContactForm, validateReviewForm, type ContactFormValues, type ReviewFormValues } from './submissions';

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
