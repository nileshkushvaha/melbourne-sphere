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

Reads the same variables as the API (`DATABASE_URL`, `REDIS_URL`, `FIELD_ENCRYPTION_KEY`, `MAIL_TRANSPORT`, `MAIL_FROM_ADDRESS`, `SITE_ENQUIRY_RECIPIENT`, `WORKER_CONCURRENCY`). Startup validation lists every problem at once and **refuses to run in production** with the console transport, without a verified sender, or without an email provider adapter (decision D03 — no provider account exists yet).

## Commands

`pnpm dev:worker` (watch) · `pnpm --filter worker build` · `pnpm --filter worker test` · `pnpm --filter worker lint` · `pnpm --filter worker typecheck`.

Mail composition and queue policy live in `packages/domain` so the API and the worker apply the same rules (SRS ARC 002).
