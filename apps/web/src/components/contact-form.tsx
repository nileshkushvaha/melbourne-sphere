'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@melbourne-sphere/ui';
import { CONTACT_LIMITS, CONTACT_TOPICS, newIdempotencyKey, validateContactForm, type ContactFormValues, type FieldErrors } from '@/lib/submissions';

const EMPTY: ContactFormValues = { name: '', email: '', topic: '', message: '', acknowledged: false };

/**
 * Site contact form. It posts to `POST /api/v1/contact`, the same durable
 * pipeline as a business enquiry (SRS ENQ 002/003): the API stores the message
 * transactionally and answers 202, so the confirmation says "received", never
 * "delivered". The topic becomes the enquiry subject.
 *
 * Like every public write it is Turnstile-protected (SEC 002/003). Without a
 * site key the form is not offered at all — the API would refuse the submission
 * anyway, and a form that always fails is worse than an honest notice.
 */
export function ContactForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [values, setValues] = useState<ContactFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  if (!turnstileSiteKey) {
    return (
      <p className="rounded-card-lg border border-border bg-surface-muted p-5 text-sm leading-relaxed text-text-muted">
        Our contact form is temporarily unavailable. Listing corrections and reports can still be sent from the report and correction actions on the listing, review or article itself.
      </p>
    );
  }

  const set = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const fieldError = (key: string) => errors[key]?.[0];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateContactForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'idempotency-key': idempotencyKey },
        body: JSON.stringify({
          name: values.name.trim(),
          email: values.email.trim(),
          subject: values.topic,
          message: values.message.trim(),
          acknowledged: values.acknowledged,
          captchaToken: (data.get('cf-turnstile-response') as string | null) ?? undefined,
          website: (data.get('website') as string | null) || undefined,
        }),
      });
      const body = (await response.json().catch(() => null)) as { data?: { receiptId: string }; error?: { message: string; fields?: FieldErrors } } | null;
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'Your message could not be sent. Please try again.');
        return;
      }
      setReceipt(body?.data?.receiptId ?? null);
      setValues(EMPTY);
      setIdempotencyKey(newIdempotencyKey());
    } catch {
      setFormError('We could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div role="status" className="rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm">
        <p className="font-semibold">Message received</p>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          Thank you — an editor will read it. Your reference is <span className="font-medium text-text">{receipt}</span>. Keep it if you need to follow up.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm sm:p-8">
      {formError && (
        <p role="alert" className="rounded-card border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="contact-name">Your name</Label>
          <Input id="contact-name" value={values.name} onChange={(e) => set('name', e.target.value)} maxLength={CONTACT_LIMITS.name.max} autoComplete="name" aria-invalid={Boolean(fieldError('name'))} aria-describedby={fieldError('name') ? 'contact-name-error' : undefined} />
          {fieldError('name') && (
            <p id="contact-name-error" className="mt-1 text-sm text-danger">
              {fieldError('name')}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="contact-email">Your email</Label>
          <Input id="contact-email" type="email" inputMode="email" autoComplete="email" value={values.email} onChange={(e) => set('email', e.target.value)} maxLength={CONTACT_LIMITS.email.max} aria-invalid={Boolean(fieldError('email'))} aria-describedby={fieldError('email') ? 'contact-email-error' : undefined} />
          {fieldError('email') && (
            <p id="contact-email-error" className="mt-1 text-sm text-danger">
              {fieldError('email')}
            </p>
          )}
        </div>
      </div>
      <div>
        <Label htmlFor="contact-topic">What is your message about?</Label>
        <select
          id="contact-topic"
          value={values.topic}
          onChange={(e) => set('topic', e.target.value)}
          aria-invalid={Boolean(fieldError('subject'))}
          aria-describedby={fieldError('subject') ? 'contact-topic-error' : undefined}
          className="min-h-11 w-full rounded-card border border-border bg-surface px-3 text-base text-text"
        >
          <option value="">Choose a topic</option>
          {CONTACT_TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        {fieldError('subject') && (
          <p id="contact-topic-error" className="mt-1 text-sm text-danger">
            {fieldError('subject')}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor="contact-message">Message</Label>
        <textarea
          id="contact-message"
          rows={6}
          value={values.message}
          onChange={(e) => set('message', e.target.value)}
          maxLength={CONTACT_LIMITS.message.max}
          aria-invalid={Boolean(fieldError('message'))}
          aria-describedby={fieldError('message') ? 'contact-message-error' : 'contact-message-hint'}
          className="w-full rounded-card border border-border bg-surface px-3 py-2 text-base leading-relaxed text-text"
        />
        {fieldError('message') ? (
          <p id="contact-message-error" className="mt-1 text-sm text-danger">
            {fieldError('message')}
          </p>
        ) : (
          <p id="contact-message-hint" className="mt-1 text-sm text-text-muted">
            Include the business name or article title if your message is about one — it saves a reply asking.
          </p>
        )}
      </div>
      {/* Honeypot: hidden from people, tempting to bots (SRS SEC 003). */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label className="flex items-start gap-2.5 text-sm leading-relaxed">
          <input type="checkbox" checked={values.acknowledged} onChange={(e) => set('acknowledged', e.target.checked)} className="mt-1 size-4 shrink-0" aria-invalid={Boolean(fieldError('acknowledged'))} />
          <span>I understand my name, email address and message are stored and used by the Melbourne Sphere editors to answer this enquiry.</span>
        </label>
        {fieldError('acknowledged') && <p className="mt-1 text-sm text-danger">{fieldError('acknowledged')}</p>}
      </div>
      <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="contact" />
      {fieldError('captchaToken') && <p className="text-sm text-danger">{fieldError('captchaToken')}</p>}
      <div>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}
