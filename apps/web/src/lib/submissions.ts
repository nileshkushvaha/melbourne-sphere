/** Shared rules for the public review form (SRS REV 001, API 003). */
export const REVIEW_LIMITS = {
  name: { min: 2, max: 80 },
  text: { min: 20, max: 3000 },
  email: { max: 254 },
} as const;

export interface ReviewFormValues {
  rating: number | null;
  displayName: string;
  email: string;
  text: string;
  acknowledged: boolean;
}

export type FieldErrors = Record<string, string[]>;

/** Client-side pre-check mirroring the API's rules; the API remains the authority. */
export function validateReviewForm(values: ReviewFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!Number.isInteger(values.rating) || (values.rating ?? 0) < 1 || (values.rating ?? 0) > 5) errors.rating = ['Choose a rating from 1 to 5'];
  const name = values.displayName.trim();
  if (name.length < REVIEW_LIMITS.name.min || name.length > REVIEW_LIMITS.name.max) errors.displayName = [`Name must be ${REVIEW_LIMITS.name.min}–${REVIEW_LIMITS.name.max} characters`];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) || values.email.trim().length > REVIEW_LIMITS.email.max) errors.email = ['Enter a valid email address'];
  const text = values.text.trim();
  if (text.length < REVIEW_LIMITS.text.min || text.length > REVIEW_LIMITS.text.max) errors.text = [`Review must be ${REVIEW_LIMITS.text.min}–${REVIEW_LIMITS.text.max} characters`];
  if (!values.acknowledged) errors.acknowledged = ['Please accept the review guidelines and privacy notice'];
  return errors;
}

/** Idempotency key for one form session; regenerated only after a successful submission (SRS API 003). */
export function newIdempotencyKey(): string {
  return `ms-${Date.now().toString(36)}-${crypto.randomUUID()}`;
}

/**
 * Site contact form (SRS ENQ 002: the general enquiry goes through the same
 * durable pipeline as a business enquiry, with `POST /api/v1/contact`). The
 * topic becomes the enquiry subject, so visitors do not have to invent one and
 * the editors' queue stays sortable.
 */
export const CONTACT_TOPICS = [
  'Add or update a business listing',
  'Correct a published listing',
  'Report a review or comment',
  'Editorial or media enquiry',
  'Something else',
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];

export const CONTACT_LIMITS = {
  name: { min: 2, max: 80 },
  message: { min: 20, max: 5000 },
  email: { max: 254 },
} as const;

export interface ContactFormValues {
  name: string;
  email: string;
  topic: string;
  message: string;
  acknowledged: boolean;
}

/** Client-side pre-check mirroring the API's rules; the API remains the authority. */
export function validateContactForm(values: ContactFormValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  if (name.length < CONTACT_LIMITS.name.min || name.length > CONTACT_LIMITS.name.max) errors.name = [`Name must be ${CONTACT_LIMITS.name.min}–${CONTACT_LIMITS.name.max} characters`];
  const email = values.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > CONTACT_LIMITS.email.max) errors.email = ['Enter a valid email address'];
  if (!(CONTACT_TOPICS as readonly string[]).includes(values.topic)) errors.subject = ['Choose what your message is about'];
  const message = values.message.trim();
  if (message.length < CONTACT_LIMITS.message.min || message.length > CONTACT_LIMITS.message.max)
    errors.message = [`Message must be ${CONTACT_LIMITS.message.min}–${CONTACT_LIMITS.message.max} characters`];
  if (!values.acknowledged) errors.acknowledged = ['Please confirm we may use your details to reply'];
  return errors;
}
