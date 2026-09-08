import type { DatabaseClient } from '@melbourne-sphere/database';
import { maskEmail } from '@melbourne-sphere/mail';
import { EnquiryMailerPort, PermanentDeliveryError, TransientDeliveryError } from './mailer/mailer.port.js';

export interface DeliveryJobData {
  eventId: string;
  enquiryId: string;
  businessId?: string | null;
  kind?: string;
}

export interface DeliveryDeps {
  db: DatabaseClient;
  mailer: EnquiryMailerPort;
  decrypt: (stored: string, aad: string) => string;
  /** Encrypts the recipient for the delivery record (SRS 1.2 MAIL 005). */
  encrypt: (plaintext: string, aad: string) => string;
  buildMail: (input: BuildMailInput) => { subject: string; replyTo: string; text: string };
  fromAddress: string;
  siteRecipient: string | undefined;
  now?: () => Date;
}

export interface BuildMailInput {
  businessName: string | null;
  visitorName: string;
  visitorEmail: string;
  visitorPhone: string | null;
  subject: string;
  message: string;
  receiptId: string;
  submittedAt: Date;
}

export type DeliveryOutcome = 'delivered' | 'suppressed' | 'skipped';

/**
 * Delivers one accepted enquiry (SRS ENQ 004\u2013006). The recipient is resolved
 * at dispatch time from the current listing, so a listing that was unpublished
 * or lost its recipient is suppressed with a reason instead of being emailed.
 * A transient provider failure is rethrown so BullMQ retries it.
 */
export async function deliverEnquiry(data: DeliveryJobData, deps: DeliveryDeps): Promise<DeliveryOutcome> {
  const now = deps.now ?? (() => new Date());
  const enquiry = await deps.db.enquiry.findUnique({
    where: { id: data.enquiryId },
    include: { business: { select: { id: true, name: true, status: true, privateEnquiryEmailEncrypted: true } } },
  });
  if (!enquiry) return 'skipped';
  // Consumers tolerate repeats (SRS EVT 002): an already-delivered enquiry is a no-op.
  if (enquiry.deliveryStatus === 'providerAccepted' || enquiry.deliveryStatus === 'delivered') return 'skipped';

  const suppress = async (reason: string): Promise<DeliveryOutcome> => {
    await deps.db.enquiry.update({ where: { id: enquiry.id }, data: { deliveryStatus: 'suppressed', suppressionReason: reason, deliveryAttempts: { increment: 1 } } });
    return 'suppressed';
  };

  let recipient: string | null = null;
  if (enquiry.businessId) {
    const business = enquiry.business;
    if (!business || business.status !== 'published') return suppress('The listing is no longer published');
    if (!business.privateEnquiryEmailEncrypted) return suppress('The listing no longer has an enquiry recipient');
    recipient = deps.decrypt(business.privateEnquiryEmailEncrypted, business.id);
  } else {
    if (!deps.siteRecipient) return suppress('No site enquiry recipient is configured');
    recipient = deps.siteRecipient;
  }

  const mail = deps.buildMail({
    businessName: enquiry.business?.name ?? null,
    visitorName: enquiry.name,
    visitorEmail: deps.decrypt(enquiry.emailEncrypted, 'enquiry'),
    visitorPhone: enquiry.phoneEncrypted ? deps.decrypt(enquiry.phoneEncrypted, 'enquiry') : null,
    subject: enquiry.subject,
    message: enquiry.message,
    receiptId: enquiry.id.slice(-12),
    submittedAt: enquiry.createdAt,
  });

  await deps.db.enquiry.update({ where: { id: enquiry.id }, data: { deliveryStatus: 'retrying', deliveryAttempts: { increment: 1 } } });

  // The operational delivery log (SRS 1.2 MAIL 005). The enquiry keeps its own
  // domain state above; this row is what the admin log lists and what a
  // provider bounce or complaint event is matched back to. A log write must
  // never stop an accepted enquiry from being delivered, so it is best-effort.
  const delivery = await deps.db.emailDelivery
    .create({
      data: {
        provider: deps.mailer.transportName.slice(0, 20),
        templateKey: enquiry.businessId ? 'enquiry.business' : 'enquiry.site_contact',
        category: 'enquiry',
        recipientMasked: maskEmail(recipient),
        recipientEncrypted: deps.encrypt(recipient, 'email_delivery'),
        // The subject is written by a member of the public, so it is not kept.
        subject: null,
        relatedType: 'enquiry',
        relatedId: enquiry.id,
        status: 'queued',
      },
    })
    .catch(() => null);

  try {
    const result = await deps.mailer.send({
      to: recipient,
      from: deps.fromAddress,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      subject: mail.subject,
      text: mail.text,
      // Stable across retries so a provider with idempotency support deduplicates.
      messageId: `${enquiry.id}@melbourne-sphere`,
    });
    await deps.db.enquiry.update({
      where: { id: enquiry.id },
      data: { deliveryStatus: 'providerAccepted', providerMessageId: result.providerMessageId, lastError: null, deliveredAt: now() },
    });
    if (delivery) {
      // Accepted, not delivered: only a provider event may claim delivery (MAIL 008).
      await deps.db.emailDelivery
        .update({ where: { id: delivery.id }, data: { status: 'sent', sentAt: now(), attempts: { increment: 1 }, providerMessageId: result.providerMessageId } })
        .catch(() => undefined);
    }
    return 'delivered';
  } catch (error) {
    const permanent = error instanceof PermanentDeliveryError;
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Delivery failed';
    await deps.db.enquiry.update({ where: { id: enquiry.id }, data: { deliveryStatus: permanent ? 'failed' : 'retrying', lastError: message } });
    if (delivery) {
      await deps.db.emailDelivery
        .update({
          where: { id: delivery.id },
          data: {
            status: 'failed',
            failedAt: now(),
            attempts: { increment: 1 },
            failureCode: permanent ? 'permanent_provider' : 'transient_provider',
            // Already redacted by the transport; bounded again here (MAIL 006).
            failureSummary: message.slice(0, 300),
          },
        })
        .catch(() => undefined);
    }
    if (permanent) return 'skipped';
    throw error instanceof TransientDeliveryError ? error : new TransientDeliveryError(message, error);
  }
}

/** Marks an enquiry failed once BullMQ has exhausted its attempts (SRS EVT 002 visible failure). */
export async function markDeliveryFailed(db: DatabaseClient, enquiryId: string, error: string): Promise<void> {
  await db.enquiry.updateMany({ where: { id: enquiryId, deliveryStatus: { in: ['queued', 'retrying'] } }, data: { deliveryStatus: 'failed', lastError: error.slice(0, 500) } });
}
