/**
 * Outcome classes for one delivery attempt (SRS ENQ 004): the caller decides
 * whether to retry from the class, never from provider-specific strings.
 */

/** Retryable failure: the provider was unreachable, timed out, throttled us or answered 4xx. */
export class TransientMailError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'TransientMailError';
  }
}

/** Permanent failure: the same message can never be accepted (bad address, refused content, bad credentials, invalid headers). */
export class PermanentMailError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'PermanentMailError';
  }
}

const ADDRESS = /[A-Z0-9._%+'-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const ANGLE_ADDRESS = /<[^>\s]+@[^>\s]+>/g;

/**
 * Removes email addresses from text that is going to be logged or stored as a
 * failure reason (SRS MON 001, ENQ 007). SMTP servers echo the recipient in
 * many rejections ("550 5.1.1 <someone@example.com>: user unknown").
 */
export function redactAddresses(text: string): string {
  return text.replace(ANGLE_ADDRESS, '<redacted>').replace(ADDRESS, '[redacted]');
}
