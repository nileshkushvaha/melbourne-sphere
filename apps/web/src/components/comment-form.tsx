'use client';

import { useId, useRef, useState } from 'react';
import { Button, Input, Label } from '@melbourne-sphere/ui';
import { COMMENT_LIMITS, newIdempotencyKey, submissionFailureMessage, validateCommentForm, type CommentFormValues, type FieldErrors } from '@/lib/submissions';

const EMPTY: CommentFormValues = { displayName: '', email: '', text: '', acknowledged: false };

interface Props {
  postId: string;
  turnstileSiteKey: string | null;
  /** Linked only once an editor has published the page, so the form never points at a 404. */
  guidelinesHref: string | null;
  privacyHref: string | null;
}

function Required() {
  return (
    <span className="ml-0.5 text-danger" aria-hidden="true">
      *
    </span>
  );
}

/**
 * Comment form (SRS COM 001). Every comment is moderated before it appears, so
 * the confirmation says exactly that and never shows the comment as published.
 *
 * The client check mirrors the API's rules to save a round trip; the API remains
 * the authority, and the field errors it returns replace whatever this form
 * decided. Nothing here relaxes validation, the honeypot, the captcha or the
 * acknowledgement — the box is never pre-ticked.
 */
export function CommentForm({ postId, turnstileSiteKey, guidelinesHref, privacyHref }: Props) {
  const [values, setValues] = useState<CommentFormValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());
  const alertRef = useRef<HTMLParagraphElement | null>(null);
  // One prefix per instance, so ids stay unique if a page ever shows two forms.
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  if (!turnstileSiteKey) {
    return (
      <p className="rounded-card border border-border bg-surface-muted p-4 text-sm text-text-muted">
        Comments are temporarily closed. Please try again later.
      </p>
    );
  }

  const set = <K extends keyof CommentFormValues>(key: K, value: CommentFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const fieldError = (key: string) => errors[key]?.[0];
  /**
   * Ties a control to its message and marks it invalid, so the error is
   * announced with the field it belongs to (WCAG 3.3.1). `domName` names the
   * element; `errorKey` is the API's own field name, which is not always the
   * same word.
   */
  const field = (domName: string, errorKey: string): { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string } => {
    const invalid = Boolean(fieldError(errorKey));
    return { id: id(domName), ...(invalid ? { 'aria-invalid': true, 'aria-describedby': `${id(domName)}-error` } : {}) };
  };

  const failWith = (message: string, fields: FieldErrors = {}) => {
    setErrors(fields);
    setFormError(message);
    // Move the reader to the explanation rather than leaving them at a button
    // that appears to have done nothing.
    requestAnimationFrame(() => alertRef.current?.focus());
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // A second press while a request is in flight must not create a second
    // comment; the button is disabled and the handler refuses as well.
    if (submitting) return;
    setFormError(null);
    const found = validateCommentForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      failWith('Please check the highlighted fields and try again.', found);
      return;
    }
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
      const payload = (await response.json().catch(() => null)) as { data?: { receiptId: string }; error?: { code?: string; fields?: FieldErrors } } | null;
      if (!response.ok) {
        failWith(submissionFailureMessage(response.status, payload?.error?.code), payload?.error?.fields ?? {});
        return;
      }
      setReceipt(payload?.data?.receiptId ?? null);
      setValues(EMPTY);
      setErrors({});
      setIdempotencyKey(newIdempotencyKey());
    } catch {
      failWith(submissionFailureMessage(0));
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div role="status" className="rounded-card border border-success/30 bg-success/5 p-5">
        <p className="font-semibold">Thanks — your comment has been submitted for review.</p>
        <p className="mt-1.5 text-sm text-text-muted">A moderator reads every comment before it appears, so it will not show on the page straight away. Your reference is {receipt}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-card border border-border bg-surface-raised p-5 sm:p-6">
      {formError && (
        <p ref={alertRef} tabIndex={-1} role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor={id('name')}>
            Your name<Required />
          </Label>
          <Input {...field('name', 'displayName')} value={values.displayName} onChange={(e) => set('displayName', e.target.value)} maxLength={COMMENT_LIMITS.name.max} autoComplete="name" required />
          {fieldError('displayName') && (
            <p id={`${id('name')}-error`} className="mt-1.5 text-sm text-danger">
              {fieldError('displayName')}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor={id('email')}>
            Email<Required />
          </Label>
          <Input {...field('email', 'email')} value={values.email} onChange={(e) => set('email', e.target.value)} type="email" inputMode="email" maxLength={COMMENT_LIMITS.email.max} autoComplete="email" required />
          <p className="mt-1.5 text-xs text-text-muted">Never published. Used only to contact you about this comment.</p>
          {fieldError('email') && (
            <p id={`${id('email')}-error`} className="mt-1.5 text-sm text-danger">
              {fieldError('email')}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor={id('text')}>
          Your comment<Required />
        </Label>
        <textarea
          {...field('text', 'text')}
          value={values.text}
          onChange={(e) => set('text', e.target.value)}
          rows={6}
          maxLength={COMMENT_LIMITS.text.max}
          required
          className="min-h-40 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-base leading-relaxed text-text transition-colors placeholder:text-text-muted focus-visible:border-sky-600"
        />
        {fieldError('text') && (
          <p id={`${id('text')}-error`} className="mt-1.5 text-sm text-danger">
            {fieldError('text')}
          </p>
        )}
      </div>

      <div aria-hidden="true" className="hidden">
        <label htmlFor={id('website')}>Leave this field empty</label>
        <input id={id('website')} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div>
        <label htmlFor={id('consent')} className="flex items-start gap-2.5 text-sm leading-relaxed">
          <input
            id={id('consent')}
            type="checkbox"
            checked={values.acknowledged}
            onChange={(e) => set('acknowledged', e.target.checked)}
            aria-invalid={fieldError('acknowledged') ? true : undefined}
            aria-describedby={fieldError('acknowledged') ? `${id('consent')}-error` : undefined}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            I have read the{' '}
            {guidelinesHref ? (
              <a href={guidelinesHref} className="text-link underline underline-offset-2">
                comment guidelines
              </a>
            ) : (
              'comment guidelines'
            )}{' '}
            and{' '}
            {privacyHref ? (
              <a href={privacyHref} className="text-link underline underline-offset-2">
                privacy notice
              </a>
            ) : (
              'privacy notice'
            )}
            .
          </span>
        </label>
        {fieldError('acknowledged') && (
          <p id={`${id('consent')}-error`} className="mt-1.5 text-sm text-danger">
            {fieldError('acknowledged')}
          </p>
        )}
      </div>

      <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="comment" />
      {fieldError('captchaToken') && <p className="text-sm text-danger">{fieldError('captchaToken')}</p>}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Posting…' : 'Post comment'}
        </Button>
        <p className="text-xs text-text-muted">Comments are moderated before publication.</p>
      </div>
    </form>
  );
}
