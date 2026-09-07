'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@melbourne-sphere/ui';
import { newIdempotencyKey, validateReviewForm, type FieldErrors, type ReviewFormValues } from '@/lib/submissions';

interface Props {
  businessId: string;
  businessName: string;
  /** Cloudflare Turnstile site key; without it the API cannot verify submissions, so the form is not offered. */
  turnstileSiteKey: string | null;
  guidelinesHref: string;
}

const EMPTY: ReviewFormValues = { rating: null, displayName: '', email: '', text: '', acknowledged: false };

/**
 * Public review form (SRS REV 001–002). Submissions are always moderated; the
 * response is a neutral receipt. A failed request keeps everything the visitor
 * typed (SRS API 004) and the idempotency key is reused until one succeeds.
 */
export function ReviewForm({ businessId, businessName, turnstileSiteKey, guidelinesHref }: Props) {
  const [values, setValues] = useState<ReviewFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  if (!turnstileSiteKey) {
    return (
      <p className="rounded-card border border-border bg-surface-muted p-4 text-sm text-text-muted">
        Review submissions are temporarily closed. Please check back soon.
      </p>
    );
  }

  const set = <K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateReviewForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const form = event.currentTarget;
    const captchaToken = (new FormData(form).get('cf-turnstile-response') as string | null) ?? undefined;
    const honeypot = (new FormData(form).get('website') as string | null) ?? '';
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/businesses/${encodeURIComponent(businessId)}/reviews`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'idempotency-key': idempotencyKey },
        body: JSON.stringify({ rating: values.rating, displayName: values.displayName.trim(), email: values.email.trim(), text: values.text.trim(), acknowledged: values.acknowledged, captchaToken, website: honeypot || undefined }),
      });
      const body = (await response.json().catch(() => null)) as { data?: { receiptId: string; message: string }; error?: { message: string; fields?: FieldErrors } } | null;
      if (!response.ok) {
        setErrors(body?.error?.fields ?? {});
        setFormError(body?.error?.message ?? 'Your review could not be submitted. Please try again.');
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
      <div role="status" className="rounded-card border border-border bg-surface-raised p-5">
        <p className="font-semibold">Submitted for moderation</p>
        <p className="mt-1 text-sm text-text-muted">Thank you. Our moderators review every review before it appears. Your reference is {receipt}.</p>
      </div>
    );
  }

  const fieldError = (key: string) => errors[key]?.[0];

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-5">
      <p className="text-sm text-text-muted">Reviews are moderated before publication. Your email is used only to contact you about this review and is never published.</p>
      {formError && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-text">Your rating</legend>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${values.rating === value ? 'border-sky-600 bg-sky-100 font-semibold' : 'border-border'}`}>
              <input type="radio" name="rating" value={value} checked={values.rating === value} onChange={() => set('rating', value)} className="size-4" />
              {value} star{value === 1 ? '' : 's'}
            </label>
          ))}
        </div>
        {fieldError('rating') && <p className="mt-1 text-sm text-danger">{fieldError('rating')}</p>}
      </fieldset>
      <div>
        <Label htmlFor="review-name">Display name</Label>
        <Input id="review-name" name="displayName" value={values.displayName} onChange={(e) => set('displayName', e.target.value)} maxLength={80} aria-invalid={Boolean(fieldError('displayName'))} aria-describedby={fieldError('displayName') ? 'review-name-error' : undefined} />
        {fieldError('displayName') && <p id="review-name-error" className="mt-1 text-sm text-danger">{fieldError('displayName')}</p>}
      </div>
      <div>
        <Label htmlFor="review-email">Email (not published)</Label>
        <Input id="review-email" name="email" type="email" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} maxLength={254} aria-invalid={Boolean(fieldError('email'))} aria-describedby={fieldError('email') ? 'review-email-error' : undefined} />
        {fieldError('email') && <p id="review-email-error" className="mt-1 text-sm text-danger">{fieldError('email')}</p>}
      </div>
      <div>
        <Label htmlFor="review-text">Your review of {businessName}</Label>
        <textarea id="review-text" name="text" rows={5} value={values.text} onChange={(e) => set('text', e.target.value)} maxLength={3000} aria-invalid={Boolean(fieldError('text'))} aria-describedby={fieldError('text') ? 'review-text-error' : undefined} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text" />
        {fieldError('text') && <p id="review-text-error" className="mt-1 text-sm text-danger">{fieldError('text')}</p>}
      </div>
      {/* Honeypot: hidden from people, tempting to bots (SRS SEC 002 supplement). */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor="review-website">Leave this field empty</label>
        <input id="review-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acknowledged" checked={values.acknowledged} onChange={(e) => set('acknowledged', e.target.checked)} className="mt-1 size-4" aria-describedby={fieldError('acknowledged') ? 'review-ack-error' : undefined} />
          <span>
            I have read the{' '}
            <a href={guidelinesHref} className="text-link underline-offset-2 hover:underline">
              review guidelines and privacy notice
            </a>
            , and this review is my own experience.
          </span>
        </label>
        {fieldError('acknowledged') && <p id="review-ack-error" className="mt-1 text-sm text-danger">{fieldError('acknowledged')}</p>}
      </div>
      <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="review" />
      {fieldError('captchaToken') && <p className="text-sm text-danger">{fieldError('captchaToken')}</p>}
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}
