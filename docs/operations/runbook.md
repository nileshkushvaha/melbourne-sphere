# Operations runbook

Covers SRS OPS 001–004, BACK 001–002 and MON 001–002. It documents the
procedures the product needs before launch; the accounts, DNS, TLS certificates
and monitoring subscriptions themselves are client decisions (D01–D08) and are
not provisioned from this repository.

## 1. Environments (OPS 001)

| Environment | Purpose | Data | Access |
| --- | --- | --- | --- |
| development | Local work | Seeded fixtures | Developer machine only; Compose stack in `infrastructure/` |
| staging | Pre-release verification | Synthetic or anonymised copies, never production personal data | Access controlled; `noindex` on every page and `Disallow: /` in robots |
| production | The live site | Real data | Least-privilege credentials, separate database, bucket, queue and secrets |

Each environment has its **own** MySQL database, Redis instance, object storage
buckets and secrets. Nothing is shared between them, and no production
credential is ever used from a developer machine.

Region: prefer an Australian region for primary data. Record any cross-border
processing — email delivery, CDN edges, error tracking — in the register below
before launch.

| Provider | Purpose | Data that leaves Australia | Approved by | Date |
| --- | --- | --- | --- | --- |
| _(pending D03)_ | Transactional email | Recipient address and message body | | |
| _(pending)_ | CDN | Public page and media requests | | |
| _(pending)_ | Error tracking | Redacted stack traces and request IDs | | |

## 2. Deployment (OPS 002)

1. CI (`.github/workflows/ci.yml`) installs from the frozen lockfile, lints,
   typechecks, tests, builds, checks the bundle budget and verifies the
   generated contracts match the API.
2. Build immutable images: `docker build -f apps/api/Dockerfile .`, the same for
   `apps/worker` and `apps/web`. Tag each with the commit SHA; never `latest`.
3. Apply migrations **once** per release, from a job — never from application
   startup: `pnpm db:migrate:deploy`.
4. Deploy the API first, then the worker, then the web and admin bundles. The
   API is backward compatible with the previous client build, so a client
   deployed a few minutes later is never broken.
5. Wait for readiness (`GET /api/v1/health/ready`) before shifting traffic; roll
   replicas rather than replacing them all at once.
6. Roll back by redeploying the previous image tag. **A destructive migration
   has no automatic undo**: correct it with a reviewed forward migration, or
   restore from backup (section 4).

## 3. Runtime health (OPS 003)

- **Liveness**: `GET /api/v1/health` — the process is up.
- **Readiness**: `GET /api/v1/health/ready` — MySQL and Redis are reachable.
- **Operational signals**: `GET /api/v1/admin/operations/status` (permission
  `audit.read`) returns queue age, failed events, failed enquiries, scheduled
  publishing lateness, moderation backlog and stuck uploads, each with the
  threshold from MON 002. Counts and ages only — no message content.
- **Graceful shutdown**: the worker drains on SIGTERM (`worker.close()` finishes
  or releases in-flight jobs, then the database pool closes). Give orchestrators
  at least 30 seconds before SIGKILL.
- **Pools**: size `DATABASE_CONNECTION_LIMIT` per replica so that
  `(api replicas + worker replicas) × limit` stays below the server's
  `max_connections` with headroom for migrations and admin sessions.
- **Networking**: MySQL and Redis listen on private networks only, with TLS
  where the provider supports it. Redis runs with AOF persistence and
  `noeviction` — BullMQ requires it, and the outbox stays the recovery source.

## 4. Backups and restore (BACK 001–002)

- **Daily**: `infrastructure/backup/backup-database.sh` writes a gzipped,
  encrypted dump plus a SHA-256 file. Store it where production credentials
  cannot delete it, retain daily points for 30 days.
- **Point in time**: keep binlogs for at least the one-hour RPO. The dump
  records its binlog position (`--source-data=2`).
- **Media**: enable object versioning on the media bucket; replication or backup
  lag must stay under one hour.
- **Secrets**: back up recovery procedures through the managed secret store,
  never as plaintext copies.
- **Drill** (before launch, then quarterly):
  `infrastructure/backup/restore-drill.sh` restores into an isolated
  `*_restore` database and prints row counts, collation checks and the measured
  restore time. Complete the manual steps it lists (privacy deletions, media
  checksums, cache/queue rebuild, outbound mail disabled) and record the result
  in `docs/operations/restore-drills.md`.

## 5. Monitoring and alerting (MON 001–002)

Structured logs carry a request ID on every request and never contain
passwords, tokens, session cookies, private form bodies or full email addresses.

| Alert | Condition | Source |
| --- | --- | --- |
| Site down | Public probe fails for 3 minutes | External uptime check on `/` and `/api/v1/health` |
| Error rate | 5xx above 2% for 5 minutes | Reverse proxy or APM |
| Queue stalled | `oldest_pending_job_age` ≥ 300 s | `/api/v1/admin/operations/status` |
| Purge failed | `failed_events` ≥ 1 | same (investigate immediately, SRS CACHE 002) |
| Delivery failed | `failed_enquiries` ≥ 1 | same |
| Publishing late | `scheduled_publishing_lateness` ≥ 300 s | same |
| Moderation backlog | `moderation_backlog` ≥ 50 | same |
| Media stuck | `stuck_media_age` ≥ 900 s | same |
| Backup stale | Latest backup older than 26 hours | Backup job's own reporting |

On-call ownership, escalation channel and the named responder must be recorded
below before launch — a dashboard without a responder does not satisfy MON 002.

| Role | Name | Contact | Hours |
| --- | --- | --- | --- |
| Primary responder | _(to be recorded)_ | | |
| Escalation | _(to be recorded)_ | | |

## 6. Common procedures

**Rotate the admin bootstrap**: create the additional administrator through the
admin application; never re-run the bootstrap command against a database that
already has an administrator.

**Purge a page immediately**: publication changes enqueue a purge automatically.
To force one, POST to the web tier's `/api/revalidate` with the shared token and
the affected tags.

**Reprocess a stuck upload**: quarantined assets are never publicly reachable.
Confirm the worker is running and object storage credentials are valid, then
re-run the media job; processing is idempotent.

**Retry a failed enquiry**: use the Enquiries queue in the admin. The original
message is stored, so a retry never loses the sender's text.
