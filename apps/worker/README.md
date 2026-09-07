# worker — background job runtime

Standalone BullMQ consumer (SRS ARC 003). It has no HTTP surface: it reads jobs from Redis, uses the same MySQL database and field-encryption key as the API, and can be deployed and restarted independently.

## Jobs

| Job | Source | Behaviour |
| --- | --- | --- |
| `enquiry.email` | the API's transactional outbox (`outbox_events`) | Re-reads the enquiry and its listing, suppresses when the listing is no longer published or has lost its recipient, otherwise sends through the mailer port and records the delivery state |

Retries follow the shared policy in `@melbourne-sphere/domain`: five attempts with exponential backoff and jitter, failures left visible. The job id is the outbox event id, so a repeated enqueue is ignored and the consumer tolerates repeats (SRS EVT 002).

## Delivery states

`queued → retrying → providerAccepted` on success; `failed` when a permanent error occurs or the attempts are exhausted; `suppressed` when routing is no longer valid. "Accepted by the provider" is never presented as proof of delivery (SRS ENQ 004).

## Configuration

Reads the same variables as the API (`DATABASE_URL`, `REDIS_URL`, `FIELD_ENCRYPTION_KEY`, `MAIL_TRANSPORT`, `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASSWORD`, `MAIL_FROM_ADDRESS`, `SITE_ENQUIRY_RECIPIENT`, `MEDIA_S3_*`, `WORKER_CONCURRENCY`, `WEB_REVALIDATE_*`). Startup validation lists every problem at once, names variables but never values, and **refuses to run in production** unless `MAIL_TRANSPORT=smtp` with an authenticated, TLS-protected, non-loopback relay and a verified sender.

Transports: `console` prints the message (development only); `smtp` sends through `@melbourne-sphere/mail`, the provider-independent adapter that any relay chosen under decision D03 plugs into. Locally `smtp` points at the Compose Mailpit catcher (inbox at http://127.0.0.1:8025). One attempt per job: the adapter classifies the failure and the queue decides whether to retry. The `Message-ID` is the enquiry's stable id, so a retry after an ambiguous timeout carries the same identifier. Error text stored on the enquiry is redacted of addresses before it is thrown.

## Commands

`pnpm dev:worker` (watch) · `pnpm --filter worker build` · `pnpm --filter worker test` · `pnpm --filter worker lint` · `pnpm --filter worker typecheck`.

Message construction and validation (header injection, address shape, subject and body bounds) live in `@melbourne-sphere/mail`; mail composition and queue policy live in `packages/domain` so the API and the worker apply the same rules (SRS ARC 002).
