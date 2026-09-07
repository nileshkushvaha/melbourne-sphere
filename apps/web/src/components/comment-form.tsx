'use client';

import { useState } from 'react';
import { Button, Input, Label } from '@melbourne-sphere/ui';
import { newIdempotencyKey, type FieldErrors } from '@/lib/submissions';

interface Values {
  displayName: string;
  email: string;
  text: string;
  acknowledged: boolean;
}

const EMPTY: Values = { displayName: '', email: '', text: '', acknowledged: false };

function validate(values: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (values.displayName.trim().length < 2 || values.displayName.trim().length > 80) errors.displayName = ['Name must be 2–80 characters'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = ['Enter a valid email address'];
  if (values.text.trim().length < 2 || values.text.trim().length > 2000) errors.text = ['Comment must be 2–2000 characters'];
  if (!values.acknowledged) errors.acknowledged = ['Please accept the comment guidelines and privacy notice'];
  return errors;
}

/**
 * Comment form (SRS COM 001). Every comment is moderated before it appears, so
 * the confirmation says exactly that and never shows the comment immediately.
 */
export function CommentForm({ postId, turnstileSiteKey, guidelinesHref }: { postId: string; turnstileSiteKey: string | null; guidelinesHref: string }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  if (!turnstileSiteKey) return <p className="rounded-card border border-border bg-surface-muted p-4 text-sm text-text-muted">Comments are temporarily closed.</p>;

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const fieldError = (key: string) => errors[key]?.[0];

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const data = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/v1/posts/${encodeURIComponent(postId)}/comments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', 'idempotency-key': idempotencyKey },
        body: JSON.stringify({
          displayName: values.displayName.trim(),
          email: values.email.trim(),
          text: values.text.trim(),
          acknowledged: values.acknowledged,
          captchaToken: (data.get('cf-turnstile-response') as string | null) ?? undefined,
          website: (data.get('website') as string | null) || undefined,
        }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: { receiptId: string }; error?: { message: string; fields?: FieldErrors } } | null;
      if (!response.ok) {
        setErrors(payload?.error?.fields ?? {});
        setFormError(payload?.error?.message ?? 'Your comment could not be submitted. Please try again.');
        return;
      }
      setReceipt(payload?.data?.receiptId ?? null);
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
        <p className="mt-1 text-sm text-text-muted">Thank you. A moderator reads every comment before it appears. Your reference is {receipt}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-5">
      <p className="text-sm text-text-muted">Comments are moderated. Your email is never published and is only used to contact you about this comment.</p>
      {formError && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="comment-name">Your name</Label>
          <Input id="comment-name" value={values.displayName} onChange={(e) => set('displayName', e.target.value)} maxLength={80} aria-invalid={Boolean(fieldError('displayName'))} />
          {fieldError('displayName') && <p className="mt-1 text-sm text-danger">{fieldError('displayName')}</p>}
        </div>
        <div>
          <Label htmlFor="comment-email">Email (not published)</Label>
          <Input id="comment-email" type="email" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} maxLength={254} aria-invalid={Boolean(fieldError('email'))} />
          {fieldError('email') && <p className="mt-1 text-sm text-danger">{fieldError('email')}</p>}
        </div>
      </div>
      <div>
        <Label htmlFor="comment-text">Your comment</Label>
        <textarea id="comment-text" rows={4} value={values.text} onChange={(e) => set('text', e.target.value)} maxLength={2000} aria-invalid={Boolean(fieldError('text'))} className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text" />
        {fieldError('text') && <p className="mt-1 text-sm text-danger">{fieldError('text')}</p>}
      </div>
      <div aria-hidden="true" className="hidden">
        <label htmlFor="comment-website">Leave this field empty</label>
        <input id="comment-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={values.acknowledged} onChange={(e) => set('acknowledged', e.target.checked)} className="mt-1 size-4" />
          <span>
            I have read the{' '}
            <a href={guidelinesHref} className="text-link underline-offset-2 hover:underline">
              comment guidelines and privacy notice
            </a>
            .
          </span>
        </label>
        {fieldError('acknowledged') && <p className="mt-1 text-sm text-danger">{fieldError('acknowledged')}</p>}
      </div>
      <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="comment" />
      {fieldError('captchaToken') && <p className="text-sm text-danger">{fieldError('captchaToken')}</p>}
      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Post comment'}
        </Button>
      </div>
    </form>
  );
}
