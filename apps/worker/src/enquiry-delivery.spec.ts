import { deliverEnquiry, markDeliveryFailed, type DeliveryDeps } from './enquiry-delivery.js';
import { EnquiryMailerPort, PermanentDeliveryError, TransientDeliveryError, type DeliveryResult, type OutboundEnquiryMessage } from './mailer/mailer.port.js';

class RecordingMailer extends EnquiryMailerPort {
  readonly transportName = 'test';
  sent: OutboundEnquiryMessage[] = [];
  failWith: Error | null = null;
  async send(message: OutboundEnquiryMessage): Promise<DeliveryResult> {
    if (this.failWith) throw this.failWith;
    this.sent.push(message);
    return { providerMessageId: 'provider-1' };
  }
}

type TestEnquiry = {
  id: string;
  businessId: string | null;
  name: string;
  emailEncrypted: string;
  phoneEncrypted: string | null;
  subject: string;
  message: string;
  deliveryStatus: string;
  createdAt: Date;
  business: { id: string; name: string; status: string; privateEnquiryEmailEncrypted: string | null } | null;
};

const baseEnquiry: TestEnquiry = {
  id: 'enq-1234567890abc',
  businessId: 'biz-1',
  name: 'Jo Visitor',
  emailEncrypted: 'enc:jo@example.com',
  phoneEncrypted: null,
  subject: 'Catering',
  message: 'Do you cater for office breakfasts? We need about twenty serves.',
  deliveryStatus: 'queued',
  createdAt: new Date('2026-09-06T02:30:00Z'),
  business: { id: 'biz-1', name: 'Carlton Corner Bakery', status: 'published', privateEnquiryEmailEncrypted: 'enc:owner@example.com' },
};

function deps(overrides: Partial<TestEnquiry> & { mailer?: RecordingMailer } = {}) {
  const { mailer = new RecordingMailer(), ...enquiryOverrides } = overrides;
  const enquiry = { ...baseEnquiry, ...enquiryOverrides };
  const updates: Record<string, unknown>[] = [];
  const db = {
    enquiry: {
      findUnique: async () => (enquiryOverrides.id === null ? null : enquiry),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return enquiry;
      },
      updateMany: async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { count: 1 };
      },
    },
  };
  const built = { subject: 'Enquiry: Catering', replyTo: 'jo@example.com', text: 'body' };
  const dependencies = {
    db: db as never,
    mailer,
    decrypt: (stored: string) => stored.replace('enc:', ''),
    buildMail: () => built,
    fromAddress: 'no-reply@melbournesphere.example',
    siteRecipient: 'site@melbournesphere.example',
    now: () => new Date('2026-09-06T03:00:00Z'),
  } satisfies DeliveryDeps;
  return { dependencies, updates, mailer, db: db as never };
}

describe('enquiry delivery (SRS ENQ 004–006)', () => {
  it('sends to the listing recipient with the visitor address only as Reply-To', async () => {
    const { dependencies, updates, mailer } = deps();
    expect(await deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, dependencies)).toBe('delivered');
    expect(mailer.sent[0]).toMatchObject({ to: 'owner@example.com', from: 'no-reply@melbournesphere.example', replyTo: 'jo@example.com', messageId: 'enq-1234567890abc@melbourne-sphere' });
    expect(updates.at(-1)).toMatchObject({ deliveryStatus: 'providerAccepted', providerMessageId: 'provider-1' });
  });

  it('is a no-op for an enquiry that was already accepted by the provider', async () => {
    const { dependencies, mailer } = deps({ deliveryStatus: 'providerAccepted' });
    expect(await deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, dependencies)).toBe('skipped');
    expect(mailer.sent).toHaveLength(0);
  });

  it('suppresses instead of sending when the listing is unpublished or has no recipient', async () => {
    const unpublished = deps({ business: { ...baseEnquiry.business!, status: 'draft' } });
    expect(await deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, unpublished.dependencies)).toBe('suppressed');
    expect(unpublished.updates.at(-1)).toMatchObject({ deliveryStatus: 'suppressed', suppressionReason: 'The listing is no longer published' });
    expect(unpublished.mailer.sent).toHaveLength(0);

    const noRecipient = deps({ business: { ...baseEnquiry.business!, privateEnquiryEmailEncrypted: null } });
    expect(await deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, noRecipient.dependencies)).toBe('suppressed');
    expect(noRecipient.updates.at(-1)).toMatchObject({ suppressionReason: 'The listing no longer has an enquiry recipient' });
  });

  it('routes a site enquiry to the configured recipient and suppresses when none is set', async () => {
    const site = deps({ businessId: null, business: null });
    expect(await deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, site.dependencies)).toBe('delivered');
    expect(site.mailer.sent[0]?.to).toBe('site@melbournesphere.example');

    const none = deps({ businessId: null, business: null });
    expect(await deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, { ...none.dependencies, siteRecipient: undefined })).toBe('suppressed');
  });

  it('rethrows transient failures for retry and records permanent ones as failed', async () => {
    const transient = deps();
    transient.mailer.failWith = new TransientDeliveryError('provider 503');
    await expect(deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, transient.dependencies)).rejects.toBeInstanceOf(TransientDeliveryError);
    expect(transient.updates.at(-1)).toMatchObject({ deliveryStatus: 'retrying', lastError: 'provider 503' });

    const permanent = deps();
    permanent.mailer.failWith = new PermanentDeliveryError('invalid recipient');
    expect(await deliverEnquiry({ eventId: 'e1', enquiryId: 'enq-1234567890abc' }, permanent.dependencies)).toBe('skipped');
    expect(permanent.updates.at(-1)).toMatchObject({ deliveryStatus: 'failed', lastError: 'invalid recipient' });
  });

  it('marks exhausted deliveries failed', async () => {
    const { db, updates } = deps();
    await markDeliveryFailed(db, 'enq-1234567890abc', 'attempts exhausted');
    expect(updates.at(-1)).toMatchObject({ deliveryStatus: 'failed', lastError: 'attempts exhausted' });
  });
});
