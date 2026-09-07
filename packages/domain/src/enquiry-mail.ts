/** Building the outbound enquiry message (SRS ENQ 005). */

export interface EnquiryMailInput {
  businessName: string | null;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string | null;
  subject: string;
  message: string;
  receiptId: string;
  submittedAt: Date;
}

export interface OutboundEnquiryMail {
  subject: string;
  replyTo: string;
  text: string;
}

// Control characters are exactly what must be stripped from headers (SRS ENQ 005).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/g;

/** Header injection prevention: CR/LF and other control characters can never reach a header. */
export function sanitiseHeaderValue(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').replace(CONTROL_CHARACTERS, '').replace(/\s{2,}/g, ' ').trim().slice(0, 200);
}

/** A syntactically valid single address, or null. Reply-To is only set after this check (SRS ENQ 005). */
export function safeReplyTo(email: string): string | null {
  const cleaned = sanitiseHeaderValue(email);
  return /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(cleaned) ? cleaned : null;
}

const formatter = new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Melbourne', dateStyle: 'medium', timeStyle: 'short' });

/**
 * Plain-text body only (SRS ENQ 005). Visitor content never reaches a header,
 * and the message is delimited so the recipient can see exactly where
 * visitor-supplied text begins and ends.
 */
export function buildEnquiryMail(input: EnquiryMailInput): OutboundEnquiryMail {
  const subject = sanitiseHeaderValue(`Enquiry: ${input.subject}`);
  const lines = [
    input.businessName ? `A visitor sent an enquiry about ${input.businessName} on Melbourne Sphere.` : 'A visitor sent a general enquiry through Melbourne Sphere.',
    '',
    `Name: ${sanitiseHeaderValue(input.visitorName)}`,
    `Email: ${sanitiseHeaderValue(input.visitorEmail)}`,
    ...(input.visitorPhone ? [`Phone: ${sanitiseHeaderValue(input.visitorPhone)}`] : []),
    `Received: ${formatter.format(input.submittedAt)} (Melbourne time)`,
    `Reference: ${input.receiptId}`,
    '',
    '--- message ---',
    input.message.replace(/\r\n/g, '\n').replace(CONTROL_CHARACTERS, (c) => (c === '\n' ? c : '')).trim(),
    '--- end of message ---',
    '',
    'Reply directly to this email to answer the visitor. Melbourne Sphere does not see your reply.',
  ];
  return { subject, replyTo: safeReplyTo(input.visitorEmail) ?? '', text: lines.join('\n') };
}
