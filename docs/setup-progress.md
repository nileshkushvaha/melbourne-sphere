# Melbourne Sphere — Setup Progress

Source of truth: `docs/Melbourne_Sphere_Technical_SRS_v1.md` (SRS v1). This Markdown file is the repository's working requirements reference. It was converted from a Word document that is **not present in the repository** and is not synchronised with the Markdown automatically; if the Word file is edited elsewhere, the Markdown must be re-exported deliberately. (A word-level comparison on 2026-09-05, against text extracted from the Word file while it was still present, found the two substantively identical apart from a table of contents, angle-bracketed URLs and straight quotes.)
Architecture: pnpm monorepo; `apps/web` (Next.js), `apps/api` (NestJS), `apps/admin` (Refine, later), `apps/worker` (BullMQ, later); Prisma + MySQL; Redis; S3-compatible storage.

## Verified toolchain

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 24.19.0 | pinned in `.nvmrc`; root `engines.node >=24.19.0` |
| pnpm | 12.3.4 | pinned via `packageManager` and `devEngines` in root `package.json` |
| TypeScript (api) | 6.0.3 | kept; see decisions below |
| TypeScript (web) | 5.9.3 | kept; verified in Phase 2, need not match the API |
| NestJS core / CLI | 12.0.1 / 12.0.0 | ESM, strict mode |
| @nestjs/config | 12.0.0 | env loading + validation (Phase 4) |
| class-validator / class-transformer | 0.15.1 / 0.5.1 | DTO and env validation (Phase 4) |
| Vitest / Vite | 4.1.11 / 8.2.2 | Vite is a peer of Vitest, not a direct dependency |
| oxlint | 1.81.0 | API linter chosen by Nest scaffold |
| supertest / @types/supertest | 7.2.2 / 7.2.1 | |
| Docker / Docker Compose | 29.7.2 client, 29.5.2 server / 5.4.0 | daemon provided by Colima 0.10.3 (`colima start`) |
| MySQL image | mysql:8.4.11 | 8.4 LTS, arm64+amd64 (Phase 5) |
| Prisma CLI / @prisma/client / @prisma/adapter-mariadb | 7.10.0 (exact) | Phase 6; `mariadb` driver 3.4.5 via the adapter |
| Redis image | redis:8.4.6 | 8.4 line, arm64+amd64 (Phase 5) |
| Admin: React / Refine core / Refine antd / Refine router | 19.2.8 / 5.0.12 / 6.0.3 / 2.0.4 | Phase 7 |
| Admin: Ant Design / icons / React Router / TanStack Query | 5.29.3 / 5.6.1 / 7.18.3 / 5.102.8 | constrained by Refine peers (antd ^5.23, react-router ^7) |
| Admin: Vite / plugin-react / Vitest / jsdom / Testing Library | 8.2.2 / 6.1.1 / 4.1.11 / 30.0.1 / react 16.3.3, dom 10.4.1, jest-dom 7.0.1, user-event 14.6.7 | Phase 7 |
| Admin: TypeScript / ESLint / typescript-eslint | 6.0.3 / 10.10.0 / 8.69.0 | typescript-eslint peer `<6.1.0` |
| Next.js / create-next-app | 16.3.4 | Turbopack; App Router; `src/` layout |
| React / react-dom | 19.2.8 | |
| ESLint / eslint-config-next | 9.39.5 / 16.3.4 | ESLint 9.x is EOL; see Phase 2 notes |
| Tailwind CSS / @tailwindcss/postcss | 4.3.3 | |
| @types/node (web / api) | 24.13.3 | web aligned to `^24.13.3` in Phase 3; same store entry as the API |

## Phases 1–7 (archived)

Dependency cleanup, frontend/backend verification, repository conventions, API foundation, local MySQL/Redis, Prisma foundation (incl. the readiness-recovery root cause) and the admin application foundation are complete. Their full records moved unchanged to [docs/history/setup-progress-phases-1-7.md](history/setup-progress-phases-1-7.md). Do not re-read them during normal development; `docs/ai/current-state.md` carries what still matters.

## Remaining roadmap (set 2026-09-06 at the start of the autonomous run; re-checked against the SRS before each phase)

Ordering follows SRS section 22 gates and the mandated dependency order; security enforcement precedes CRUD. Phase numbers continue this document's numbering (SRS phase numbers differ and are cited in brackets).

| Phase | Scope | SRS traced | Depends on |
| --- | --- | --- | --- |
| 8 | Foundation gaps: collation policy applied through migrations; dedicated `<db>_test` database + API integration-test harness against real MySQL; traceability document; security middleware baseline (security headers, trusted-proxy config) | DAT 001/004/006, DIR 004 (collation), SEC 001/003, QA 001, MOD 002 | 1–7 |
| 9 | Administrator identity, sessions and RBAC: AdminUser/Role/Permission/Session/ResetToken/AuditLog tables, Argon2id, login/logout/me/forgot/reset, opaque cookie sessions, CSRF, Redis-backed login throttling, guards + permission decorator, bootstrap procedure, audit events, admin route protection in `apps/admin`, OpenAPI for auth routes | ADM 001, AUTH 001–002, RBAC 001, SEC 001–004, API 001/002/005, MON 001 [SRS phase 5] | 8 |
| 10 | Admin account lifecycle: create/disable/enable admins, setup links, session revocation, last-Super-Admin protection, optional TOTP (AUTH 003), audit read API | ADM 001, AUTH 003, RBAC 001, ADM 003 (audit widget) | 9 |
| 11 | Melbourne taxonomy and location model: categories (2 levels), services + synonyms, local areas allowlist; admin CRUD with deactivation rules | CFG 003, BUS 008, SCP 001/004, DAT 001–004 [SRS phase 6] | 9 |
| 12 | Business listings core: Business/BusinessAddress/BusinessRating shells, draft→published→archived, versions/409, eligibility verification, duplicates, admin list/form (Refine vertical slice) | BUS 002/006/007, API 005, ARC 005, DAT 005 | 11 |
| 13 | Listing media, hours, contacts, links: OpeningInterval/HoursException with DST tests, contact validation, address visibility, media usage (with the media foundation) | BUS 001/003/004, MED 001–004 (foundation), DAT 001 | 12 |
| 14 | Public directory (web): shadcn/ui + design tokens, directory/category/area pages, SearchService, filters/sort/pagination, related listings, business detail | DIR 001–008, BUS 001/005, UX 001–003, CACHE 001 [SRS phase 7] | 13 |
| 15 | Hero and fixed-Melbourne search with accessible rotating headline and suggestions | HERO 001–007 | 14 |
| 16 | Reviews, ratings, abuse reports and moderation (pending by default, aggregates, idempotency, Turnstile, rate limits) | REV 001–005, REP 001–002, API 003/004, SEC 002/003 | 12, 9 |
| 17 | Enquiries: outbox, BullMQ worker (`apps/worker`), email adapter, delivery states, webhooks | ENQ 001–007, EVT 001–002, ARC 003 | 16 |
| 18 | Blog: categories/tags/authors/posts, scheduling, revisions, preview | BLOG 001–005, DAT 005 | 13 |
| 19 | Public blog pages, comments and moderation | BLOG 004–005, COM 001–002 | 18, 16 |
| 20 | Media pipeline completion: S3-compatible quarantine flow, variants, lifecycle | MED 001–004 | 13, 17 |
| 21 | SEO: metadata, canonical, sitemap, robots, JSON-LD, redirects | SEO 001–007 | 14, 19, 20 |
| 22 | Caching and invalidation: Redis cache, Next.js revalidation, urgent purge, featured placements | CACHE 001–003, DIR 007, CFG 001 | 14–21 |
| 23 | Accessibility, performance, responsive and browser hardening | NFR 001, 006–008, 011–013 | 14–22 |
| 24 | Deployment, backups, monitoring, recovery, runbooks | OPS 001–004, BACK 001–002, MON 001–002, NFR 004/009 | 22 |
| 25 | Traceability review and internal pre-audit | QA 001–003, section 21 | all |

Blocking client decisions carried from SRS section 23 (D01–D08) are recorded in `docs/requirements-traceability.md`; work proceeds with the SRS baselines (council-area boundary, TOTP optional, etc.) until decided.

## Phase 8 — Foundation gaps before authentication (complete, 2026-09-06)

SRS covered: DAT 001/004/006 and DIR 004 (collation policy and deterministic ordering), SEC 001 (security headers, CSP) and SEC 003 (trusted proxy / X-Forwarded-For), QA 001 and MOD 002 (integration tests against real MySQL), ARC 001 (decision register).

Acceptance criteria: (1) one collation applied to server, databases and tables and enforced by a migration lint; (2) an isolated `_test` database with an API integration harness that refuses any other target; (3) security headers on every API response and a validated trusted-proxy setting; (4) roadmap and traceability documents exist; (5) root check, unit, e2e and integration suites pass.

Decisions:

- **Collation: `utf8mb4_unicode_ci` everywhere.** Prisma Migrate hard-codes it for MySQL tables, so choosing it removes any need to hand-edit migrations (which would also break Prisma's checksum tracking) and eliminates mixed-collation joins. It is case- and accent-insensitive, which is what directory search and unique slugs want. Applied through: Compose `--collation-server=utf8mb4_unicode_ci` (container recreated normally, volume kept), `ALTER DATABASE` on the shadow database as root, migration `20260905201937_collation_policy_utf8mb4_unicode_ci` (`ALTER DATABASE ... COLLATE utf8mb4_unicode_ci` on the app database), and the new test database created with it. `packages/database/scripts/check-migrations.mjs` (`pnpm db:migrations:check`, part of `pnpm check`) rejects any other collation/charset and any `DROP/TRUNCATE` without a `-- reviewed:` comment. Documented tie rule for DIR 004: case/accent-insensitive string order, ties broken by stable ID.
- **Test database.** `<name>_test` (`melbourne_sphere_test`) is created by the first-start init script (and was created once as root on the existing volume) and granted to the app user only. `apps/api/test/integration/*` derives its URL from `DATABASE_URL_TEST` or from `DATABASE_URL` with `_dev → _test`, refuses names not ending in `_test`, runs `prisma migrate deploy` in global setup, and truncates only application tables. `pnpm test:integration` runs the database package suite (dev DB, prefixed keys) and the API suite (test DB). It is deliberately outside `pnpm check` because it needs `pnpm infra:up`.
- **Security baseline.** `helmet` 8.3.0 in `configureApp`: CSP `default-src 'none'; frame-ancestors 'none'`, nosniff, frame denial, `Referrer-Policy: no-referrer`, `Cross-Origin-Resource-Policy: same-origin`, HSTS. `TRUST_PROXY` (integer 0–10, default 0) sets Express `trust proxy`; 0 locally, 1 behind the production reverse proxy; wildcards are impossible by validation.
- Deferred to the phases that need them: `packages/config`, `packages/contracts` (with OpenAPI in Phase 9), `packages/ui`/shadcn (Phase 14), `apps/worker` (Phase 17), Redis client (Phase 9 login throttling).

Files: `infrastructure/docker-compose.yml`, `infrastructure/mysql-init/10-shadow-database.sh`, `infrastructure/README.md`, `packages/database/prisma/migrations/20260905201937_collation_policy_utf8mb4_unicode_ci/migration.sql`, `packages/database/scripts/check-migrations.mjs`, `packages/database/package.json`, `packages/database/README.md`, `apps/api/src/app.setup.ts`, `apps/api/src/main.ts`, `apps/api/src/config/env.validation.ts` (+spec), `apps/api/test/app.e2e-spec.ts`, `apps/api/vitest.config.integration.ts`, `apps/api/test/integration/{test-database-url,global-setup,setup-env,harness}.ts`, `apps/api/test/database.integration-spec.ts`, `apps/api/package.json`, `apps/api/.env.example`, root `package.json`, `README.md`, `docs/requirements-traceability.md` (new), this file.

Evidence: `pnpm db:migrations:check` OK; `pnpm check` passes (api unit 41, e2e 14 incl. security headers, admin 38, database 23); `pnpm test:integration` passes (database 5, api 3: readiness 200 against the test DB, migrations applied with unicode_ci everywhere, guarded truncation); `migrate status` up to date on dev; collations verified via information_schema for dev/shadow/test databases and both tables; frozen install and peer check clean.

Limitations: Prisma cannot express collation in the schema, so the policy relies on the migration lint plus the server default; `helmet`'s HSTS header is emitted over plain HTTP locally (browsers ignore it there).

Next: Phase 9 — administrator identity, sessions and RBAC.

## Phase 9 — Administrator identity, sessions and RBAC (complete, 2026-09-06)

SRS: ADM 001 (bootstrap, no registration, last-Super-Admin rule prepared), AUTH 001 (email/password, Argon2id, generic responses, throttling, reset tokens hashed/single-use/30 min, reset revokes sessions), AUTH 002 (opaque hashed server sessions, Secure/HttpOnly/SameSite cookie scoped to `/api/v1/admin`, rotation on login, 30 min idle / 12 h absolute, server-side logout, no localStorage tokens), RBAC 001 (permission catalogue, roles, joins, seeded Super Admin, guards on every admin endpoint, default deny), API 001/002/005 (OpenAPI, envelopes, explicit DTOs), SEC 001 (CSRF/Origin checks for session mutations), SEC 002/003 (login limits: 5 failed per 15 min per IP + account throttling, fail-safe when the limiter store is down), SEC 004 (secrets validated, never logged), MON 001 (redacted audit/log records), DAT 001/014 table (AdminUser, Role, Permission, joins, Session, ResetToken, AuditLog).

Acceptance criteria:
1. Migration adds admin_user, role, permission, role_permission, admin_role, admin_session, password_reset_token, audit_log with the SRS constraints; `pnpm db:migrations:check` passes.
2. `pnpm --filter api admin:bootstrap` creates the first Super Admin exactly once (refuses when any admin exists), never from default credentials; permissions/roles seed idempotently.
3. `POST /api/v1/admin/auth/login` returns the admin + session summary and sets the cookie; wrong password, unknown email and disabled accounts all return the same 401 envelope; 5 failures per 15 min (per IP and per account) → 429 with `Retry-After`; Redis outage → 503, never a bypass.
4. `GET /me`, `POST /logout` (204, server record revoked, cookie cleared), `POST /forgot-password` (always 202), `POST /reset-password` (single use, 30 min, revokes all sessions).
5. Every `/api/v1/admin/*` route except the declared public auth routes requires a valid session; a route without a permission declaration is denied; missing permission → 403 envelope; idle/absolute expiry and revocation → 401.
6. Mutating admin requests without a trusted `Origin`/`Referer` (or `Sec-Fetch-Site: same-origin`) → 403.
7. Audit rows for login success/failure, logout, reset requested/completed, session revocation; no passwords, tokens or cookies in logs or audit.
8. OpenAPI document generated for the auth routes and served in development; `packages/contracts` holds the generated spec and types.
9. Admin app: login page, Refine auth provider on the cookie session, protected routes, current-admin display and logout; no tokens in web storage.
10. Unit + integration (real MySQL test DB + Redis) + e2e + admin tests pass; root check passes; secret scan clean.

Decisions and implementation (all acceptance criteria met):

- **Toolchain**: `@node-rs/argon2` 2.2.0 (Argon2id, prebuilt N-API binaries for darwin-arm64/linux-x64/linux-arm64, no build script), `ioredis` 5.11.1 (BullMQ's peer is `>=5`; 6.0 was released weeks ago and was not adopted), `@nestjs/swagger` 12.0.1, `cookie` 2.0.1, `openapi-typescript` 7.13.0 (TS 5.9.3 pinned inside `packages/contracts` for its `^5` peer), `@ant-design/v5-patch-for-react-19` 1.0.3 (official antd v5 + React 19 compatibility). `@scarf/scarf` (install-time telemetry via swagger-ui-dist) is explicitly denied in `pnpm-workspace.yaml`.
- **Schema/migrations**: `admin_identity_sessions_rbac_audit` adds AdminUser, Role, Permission, RolePermission, AdminRole, AdminSession, PasswordResetToken, AuditLog with unique normalised email, unique token hashes (SHA-256 hex), composite join keys, FK deletion rules (sessions/tokens/joins cascade with the admin; permissions/roles restrict; audit actor SET NULL), indexes on status/expiry/actor/action/target. `plural_table_names` (hand-written, non-destructive `RENAME TABLE` + index/constraint renames, reviewed instead of Prisma's drop/create) adopts the **snake_case plural table policy** raised by the client; `prisma migrate dev` confirms no drift.
- **Identity**: permission catalogue in code (`identity/permissions.ts`, SRS RBAC 001 keys), seeded idempotently with one system role `super_admin`; `IdentityService.getPrincipal` resolves roles → permissions.
- **Passwords**: Argon2id with configured `m=19456,t=2,p=1` minimums (validation refuses weaker), 12–256 chars (documented bound), rehash-on-login when parameters rise, timing-equalising dummy verify for unknown accounts.
- **Sessions**: 256-bit random token, SHA-256 hash stored, cookie `ms_admin_session` HttpOnly/Secure(prod)/SameSite=Strict/Path=`/api/v1/admin`/Max-Age=absolute; idle 30 min (sliding, persisted at most once a minute) and absolute 12 h; revocation reasons recorded (`logout`, `idle_timeout`, `expired`, `password_reset`, `account_disabled`). Redis session caching deferred (MySQL authoritative).
- **Throttling**: Redis (`ms:` prefix) counters per IP and per HMAC(email) with `APP_SECRET_KEY`; 5/15 min, account window escalates to 1 h after 10 failures; `429` + `Retry-After`; Redis failure → `503` (fail safe). `TRUST_PROXY` governs client IP.
- **CSRF**: `CsrfOriginGuard` (Origin → Referer → `Sec-Fetch-Site`) on every mutating admin request including login; `TRUSTED_ORIGINS` validated (https-only in production).
- **Guards**: global `SessionAuthGuard` → `PermissionsGuard` (default deny; `@Public`, `@SessionOnly`, `@RequirePermissions`), applied by path prefix so every future admin controller inherits them.
- **Audit**: append-only `audit_logs` with metadata sanitisation (keys matching password/token/secret/cookie/hash dropped).
- **Reset**: token 256-bit random, hashed, 30 min, single use (atomic consume), revokes all sessions, password policy + not-the-email rule; `MailerPort` with `NullMailer` (prod default until D03) and dev-only `ConsoleMailer`; forgot-password always 202 and throttled.
- **Bootstrap**: `pnpm --filter api admin:bootstrap` (env-provided credentials, refuses when any admin exists, audit `admin.bootstrap`); `admin:seed-rbac`.
- **OpenAPI/contracts**: `packages/contracts` with `openapi/api.json` (7 paths) generated from the running Nest metadata (`pnpm contracts:generate`), types via openapi-typescript; `pnpm contracts:check` (in `pnpm check`) regenerates to a temp file and fails on drift. Admin app types for auth come from the contract. Document served at `/api/v1/openapi.json` when `OPENAPI_ENABLED=true` (JSON only; no UI, so the strict CSP stays).
- **Readiness** now checks MySQL and Redis (both consumed).
- **Admin app**: Refine auth provider on the cookie session (in-memory identity only; concurrent checks share one `/me` call), `<Authenticated>` around the shell with redirect to `/login`, login/forgot/reset pages (public), header shows the admin and Sign out; 401 anywhere logs out.

Tests: API unit 69 (password params/verify/rehash/bounds, throttle limits/escalation/keyed keys/fail-safe, CSRF guard, permissions default-deny, session cookie/hash, audit sanitisation, env incl. production refusals), API e2e 18 (401 before backends, login CSRF, 503 fail-safe when Redis unreachable, DTO validation, headers), API integration 16 (login cookie/audit, email normalisation, generic 401 ×3 with audit reasons, CSRF/unknown fields, per-IP and per-account throttling, `/me`, forged cookie, permission allow/forbid/undeclared/session-only, mutation origin, idle expiry revocation, disabled account, logout, reset flow incl. weak/expired/reused tokens), database 23+5, admin 46 (auth provider incl. dedup, login page error surfacing, anonymous redirect, reset page guard). `pnpm check` and `pnpm test:integration` pass; frozen install and peer check clean.

Runtime verification (API 3001 + admin 3002, stopped afterwards): bootstrap created the dev Super Admin once and refused a second run; readiness `{database: ok, redis: ok}`; `/api/v1/openapi.json` served; login without Origin → 403 `CSRF_ORIGIN_REJECTED`; wrong password → 401 `INVALID_CREDENTIALS`; login via the admin proxy → 200 with `Set-Cookie … Path=/api/v1/admin; HttpOnly; SameSite=Strict`; `/me` 200 with cookie, 401 without; logout 204 then `/me` 401; five bad logins → sixth 429 `Retry-After: 900`; forgot-password 202 with the dev console mail printed; reset with weak password → 400 field error, reset → 204, token reuse → 400 `INVALID_RESET_TOKEN`, old password 401, new password 200; audit rows for every action; browser: `/admin/` redirects to the login page, no web storage, session cookie invisible to JavaScript; the initial burst of `/me` checks was deduplicated.

Limitations / deferred: reset-link delivery needs an email provider (D03); TOTP, admin CRUD, session listing/revocation UI and last-Super-Admin protection are Phase 10; Redis session cache not implemented (MySQL only); `check()` results are shared for 1 s only, so Refine's multiple consumers still cause a couple of `/me` calls per navigation; antd React 19 patch is the vendor-recommended shim, not native support.

Files: `packages/database/prisma/schema.prisma`, migrations `20260905203242_admin_identity_sessions_rbac_audit`, `20260905204557_plural_table_names`, `packages/database/src/index.ts`, `packages/contracts/**` (new), `apps/api/src/{auth,identity,audit,redis,cli}/**`, `apps/api/src/{app.module,app.setup,main,openapi}.ts`, `apps/api/src/config/env.validation.ts` (+spec), `apps/api/src/health/*`, `apps/api/test/**`, `apps/api/vitest.config*.ts`, `apps/api/package.json`, `apps/api/.env.example`, `apps/admin/src/{auth,api/auth.ts,pages/{Login,ForgotPassword,ResetPassword}Page.tsx,app/*,layouts/AdminShell.tsx,test/render.tsx,main.tsx}`, `apps/admin/package.json`, `pnpm-workspace.yaml`, root `package.json`, `README.md`, `apps/admin/README.md`, `packages/database/README.md`, `docs/requirements-traceability.md`, this file.

Next: Phase 10 — admin account lifecycle and security (admins CRUD with setup links, session revocation, last Super Admin protection, optional TOTP, audit read API, `apps/admin` screens).

## Phase 10 — Admin account lifecycle, sessions, audit and optional TOTP (complete, 2026-09-06)

SRS: ADM 001 (additional admins created by an authorised Super Admin with a short-lived setup link; prevent disabling/deleting the last active Super Admin), AUTH 001 (session revocation), AUTH 002 (rotate on privilege change), AUTH 003 (optional TOTP enrol/verify/disable/recovery codes; recent authentication for enrol/disable; encrypted secrets; hashed single-use recovery codes; no public bypass), RBAC 001 (`admins.manage`, `audit.read`), ADM 002 (account security screen, confirmations for destructive actions), ADM 003 (audit activity), section 16 (`/admins`, `/admins/{id}/sessions`, `/auth/totp/*`, `/audit`), DAT 002 (encrypted sensitive fields), MON 001.

Acceptance criteria:
1. `GET/POST /api/v1/admin/admins`, `GET/PATCH /admins/{id}`, `POST /admins/{id}/disable|enable`, `GET/DELETE /admins/{id}/sessions[/{sessionId}]`, all behind `admins.manage`, paginated with the `{data, meta}` envelope, `expectedVersion` on PATCH (409 on stale), explicit allowlisted DTO fields, audit rows for every change.
2. Creating an admin issues a setup token (hashed, single use, 24 h) delivered through the mailer port; `POST /auth/accept-setup` sets the password and activates the account. Accounts start in `invited` status and cannot sign in until set up.
3. Disabling an admin revokes all sessions immediately; the last active Super Admin cannot be disabled, demoted or have `super_admin` removed (409 `LAST_SUPER_ADMIN`); an admin cannot disable themselves.
4. Own account: `POST /auth/change-password` (current password required; revokes other sessions), `GET /auth/sessions`, `DELETE /auth/sessions/{id}`.
5. TOTP: `POST /auth/totp/enroll` (recent authentication ≤ 5 min or password re-entry; returns otpauth URI + provisional secret encrypted at rest), `POST /auth/totp/verify` (activates, returns 10 hashed single-use recovery codes once), `POST /auth/totp/disable` (recent auth), login for TOTP-enabled admins returns `202 {data:{challenge}}` and `POST /auth/totp/challenge` with a code or recovery code completes it; challenges expire in 5 min and are throttled.
6. `GET /api/v1/admin/audit` behind `audit.read`: filters by action/actor/target/date, paginated, newest first, never exposing sensitive metadata.
7. Admin app: Administrators list/create/edit/disable with confirmations and stale-edit warning, sessions revocation, Account security page (change password, TOTP enrol/disable with QR), Audit log page, TOTP challenge step on login, accept-setup page.
8. Unit + integration + e2e + admin tests; runtime verification; secret scan; root check.

Decisions: encryption of TOTP secrets uses AES-256-GCM with a dedicated `FIELD_ENCRYPTION_KEY` (32 random bytes, base64) so rotating the throttle secret never touches encrypted fields; the key is required (validated at startup).

Implementation (all acceptance criteria met):

- **Toolchain**: `otpauth` 9.5.2 (RFC 6238, SHA-1/6 digits/30 s, ±1 step), `qrcode.react` 4.2.0 (client-side QR of the otpauth URI; the secret never goes through an image service). Encryption: Node `crypto` AES-256-GCM (`common/field-encryption.service.ts`, versioned `v1:iv:tag:ct` format, admin id as AAD) with `FIELD_ENCRYPTION_KEY` (32 random bytes, validated; generated locally, placeholder in the example).
- **Schema** (`admin_lifecycle_totp`, additive): `AdminUserStatus` gains `invited`; `admin_users` gains `totpSecretEncrypted`, `totpPendingSecretEncrypted`, `totpEnabledAt`; `password_reset_tokens.purpose` (`reset|setup`); new `admin_recovery_codes` (unique adminId+codeHash) and `admin_login_challenges` (hashed single-use, 5 min, attempt counter).
- **Administrators API** (`admins.manage`): list with `page/pageSize(≤50)/q/status/sort(allowlist)/order` and stable id tie-break; create → `invited` + 24 h single-use setup link via the mailer port; get; PATCH with `expectedVersion` (409 `STALE_VERSION`), role change rotates sessions; disable (revokes all sessions, refuses self and the last active Super Admin with 409 `LAST_SUPER_ADMIN`), enable, resend-setup; sessions list/revoke one/revoke all. All audited (`admin.create|update|disable|enable|setup_link.resent|session.revoke|session.revoke_all|setup.completed`).
- **Own account** (`@SessionOnly`): change-password (current password required; other sessions revoked), sessions list/revoke, TOTP enrol (recent auth ≤5 min or current password → 403 `REAUTHENTICATION_REQUIRED` otherwise), verify (activates, returns 10 hashed single-use recovery codes once), disable (recent auth + valid TOTP or recovery code). Login for TOTP-enabled admins returns **202** `{requires:'totp', challenge, expiresAt}` (no cookie) and `POST /auth/totp/challenge` completes it; challenges are single use with 5 attempts and audited failures; recovery codes are consumed atomically.
- **Audit read** (`audit.read`): `GET /admin/audit` with `action` (exact or `prefix*`), actor/target/date filters, newest first, actor email/name joined, no sensitive metadata.
- **Admin app**: Administrators list (URL-persisted search/status/page), create dialog with field errors, detail page (edit with expectedVersion + stale-edit message, disable/enable confirmations, resend link, session revocation), Account security (change password, sessions, TOTP enrol QR + manual key, recovery codes shown once, disable with re-auth prompt), Audit log, Accept-setup page, TOTP step on the login page, permission-gated navigation (courtesy only). Contract types regenerated (23 paths).

Tests: API unit 75 (+ field encryption round-trip/tamper/AAD/key, TOTP verify window/recovery codes), e2e 18, integration 27 (+11: create/list/filters/sort allowlist/unknown fields, invited login blocked, setup single-use, expectedVersion/stale 409, self-disable, disable revokes sessions, enable, last-Super-Admin demotion refused, session listing/revocation, audit filters/injection rejection, change-password, TOTP enrol/verify/challenge/wrong code/single-use challenge/recovery code spend/disable with re-auth), admin 50 (+ administrators page list/create/conflict, TOTP login step, accept-setup validation). `pnpm check`, `pnpm test:integration`, frozen install and peers pass.

Runtime verification (live API 3001 + admin 3002, stopped afterwards): create invited admin → console mail with setup link; list sorted by email with meta; audit shows `admin.create` by the actor; TOTP enrol → verify with a generated code → 10 recovery codes → login 202 challenge → wrong code 401, right code 200 with cookie → disable 204 → plain login 200; invited login 401 → accept-setup 204 → reuse 400 → new admin login 200 → self-disable 409 `SELF_DISABLE` → Super Admin disables it (session immediately 401) → stale enable 409 `STALE_VERSION`. Browser: `/admin/admins` and `/admin/account` redirect anonymous visitors to login with `?to=`; `/admin/accept-setup?token=…` renders the activation form.

Limitations / deferred: setup and reset links need an email provider (D03); whether TOTP is mandatory is D06 (optional now); no admin UI for role editing beyond `super_admin` (SRS ADM 003 out of MVP); lost-factor recovery is by another Super Admin disabling TOTP after identity verification — currently that means disabling the account and re-inviting; a dedicated audited "reset second factor" action is recorded as follow-up; recovery codes cannot be regenerated without disabling and re-enrolling.

Files: `packages/database/prisma/{schema.prisma,migrations/20260906020806_admin_lifecycle_totp}`, `packages/database/src/index.ts`, `packages/contracts/**` (regenerated), `apps/api/src/{admins/**,audit/audit.controller.ts,audit/audit.module.ts,auth/account.service.ts,auth/totp/**,auth/dto/account.dto.ts,auth/auth.controller.ts,auth/auth.service.ts,auth/auth.module.ts,common/field-encryption.service.ts,common/pagination.ts,config/env.validation.ts,identity/identity.service.ts,app.module.ts}` (+specs), `apps/api/test/{admins.integration-spec.ts,integration/harness.ts}`, `apps/api/vitest.config*.ts`, `apps/api/.env.example`, `apps/admin/src/{api/admins.ts,api/auth.ts,auth/auth-provider.ts,pages/**,layouts/AdminShell.tsx,app/routes.tsx,shared/{useAsync,format}.ts}` (+tests), `apps/admin/package.json`, `README.md`, `apps/admin/README.md`, `docs/requirements-traceability.md`, this file.

Next: Phase 11 — Melbourne taxonomy and location model.

## Phase 11 — Melbourne taxonomy and location model (complete, 2026-09-06)

SRS: CFG 003 (active status, stable slugs, two-level categories, no cycles/orphans, deactivation preserves history), BUS 008 (local areas as allowlisted Melbourne subdivisions with unique slug, optional editorial intro, active flag, eligibility source/date recorded by admins; no state/country expansion), SCP 001/004 (server-owned Melbourne constants; council-area baseline until D01), DIR 002 (category descendants), HERO 005 (services with synonyms for search), DAT 001–004 (opaque ids, versions, unique slugs incl. archived, indexes), API 005 (expectedVersion, explicit state actions), RBAC 001 (`taxonomy.manage`), section 15/16 (`GET /categories /services /areas` public, `/admin/categories /services /areas` CRUD/deactivation), MOD 001 (TaxonomyModule).

Acceptance criteria:
1. Migration adds `categories` (name, slug unique, parentId nullable self-FK with two-level limit enforced in service, sortOrder, active, description), `services` (name, slug unique, active) + `service_synonyms` (unique per service, indexed for search), `local_areas` (name, slug unique, active, editorialIntro, eligibilityNote/source, verifiedAt) — all with version/createdAt/updatedAt and the plural snake_case policy; `pnpm db:migrations:check` passes.
2. Public `GET /api/v1/categories` (tree of active), `/services` (active with synonyms), `/areas` (active), cacheable (`Cache-Control: public, max-age=300`), never exposing inactive items.
3. Admin CRUD under `taxonomy.manage` with `expectedVersion`, slug generation/validation (lowercase-hyphen, immutable once published-referenced), explicit `deactivate`/`activate` actions, cycle/depth prevention (409), and deactivation blocked while active listings reference the term (prepared: the check exists and is exercised once Business exists in Phase 12).
4. Melbourne constants exposed by `GET /api/v1/site/context` (`city: Melbourne`, `state: VIC`, `country: AU`, `timezone: Australia/Melbourne`); no city CRUD anywhere.
5. Seed fixture command for a conservative council-area local-area allowlist and starter categories/services, run explicitly (`pnpm --filter api taxonomy:seed`), idempotent, audited.
6. Admin app: Categories, Services, Local areas screens (list/search, create/edit with stale-edit handling, activate/deactivate with confirmation) registered as Refine resources with the data provider extended for the documented list contract (`q`, `status`, `sort`, `order`).
7. Unit + integration (constraints: unique slugs, parent depth, cycle) + e2e + admin tests; root check; runtime verification; secret scan.

Implementation (all acceptance criteria met; criterion 6 uses the typed clients rather than Refine resources, see decision):

- **Schema** (`directory_taxonomy_and_local_areas`, additive): `categories` (unique slug, self-FK `parentId` RESTRICT, sortOrder, active, description, version), `services` + `service_synonyms` (unique per service, indexed `term`), `local_areas` (unique slug, editorialIntro, eligibilitySource, eligibilityVerifiedAt, active, sortOrder, version). Two-level nesting and cycles are enforced in the service (409 `CATEGORY_DEPTH`/`CATEGORY_CYCLE`), because MySQL cannot express the depth rule declaratively.
- **API**: `TaxonomyModule` (`taxonomy.service.ts`, public + admin controllers), `SiteModule` (`GET /site/context` with server-owned Melbourne constants and the D01 boundary note). Shared `common/slug.ts` (NFKD + transliteration of ß/æ/ø/œ/đ/ł, lowercase-hyphen, ≤100) and `common/pagination.ts`. Public reads expose only active items (children of inactive parents are hidden), cache 5 min. Admin lists share one contract (`q`, `status`, `sort` allowlist, `order`, pagination) with stable id tie-break. Deactivation guards: active children, inactive parent, `referencedByActiveListings` hook (returns 0 until Phase 12 adds Business). `HttpExceptionFilter` now maps `DatabaseUnavailableError` to 503 `SERVICE_UNAVAILABLE` (SRS API 002) instead of a generic 500.
- **Seed**: `pnpm --filter api taxonomy:seed` (idempotent by slug, audited `taxonomy.seed`): 14 City of Melbourne suburbs as the conservative allowlist (baseline pending D01, each with `eligibilitySource` and verification timestamp), 5 starter root categories with 4 children, 3 services with synonyms. Ran twice on the dev database: first run created 14/9/3, second created 0.
- **Admin app**: one generic `TermsPage` driven by per-resource configs (`pages/taxonomy/configs.tsx`) for Categories, Services and Local areas; navigation entries gated by `taxonomy.manage`. Decision: the screens call the typed clients (`api/taxonomy.ts`, contract types) directly instead of registering Refine `resources`, because the Refine data provider still refuses undocumented sort/filter serialisation; the list contract is now documented, so Phase 12's listing slice will move these onto the provider (SRS ARC 005 vertical slice) rather than duplicating that work here.

Tests: API unit 85 (+ slugify incl. transliteration and length cap, isValidSlug, normaliseSynonyms), e2e 19 (+ public taxonomy → 503 envelope without a database; site context cacheable), integration 32 (+5: anonymous/cacheable public reads and 401 admin reads; category slug generation/uniqueness/invalid slug/depth/cycle/orphan parent/rename/stale/public tree; deactivation rules and audit actions; services synonym normalisation/replace/public/limit; local areas eligibility timestamps/ordering/unknown expansion fields/context/deactivate), admin 53 (+3: URL-driven list, create with envelope field errors + confirmed deactivation, stale-version message). `pnpm check` passes; contracts regenerated (39 paths). One transient integration failure (readiness test, Redis ping) was observed once in a full run and passed on two reruns; recorded as a flake to watch.

Runtime verification (live API on 3001 — a `nest start --watch` process the client started, left running — and the admin dev server on 3002, stopped afterwards): `/categories` via the admin proxy → 200 with `cache-control: public, max-age=300`, 5 roots with children counts; `/services` with synonyms; `/areas` 14 entries with no private fields; admin list anonymous → 401; login → create “Pets & Vets” under Home Services (slug `pets-and-vets`) → nesting under it 409 `CATEGORY_DEPTH` → deactivate (v1) → stale activate 409 `STALE_VERSION` → public tree excludes it → reactivate (v2) → public again; audit trail create → deactivate → activate. Browser: `/admin/categories` redirects anonymous visitors to login.

Files: `packages/database/prisma/{schema.prisma,migrations/20260906022638_directory_taxonomy_and_local_areas}`, `packages/database/src/index.ts`, `packages/contracts/**` (39 paths), `apps/api/src/{taxonomy/**,site/**,common/{slug,pagination}.ts,common/http-exception.filter.ts,cli/seed-taxonomy.ts,app.module.ts,package.json}` (+specs), `apps/api/test/{taxonomy.integration-spec.ts,app.e2e-spec.ts,integration/harness.ts}`, `apps/admin/src/{api/taxonomy.ts,pages/taxonomy/**,app/routes.tsx,layouts/AdminShell.tsx,test/render.tsx}` (+tests), `README.md`, `docs/requirements-traceability.md`, this file.

Next: Phase 12 — business listings core.

## Phase 12 — Business listings core (complete, 2026-09-06)

SRS: BUS 002 (publication requirements: name, unique stable slug, useful description, active primary category, verified Melbourne eligibility, at least one contact route, content rights reviewed, admin verification timestamp; private enquiry destination separate from public contact), BUS 006 (draft → published → archived, unpublish returns to draft, explicit permission-protected publication with `firstPublishedAt`, versions and 409 on stale edits), BUS 007 (duplicate warning on normalised name + address/phone; logged override reason; taxonomy removal blocked while referenced), SCP 004 (eligibility against the approved local-area allowlist; never “Melbourne” in an address), DAT 001/004/005 (opaque ids, indexes on status + primary category/local area + firstPublishedAt, transactional state transitions), DAT 002 (encrypted private enquiry email), API 005 (expectedVersion, explicit state actions; documented Refine filters/sort allowlist), ARC 005 (Refine vertical slice: nested fields, publishing, permission denial, stale edit — image upload deferred to the media phase), RBAC 001 (`listings.read/write/publish`), section 16 (`/admin/businesses`, `/{id}/publish|unpublish|archive`), MOD 001 (DirectoryModule owns eligibility and publication).

Acceptance criteria:
1. Migration: `businesses` (name, slug unique incl. archived, description, status enum draft/published/archived, primaryCategoryId FK RESTRICT, localAreaId FK RESTRICT, publicPhone, publicEmail?, publicUrl, addressVisibility enum, privateEnquiryEmailEncrypted, eligibilityVerifiedAt/Source, contentRightsReviewedAt, firstPublishedAt, publishedAt, archivedAt, duplicateOverrideReason, version, timestamps), `business_addresses` (1:1, lines, suburb label, postcode, lat/lng decimals, fixed AU/VIC context), `business_categories` (secondary joins, unique pair), `business_services` (unique pair), `business_ratings` shell (approvedCount, ratingSum, one per business, created with the business). Indexes per DAT 004. `db:migrations:check` passes.
2. Admin API: list with `q`, `status`, `categoryId`, `localAreaId`, `sort` allowlist (`name`, `updatedAt`, `createdAt`, `firstPublishedAt`, `status`), `order`, pagination; create/get/PATCH (nested address, secondary categories, services; `expectedVersion`), explicit `publish` (validates every BUS 002 gate and returns a field-level 409 `PUBLICATION_BLOCKED` listing unmet requirements), `unpublish` (→ draft), `archive`, `restore` (archived → draft); duplicate detection on create/update returns `warnings` and publishing a flagged duplicate requires `duplicateOverrideReason` (audited).
3. Taxonomy deactivation now checks references (`referencedByActiveListings`), with a test proving a term used by a published listing cannot be deactivated.
4. Private enquiry email is AES-256-GCM encrypted at rest and never returned by list endpoints; the detail endpoint returns it only to `listings.write` holders.
5. Refine vertical slice in the admin app: `businesses` registered as a Refine resource on the data provider with the documented list contract (sorters/filters serialised to `sort`/`order`/`q`/`status`/…), list page (server pagination, filters, sort), create/edit form with nested address, category/service selectors, publish/unpublish/archive actions with confirmations, stale-edit handling, permission denial surfaced from the API (403 → message, not hidden UI only).
6. Tests: unit (slug/duplicate normalisation, publication gate), integration (constraints, transitions, gates, duplicate override, stale edits, private field exposure, taxonomy reference block, permission denial for a read-only role fixture), admin (list/filters mapping, publish blocked message), e2e unchanged; root check; runtime verification; secret scan.
Out of scope here: opening hours, media/gallery, external link validation beyond URL shape (Phase 13); public pages (Phase 14).

Delivered:
- **Schema/migration** `20260906024051_business_listings_core`: `businesses`, `business_addresses` (1:1), `business_categories` and `business_services` (composite PK joins), `business_ratings` (shell, created with the business). Enums `BusinessStatus {draft, published, archived}` and `AddressVisibility {full, areaOnly}`. Taxonomy FKs are `RESTRICT` (a term in use can never be deleted underneath a listing); indexes on `status+primaryCategoryId`, `status+localAreaId`, `status+firstPublishedAt`, `normalizedName`, `normalizedPhone`, `name`. Applied to the dev database; the test database receives it through `migrate deploy` in the integration global setup. `db:migrations:check` passes.
- **API** `DirectoryModule` (`apps/api/src/business/`): `business-rules.ts` (name/phone/address normalisation, `publicationBlockers` implementing every BUS 002 gate, explicit transition table), `directory.service.ts` (list with `q`/`status`/`categoryId`/`localAreaId`/sort allowlist, create with generated slug, PATCH with `expectedVersion` and nested address/secondary categories/services, `publish|unpublish|archive|restore` with 409 `PUBLICATION_BLOCKED` carrying `fields.publication`, 409 `DUPLICATE_SUSPECTED` unless `duplicateOverrideReason` ≥ 10 chars, `SLUG_LOCKED` after first publication, `STALE_VERSION`), `directory-admin.controller.ts` (`listings.read` / `listings.write` / `listings.publish`). Private enquiry email is AES-256-GCM encrypted with the business id as associated data and only decrypted on the detail endpoint for `listings.write` holders; list rows never carry it. Every mutation is audited (`listing.<action>` with the reason/override reason). `TaxonomyService.referencedByActiveListings` is now backed by real counts (non-archived listings referencing a category, service or area), so `TERM_IN_USE` is enforced end to end.
- **Error envelope fix**: `HttpExceptionFilter` previously dropped `fields` from `HttpException` object bodies (taxonomy 409s lost their field detail); it now passes through validated `{ field: string[] }` maps only.
- **Contracts**: OpenAPI regenerated (45 paths); nullable string DTO properties now declare `type: String` so generated types are `string | null` rather than `Record<string, never>`; the list endpoint documents `BusinessListItemDto`.
- **Admin app (Refine vertical slice)**: `businesses` is the first resource registered on `<Refine resources>`; the data provider gains a per-resource `LIST_CONTRACTS` registry (`businesses`: sort allowlist and `q/status/primaryCategoryId→categoryId/localAreaId` filters; anything else still throws `ApiContractError`). `pages/businesses/BusinessesPage` (Refine `useList`, URL-driven filters/sort/pagination, duplicate and incomplete flags, write controls hidden without `listings.write`), `pages/businesses/BusinessEditorPage` (`useOne` + typed mutations, nested address with VIC postcode rule, taxonomy selectors, compliance panel, publish/unpublish/archive/restore dialog with reason, blocker list from `fields.publication`, duplicate override prompt on `DUPLICATE_SUSPECTED`, `STALE_VERSION`/`SLUG_LOCKED` handling, archived → read-only). A 401 during a direct mutation is routed through Refine `useOnError` (auth provider → sign-in redirect) in the listings and taxonomy screens. Navigation entry gated by `listings.read`.

Verification (all green, 2026-09-06):
- Unit: database 23, API 89 (incl. `business-rules.spec.ts`), admin 59 (data-provider contract, list mapping, read-only role, create with nested field errors, stale edit, publish blocked → duplicate override → published, session expiry redirect). E2E 19.
- Integration (real MySQL/Redis): API 39 — `directory.integration-spec.ts` covers anonymous 401, a real read-only role fixture (403 on create/publish, no private email on detail or list), create with encrypted private email and rating shell, validation (unknown field, non-VIC postcode, inactive taxonomy, non-http URL), publication gate with field-level reasons, `firstPublishedAt` set once across unpublish/republish, stale 409, slug lock, archived edit refusal, unique slug incl. archived, audit trail order, duplicate warning + override, `TERM_IN_USE` for category/area with archived references not blocking, inactive area rejected.
- Root `pnpm check` green (lint, typecheck, unit, e2e, builds, contracts in sync); `pnpm install --frozen-lockfile --offline` clean.
- Runtime: the API on 3001 (started for verification and stopped afterwards; the user's watch process had already exited) served the 45 documented paths; authenticated curl flow create → publish → stale PATCH 409 → list (no private email) → archive → audit `listing.create/publish/archive`. Admin app in the browser: Businesses list from the live API, New business form, archived detail read-only with Restore dialog. The archived listing `runtime-check-cafe` remains in the dev database as verification data.
- Secrets: the dev admin's password was rotated after being typed in the browser (reset flow, then the temporary value confirmed rejected); trackable-file scan clean; env files ignored.

Decisions:
- Duplicate detection is name-based (normalised name, then address/phone corroboration) and non-blocking on create; only publication requires an override reason (SRS BUS 007).
- Eligibility is recorded by an admin statement (`eligibilitySource`) against the active local-area allowlist; no geocoding in MVP (pending D01 boundary decision).
- Taxonomy selectors load up to 50 active terms per kind (the API page cap); a larger taxonomy needs a search-as-you-type selector (noted for Phase 13/23).

Limitations / follow-ups: opening hours, media, richer contact validation → Phase 13; public exposure → Phase 14; the admin bundle is still a single chunk (NFR 013 item stands); antd Select option tests use `title` matching under jsdom.


## Phase 13 — Listing hours, links and contact validation (complete, 2026-09-06)

SRS: BUS 004 (weekly hours with multiple intervals per weekday, explicit next-day flag for overnight closing, closed days, open 24 hours and unknown as distinct states; date-specific exceptions override weekly hours; wall-clock hours stored for Australia/Melbourne and evaluated with timezone-aware dates; unknown is never shown as open/closed), BUS 003 (valid `tel:` link, http(s)-only website/social links, directions from validated address/coordinates, service-area visibility), BUS 001 (social links, operating hours on the detail page — data side here, presentation in Phase 14), DIR 008 ("Open now" stays disabled until hours data quality and DST tests pass — evaluator and tests land here, the filter is a Phase 14 decision), API 001 (local operating hours are separately identified wall-clock values, not ISO instants), DAT 001 table row "OpeningInterval and HoursException" (validate non-overlap and exception priority), NFR 012 (Australia/Melbourne with DST rules), QA T04 (overnight/DST hours tests).

Roadmap adjustment (recorded, not silent): the original Phase 13 line also carried "media usage". Media needs the S3-compatible quarantine pipeline (MED 001–004) and the D03 provider decision; building a `BusinessMedia` table without the upload flow would be a placeholder. Media moves wholesale to Phase 20 (already "media pipeline completion"), where the usage record (`BusinessMedia`: order, caption, alt override, one cover) is created together with the pipeline. BUS 002's "fallback image when no gallery" is a static web asset in Phase 14.

Acceptance criteria:
1. Migration: `opening_intervals` (business FK cascade, ISO weekday 1–7, `allDay` or `startMinute`/`endMinute` 0–1440 with `endNextDay`), `hours_exceptions` (date, kind closed/open24/custom, optional interval, note), `business_links` (kind allowlist facebook/instagram/x/linkedin/youtube/tiktok/other, http(s) URL, label, order), `businesses.hoursMode` (`unknown` default / `scheduled`). `db:migrations:check` passes.
2. Hours domain (`apps/api/src/business/hours/`): pure `validateWeeklyHours` (interval bounds, non-overlap within a day including overnight spill into the next day, at most 4 intervals a day, `allDay` exclusive), `validateExceptions` (unique dates, custom needs intervals), and `evaluateHours(schedule, instant)` returning `unknown | open | closed` with `until` (next change instant) and `source` (`exception` | `weekly`), using an Intl-based Australia/Melbourne converter with explicit DST gap/overlap policy (gap → shifted forward, overlap → first occurrence). Unit tests cover: normal day, overnight interval across midnight, open-24, closed day, exception override (closed on a public holiday, custom hours), the 2026-04-05 AEDT→AEST and 2026-10-04 AEST→AEDT transitions (an interval spanning the change keeps wall-clock semantics), and unknown mode.
3. Admin API: `GET/PUT /admin/businesses/{id}/hours` (`listings.read` / `listings.write`; PUT replaces the weekly schedule and exceptions atomically with `expectedVersion`, bumps the business version, audits `listing.hours.update`; response includes the evaluated status "now" for admin preview). Links are part of the business create/PATCH body (`links[]`, replace semantics) and the `BusinessDto`; validation: http(s) only, no credentials in URL, known kinds must point at their host (e.g. instagram.com), at most one link per known kind, ≤ 8 links. Phone: `publicPhone` must be a plausible Australian number (landline, mobile, 13/1300/1800); the DTO exposes `telHref` (E.164 `tel:+61…` or `tel:1300…`).
4. Admin app: hours editor on the business page (per-weekday state: closed / open 24 hours / intervals with time inputs and "closes next day", exceptions table with date, kind, interval and note; save with `expectedVersion`; shows the evaluated status), links editor (kind + URL rows), field errors mapped from the envelope; tests for the mapping and validation display.
5. Tests: unit (hours rules/evaluator/DST, phone/link rules), integration (hours round trip, overlap 400 with field paths, exception priority through the API status, stale 409, permission denial, links validation, cascade on business rows), admin tests; root `pnpm check`, integration, runtime verification, secret scan, docs and traceability.
Out of scope: media/galleries (Phase 20), public rendering of hours/links/directions (Phase 14), "Open now" search filter (Phase 14 decision per DIR 008).

Delivered:
- **Schema/migration** `20260906031034_listing_hours_and_links` (additive, reviewed): `opening_intervals` (ISO weekday, `allDay`, `startMinute`/`endMinute`, `endNextDay`), `hours_exceptions` (DATE, kind closed/open24/custom, optional interval, note), `business_links` (kind enum, url, label, sortOrder), `businesses.hoursMode` (`unknown` default). All child tables cascade on business delete; `db:migrations:check` passes.
- **Hours domain** `apps/api/src/business/hours/`: `melbourne-time.ts` (Intl-based Australia/Melbourne conversion: `toLocal`, `fromLocal` with explicit DST policy — gap → moved forward, overlap → first occurrence — `offsetMinutesAt`, calendar helpers), `hours-rules.ts` (HH:MM parsing incl. `24:00`, per-day validation with field paths, overnight spill check against the next weekday, exceptions validation, `evaluateHours` → `open | closed | unknown` with `until` and `source`), `hours.service.ts` (GET/PUT with `expectedVersion`, atomic replace in a transaction, audit `listing.hours.update`, status evaluated at request time). Unknown is a distinct state that is never rendered as open or closed (SRS BUS 004).
- **Contacts/links** (`business-rules.ts`): `parseAustralianPhone` (landline, mobile, 13/1300/1800; +61 and 0011 61 forms) — `publicPhone` is now stored in national display form and the DTO exposes `telHref`; `validatePublicUrl` (http(s), no credentials, real host) applied to `publicUrl`; `validateLinks` (kind allowlist, host allowlist per known kind, one per known kind, ≤ 8) with `links[]` on create/PATCH (replace semantics) and in `BusinessDto`.
- **API**: `GET/PUT /admin/businesses/{id}/hours` (`listings.read` / `listings.write`), DTOs in `dto/hours.dto.ts` (`WeeklyHoursDto` keyed monday…sunday, `HoursExceptionDto`, `PutHoursDto`, `HoursDto` with `status`/`evaluatedAt`/`version`). Contracts regenerated (46 paths).
- **Admin app**: `pages/businesses/HoursEditor.tsx` (mode select, per-weekday closed / open 24 hours / intervals with native time inputs and "closes next day", date exceptions with kind/note/custom intervals, save with the business version, evaluated status tag; API field paths such as `weekly.monday.intervals.1.start` mapped onto form fields; `24:00` shown as `00:00` + next day because native time inputs cannot display 24:00); links rows (kind/URL/label) in the business editor; `toNamePath` helper for nested envelope errors.

Verification (all green, 2026-09-06):
- Unit: API 106 (incl. `melbourne-time.spec.ts` — AEDT/AEST offsets, gap 2026-10-04 02:30 → 03:30 AEDT, overlap 2026-04-05 02:30 → first occurrence; `hours-rules.spec.ts` — multiple intervals, overnight, open-24, closed, spill conflicts, exception override, both DST transitions with wall-clock semantics, unknown mode; phone/link rules), admin 60, database 23, e2e 19.
- Integration (real MySQL/Redis): 43 API + 5 database — `hours.integration-spec.ts`: phone/link/website rejection with field paths and DB row replacement, unknown default, 401/403/409 on hours, validation paths for overlaps/format/exception duplicates/empty custom, full schedule round trip (overnight Thursday, `24:00` Friday, open-24 Saturday, closed + custom exceptions), version bump, audit metadata, and clearing back to unknown.
- Root `pnpm check` green; `pnpm install --frozen-lockfile --offline` clean; contracts in sync.
- Runtime: against the user's running API (port 3001, watch process left untouched) — restore of the verification listing, PUT hours 200 with evaluated status, overlap → 400 `weekly.monday.intervals.1.start`, links + `1300` phone → `telHref tel:+611300123456`. Browser (private API instance on 3011 + temporary admin dev server, both stopped afterwards): hours editor loaded the stored schedule, "Save hours" → PUT 200 and toast, links rows populated. The dev admin password was rotated again afterwards (temporary value confirmed rejected).
- Secrets: trackable-file scan clean; env files ignored.

Decisions:
- Hours are stored as wall-clock minutes and evaluated with Intl (Node 24 has no Temporal); the converter is the single place that encodes the DST gap/overlap policy.
- `publicPhone` is normalised to the national display form on save so the public "Call" action is always a valid `tel:` link; non-Australian numbers are rejected (Melbourne-only directory).
- Media re-scoped to Phase 20 (see the scope note above).

Limitations / follow-ups: cross-date overlap between a custom exception's overnight interval and the following day's hours is not checked (within-day and weekly spill are); "Open now" search filter remains off pending Phase 14 (DIR 008); the public rendering of hours/links/directions comes with the public detail page (Phase 14).


## Phase 14 — Public directory (complete, 2026-09-06)

SRS: DIR 001–006 (published-only cards with fallback image, name, primary category, area, rating or "No reviews yet"; AND-combined keyword/category (incl. active descendants)/area/minRating filters; SearchService with indexed name prefix ranking and description fallback; sorts relevance/rating/newest/name with documented tie rules; page-numbered pagination ≤ 50, window ≤ 10,000, `total`/`pageCount`, unknown slug → empty result, invalid enum/range → field error; URL-persisted state with chips, reset, counts, loading/retry/no-result states; a failed request is never shown as zero results), DIR 008 (no "Open now" filter yet), BUS 001/003/005 (public detail: description, categories, services, approved address or service area, phone `tel:`, website, social links with safe `rel`, hours with accuracy note, directions link from validated coordinates/address, related listings ≤ 4 same category preferring same area, hidden when none), UX 001–003 (Tailwind + shadcn-style components in `packages/ui`, sky-blue/navy tokens, public nav with Home/Directory + email "Add or update a business" action, route contract `/business`, `/business/category/{slug}`, `/business/area/{slug}`, `/business/{slug}`; no city route), API 002/004 (envelopes, 404 for unpublished, bounded pagination/sort keys), CACHE 001 (explicit Next.js data-cache configuration per fetch), SEO 001/003 basics (one H1, title/description, absolute canonical, `noindex,follow` for filtered searches — full SEO in Phase 21), NFR 006/007/011/013 (WCAG-minded markup, no horizontal scroll at 320 px, no Refine/antd in public JS), ARC 002 (web reads through the API only).

Acceptance criteria:
1. API `SearchService` (`apps/api/src/business/search/`): `GET /businesses` with `q` (0–120, whitespace/case normalised), `category` (slug; active descendants included), `area` (slug), `minRating` (1–5), `sort` (`relevance | rating | newest | name`; relevance default with `q`, name otherwise; relevance without `q` behaves as name), `page`, `pageSize ≤ 50`, window ≤ 10,000 → 400 `page`. Ranking: exact name < name prefix < name contains < category/service/synonym label match < description match, then name, then id. Rating sort: rated before unrated, average desc, count desc, id. Newest: `firstPublishedAt` desc, id. Name: `utf8mb4_unicode_ci` order, id. `meta` carries `total`, `pageCount` and `facets` (category and area counts from the same publication scope and the other active filters). Keyword search never touches private fields (encrypted enquiry email, notes).
2. `GET /businesses/{slug}` public projection (404 unless published): card fields + description, secondary categories, services, contact (phone display + `telHref`, email, website), links, address only when `addressVisibility = full` (with `directionsUrl` built from coordinates, else the address text), otherwise `serviceArea` only, hours (`mode`, weekly, upcoming exceptions, status now), rating summary or null, `related` (≤ 4). `GET /businesses/{id}/related` exposes the same list. Public responses carry `Cache-Control: public, max-age=60` (short, pending Phase 22 invalidation).
3. `packages/ui`: Tailwind v4 + `class-variance-authority`/`clsx`/`tailwind-merge` shadcn-style primitives (Button with `asChild`, Card, Badge, Input, Select, Chip), design tokens (sky-blue/navy, surfaces, focus ring) as CSS variables; no admin coupling.
4. `apps/web`: public shell (header nav Home/Directory + mailto action from `SITE_CONTACT_EMAIL`, footer, skip link, landmarks), pages `/` (intro, category and area discovery), `/business` (GET filter form, chips, count, sort, pagination, empty/error/loading states, `noindex,follow` when filtered), `/business/category/[slug]`, `/business/area/[slug]` (editorial intro + listings, 404 for unknown/inactive), `/business/[slug]` (BUS 001 sections, hours table with today highlighted and accuracy note, contact actions, related, "No reviews yet"), `not-found`, `error` (retry) and `loading` boundaries. Server components fetch through `API_ORIGIN` with explicit `next.revalidate` (taxonomy 300 s, search 30 s, detail 60 s) and tags for later invalidation; metadata with absolute canonical from `SITE_ORIGIN`.
5. Tests: API unit (query normalisation/ranking helpers), API integration (`search.integration-spec.ts`: publication scope, descendant categories, AND filters, minRating, each sort's tie rules, pagination/window errors, unknown slug empty, facets, detail projection without private fields, address visibility, related preference/limit, 404 for draft/archived); web Vitest unit tests (search-param parsing/serialisation, chips, hours display); root `pnpm check` incl. web build; runtime browser verification at 320 px and desktop; secret scan; docs/traceability.
Out of scope: hero/search suggestions (Phase 15), reviews (Phase 16), enquiries (Phase 17), blog/about/contact/policy pages (Phases 18–19, 22), media (Phase 20), sitemap/JSON-LD/redirects (Phase 21), cache purge (Phase 22), "Open now" (DIR 008 decision after Phase 14 data review).

Delivered:
- **Public API** (`apps/api/src/business/search/`, `dto/public-business.dto.ts`, `directory-public.controller.ts`): `GET /businesses` (q ≤ 120 normalised, `category` incl. active descendants, `area`, `minRating`, `sort` relevance/rating/newest/name with DIR 004 defaults and tie rules, `page`/`pageSize ≤ 50`, window ≤ 10 000 → 400, `meta.facets` for categories and areas computed in the same publication scope), `GET /businesses/{slug}` (404 unless published) and `GET /businesses/{id}/related` (≤ 4, same primary category, same area first, never padded). Keyword matching is a ranked LIKE over public fields only (name exact → prefix → contains → category/service/synonym labels → description); LIKE metacharacters are escaped. Address is returned only when `addressVisibility = full`, with a `directionsUrl` from coordinates or the address text; private fields are never serialised. `Cache-Control: public, max-age=60`.
- **`packages/ui`** (new workspace package, SRS ARC 001 table): Tailwind v4 tokens (`src/styles.css`: sky/navy palette, light and dark surfaces, `--ms-link`/`--ms-hero-text`, focus ring, reduced-motion rule, documented contrast pairs) and shadcn-style primitives (Button with `asChild`, Card*, Badge, Input, Select, Label, Chip) on `class-variance-authority`/`clsx`/`tailwind-merge`/`@radix-ui/react-slot`. Server-component safe, no admin coupling.
- **`apps/web`**: shell with skip link, landmarks, nav (Home, Directory, mailto "Add or update a business") and footer; `/` discovery home; `/business` (route group `(list)` so its loading boundary cannot mask sibling 404s) with a plain GET filter form, removable chips, result count, sort, pagination, empty/past-the-end/error states; `/business/category/[slug]` and `/business/area/[slug]` (editorial intro, breadcrumbs, 404 for unknown/inactive); `/business/[slug]` (BUS 001 sections, hours table with today highlighted, upcoming exceptions and a correction mailto, tel/directions/website actions with `rel="noopener noreferrer nofollow"`, service-area fallback, "No reviews yet", related listings); `not-found` and `error` boundaries. Server-side fetching through `API_ORIGIN` with explicit `next.revalidate` per resource (taxonomy 300 s, search 30 s, detail 60 s) and cache tags for Phase 22. Metadata: one H1, title template, absolute canonical from `SITE_ORIGIN`, `noindex, follow` on filtered searches.
- New env variables (documented in `apps/web/.env.example`, ignored `.env.local` locally): `SITE_ORIGIN`, `SITE_CONTACT_EMAIL` (both validated at use; no sample fallback address, CFG 002).

Verification (all green, 2026-09-06): `pnpm check` — database 23, API 110, admin 60, web 6, e2e 19, builds, contracts in sync (49 paths); `pnpm test:integration` — database 5, API 50 including `search.integration-spec.ts` (publication scope incl. archived, ranking, synonym and description matches, literal `%`, AND filters with descendants, rating/newest/name tie rules, facets, pagination bounds and six invalid-input 400s, detail projection with no private fields, hidden address, related preference and limit, 404 for draft). Runtime: every public route's status code (unknown category/area/business → 404), canonical and `robots` metadata, `tel:`/directions/`rel` attributes, no Refine or Ant Design in any public chunk; browser at 1280 px and 320 px (no horizontal overflow, 44 px targets in the header) in light and dark schemes.

Decisions: search stays on indexed LIKE with a rank expression rather than FULLTEXT (DIR 003 permits a bounded indexed fallback; revisit under NFR 003 load); facets are returned with the results so the UI never issues a second count query; the cover image is `null` until the media pipeline (Phase 20) and clients render the tracked fallback SVG.

Limitations / follow-ups: `/business` streams, so an API failure there renders the error boundary with HTTP 200 (curated and detail pages return true 404s); featured placements (DIR 007), "Open now" (DIR 008), reviews, hero and suggestions, and the sitemap/JSON-LD arrive in Phases 15, 16, 21 and 22.


## Phase 15 — Hero, home settings and search suggestions (complete, 2026-09-06)

SRS: HERO 001–007 (Melbourne hero with solid-colour fallback and no unlicensed photography; one stable semantic H1 with 2–5 admin-managed rotating phrases, initial text in server HTML, 4 s dwell / 300 ms transition, reserved height; keyboard-accessible pause/resume, static under `prefers-reduced-motion`, paused while hidden, no per-phrase live-region announcements; rounded search panel with a fixed "Melbourne, Australia" text label, labelled keyword input, category control and named Search button, stacked on mobile; keyword covers names, categories and services incl. synonyms; grouped suggestions with 250 ms debounce, 2-character minimum, cap of 8, stale-response guard, arrows/Enter/Escape, no auto-navigation on focus; GET to `/business` with `q` and optional `category`, empty submission opens all listings, works without client JavaScript; no cities counter, optional admin-enabled counters from published records only, hidden when unavailable), CFG 001 (editable site settings, server-side validation, versioned edits, recorded actor, secrets never in content settings), API 002/004 (`GET /site and /home` row of the §15 table; conservative public GET rate ceiling; allowlisted inputs), RBAC 001 (`settings.manage`), SEC 002 (rate limiting in Redis), NFR 001/006/011 (no layout shift, WCAG pause requirement, keyboard operation, 320–1440 px and 200 % zoom).

Acceptance criteria:
1. Migration `site_settings` (singleton row per key, JSON payload, `version`, `updatedByAdminId`, timestamps) with the harness table list updated.
2. `SettingsModule`: typed home settings (stable `heroHeadline`, 2–5 `heroPhrases` ≤ 60 chars each, `countersEnabled`) validated server-side; admin `GET/PUT /api/v1/admin/settings/home` (`settings.manage`, `expectedVersion` → 409 `STALE_VERSION`, audited `settings.home.update`); public `GET /api/v1/home` returning the hero payload plus counters only when enabled and computed from published/active records (omitted otherwise, never invented). Defaults are the SRS's own example wording, not sample content.
3. `GET /api/v1/search/suggestions?q=` (2–120 chars): grouped `categories`, `services`, `businesses` from active/published records only, at most 8 in total, name-prefix ranked, service synonyms matched, no private content; per-IP fixed-window ceiling in Redis (30/min) returning 429 with `Retry-After`, 503 when the limiter is unavailable (suggestions are progressive; the search form keeps working).
4. Web hero: server-rendered H1 and first phrase, rotating phrase in a reserved-height slot with a pause/resume button, static first phrase under `prefers-reduced-motion`, rotation paused when the document is hidden, rotating text `aria-hidden` behind one stable accessible headline; search panel with fixed location text, labelled input, optional category select and Search button submitting GET to `/business`; counters rendered only when the API provides them.
5. Web suggestions: progressive-enhancement combobox (ARIA 1.2 pattern) with 250 ms debounce, 2-character minimum, ≤ 8 grouped options, arrow/Enter/Escape handling, stale responses ignored, failures silent (form still submits), no navigation on focus alone.
6. Admin: Site settings screen (`settings.manage`) editing the headline, phrases (2–5) and counter toggle with `expectedVersion` and field errors.
7. Tests: API unit (settings validation, suggestion ranking), integration (settings round trip, permission denial, stale 409, audit row; suggestions grouping/cap/minimum/rate limit/published scope), admin unit (settings screen), web unit (hero rotation helpers, suggestion state machine); root gate plus runtime checks at 320/375/768/1024/1440 px, 200 % zoom, keyboard only and reduced motion.
Out of scope: the licensed hero photograph and focal-point controls (needs the media pipeline in Phase 20 and a client asset — the solid navy gradient fallback required by HERO 001 ships now), featured placements (Phase 22), latest posts on `/home` (Phase 18), static pages and the rest of CFG 001/002 (Phase 22).

Delivered:
- **Migration** `20260906081252_site_settings`: `site_settings` (key PK, validated JSON payload, `version`, `updatedByAdminId` FK `SET NULL`, timestamps); added to the integration harness truncation list.
- **`SettingsModule`** (`apps/api/src/settings/`): `home-settings.ts` (server-side validation of headline, 2–5 unique phrases ≤ 60 chars, counters toggle; SRS wording as the default document), `settings.service.ts` (version check → 409 `STALE_VERSION`, actor recorded, `settings.home.update` audited, stored documents that fail validation fall back to defaults rather than breaking the site), admin `GET/PUT /api/v1/admin/settings/home` (`settings.manage`, `expectedVersion` accepts 0 before the first save) and public `GET /api/v1/home` (hero content plus counters only when enabled, counted from published/active records, silently omitted if the count fails).
- **Suggestions**: `GET /api/v1/search/suggestions` (`SuggestionsService`) returning grouped categories, services (matched on label or synonym, with the matched synonym as the hint) and published businesses (hint: local area), name-prefix ranked, capped at eight overall with every group represented, minimum two characters, LIKE metacharacters escaped. `PublicRateLimitService` adds a fixed-window per-IP ceiling (30/min) in Redis → 429 with `Retry-After`, and 503 when the limiter is unavailable (suggestions are progressive; the form still works).
- **Web hero**: `hero-headline.tsx` (server-rendered first phrase, `useSyncExternalStore` for reduced-motion and page visibility so no motion is implied before hydration, 4 s dwell / 300 ms fade, invisible longest phrase reserves width and height, one stable `sr-only` headline with the rotating text `aria-hidden`, pause/resume button with `aria-pressed`), `hero-search.tsx` (GET form to `/business`, fixed "Melbourne, Australia" text, labelled keyword combobox, optional category select, Search button; suggestions with 250 ms debounce, two-character minimum, term-keyed results so stale responses can never render, arrow/Enter/Escape handling, no navigation on focus, silent failure). New fixed `panel` tokens in `packages/ui` because the hero panel sits on a permanently dark surface and must not follow the colour scheme.
- **Admin**: Site settings screen (`settings.manage`) for the headline, 2–5 phrases and the counter toggle, with `expectedVersion`, field errors and stale handling; navigation entry gated by the permission.

Verification (all green, 2026-09-06): `pnpm check` — database 23, API 112, admin 62, web 11, e2e 19, builds, contracts in sync (52 paths); `pnpm test:integration` — database 5, API 54 (`settings-suggestions.integration-spec.ts`: defaults before any save, 401/403/409/400 paths, audit metadata, counters appearing and disappearing with the toggle, suggestion grouping and exclusion of drafts and inactive terms, minimum length, literal `%`, rate limit with `Retry-After`). Runtime against the running API and a production web build: rotation advances and stops on pause (`aria-pressed`, label swap) with a stable H1 height, suggestions return live grouped results, arrow keys move `aria-activedescendant`, Escape closes without navigating, Enter on an active option opens the business, the plain form submit reaches `/business?q=bakery&category=cafes`, and 320 px dark mode shows no overflow and a readable hero panel.

Decisions: the hero ships with the navy gradient fallback that HERO 001 requires, because licensed Melbourne photography is a client asset and the media pipeline is Phase 20; hero phrases are real admin-managed settings (a first slice of CFG 001) rather than hard-coded copy; counters stay off by default and are hidden whenever the numbers cannot be read.

Limitations / follow-ups: hero image, focal points and the image slot (Phase 20); featured placements and latest posts on `/home` (Phases 18 and 22); Next.js dev mode does not hydrate inside the sandboxed browser pane (its HMR socket is blocked), so interactive verification runs against `next start`.


## Phase 16 — Reviews, ratings, abuse reports and moderation (complete, 2026-09-06)

SRS: REV 001–005 (1–5 whole-number rating, 2–80 character display name, private email ≤ 254 characters never made public, 20–3000 character plain-text review, guidelines and privacy acknowledgement recorded; publication/limit/Turnstile/honeypot/rate checks before acceptance; pending on creation with a neutral receipt; states pending/approved/rejected/spam with reasons, audit and transactional aggregate updates; original text always retained, redaction keeps the original and a reason, ratings never edited; mean = approved sum ÷ approved count, unrounded for sorting, null at zero count, no double counting; keyed email + business hash flags repeat submissions within 30 days for review, repeated idempotency keys return the original outcome, duplicates and bursts go to moderation), REP 001–002 (report an approved review with a reason enum, optional ≤ 1000 character details and optional private contact; spam controls; acknowledgement never reveals the reporter; target and content snapshot persisted so reports outlive removal; open/investigating/resolved with outcome and moderator; reports never auto-remove content and never disclose private content for unpublished targets), API 003 (scoped Idempotency-Key, payload fingerprint, 24 h retention, 201 for pending reviews/reports, replays return the original receipt without duplicate rows or mail), API 004 (64 KB bodies, unknown fields rejected), SEC 002/003 (server-side Turnstile with expected hostname/action, honeypot as a supplement, review limits 5 per 15 minutes and 20 per day per IP, reports 5 per hour, keyed burst signals, fail-safe on limiter or CAPTCHA failure — never a silent bypass), DAT 002/003 (keyed email hashes, encrypted recoverable private contact, moderation history survives public removal), PRIV 001 (acknowledgement version and timestamp stored per submission; only necessary data collected), RBAC 001 (`reviews.moderate`, `reports.manage`), DIR 001 (zero reviews reads "No reviews yet").

Acceptance criteria:
1. Migration: `reviews` (business FK, display name, encrypted private email, keyed email hash, rating 1–5 check, original and public text, status enum, moderation fields, acknowledgement version/time, hashed submitter IP, version, timestamps; indexes on business+status+createdAt and emailHash+business+createdAt), `abuse_reports` (review target, reason enum, details, encrypted reporter email, status/outcome, moderator, target snapshot, version, timestamps), `idempotency_records` (hashed key + scope PK, payload fingerprint, stored response, expiry). Harness table list updated.
2. Public API: `POST /api/v1/businesses/{id}/reviews` → 201 neutral receipt (`{data:{receiptId, status:'pending'}}`), rejecting unpublished businesses, invalid fields, failed Turnstile/honeypot and rate limits (429 with `Retry-After`; 503 when a limiter or the verifier is unavailable); `GET /api/v1/businesses/{id}/reviews` (approved only, newest default, pagination, no private fields); `POST /api/v1/reports` → 201 neutral receipt for approved-review targets only. Every public POST requires an `Idempotency-Key`; replays return the original receipt without new rows.
3. Moderation API (`reviews.moderate`, `reports.manage`): `GET /admin/reviews` (status, business, flagged-duplicate filters, pagination), `POST /admin/reviews/{id}/approve|reject|spam` with reason and `expectedVersion`, `PATCH /admin/reviews/{id}/redaction` (public text + reason, original preserved, rating untouched); `GET /admin/reports`, `POST /admin/reports/{id}/investigate|resolve` (outcome retain/remove/spam, note). Aggregates move inside the same transaction as the decision and never double count; every action is audited.
4. Web: approved reviews and the rating summary on the business page, plus a review form (rating, name, email, text, guidelines acknowledgement, honeypot, Turnstile when a site key is configured — otherwise the form explains submissions are unavailable rather than pretending to work) that shows the neutral receipt and preserves input on error.
5. Admin: moderation queue for reviews (filters, decision dialogs with reason, redaction) and abuse reports (states, outcome), both permission-gated.
6. Tests: unit (aggregate arithmetic, rating rounding, idempotency fingerprints, Turnstile verifier failure paths), integration (submission validation and limits, pending scope never leaking into public reads or aggregates, idempotent replay, moderation transitions with aggregate correctness and double-decision protection, redaction preserving the original, repeat-submission flag, report lifecycle, permission denial), admin and web unit tests; root gate and runtime verification.
Out of scope: comments on blog posts (Phase 19 reuses this moderation core), enquiry delivery (Phase 17), retention purge jobs (Phase 22, fields are recorded now), public reviewer accounts (never in MVP).

Delivered:
- **Migration** `20260906084235_reviews_reports_idempotency`: `reviews` (encrypted private email, keyed `emailHash`, `rating` with a `BETWEEN 1 AND 5` check constraint, original and optional redacted text, status enum, moderation fields, acknowledgement version/time, hashed submitter IP, version), `abuse_reports` (review target, reason/outcome enums, encrypted reporter email, target snapshot, status, version), `idempotency_records` (scope + hashed key PK, payload fingerprint, stored receipt, expiry). Harness truncation list updated.
- **Public API**: `POST /businesses/{id}/reviews` (published businesses only, acknowledgement required, honeypot, Turnstile, 5 per 15 min and 20 per day per IP, 201 neutral receipt that is not the review id), `GET /businesses/{id}/reviews` (approved only, newest/highest/lowest, pagination), `POST /reports` (approved review targets; unknown or unapproved targets get the identical neutral receipt and create nothing). Both writes require an `Idempotency-Key`: a replay returns the original receipt with `Idempotent-Replay: true`, and the same key with a different body is a 409 `IDEMPOTENCY_KEY_REUSED`.
- **Moderation API**: `GET /admin/reviews` (status, business, `repeatFlagged`, `reported` filters), `POST …/approve|reject|spam` (reason required except approve, `expectedVersion`, repeated decisions rejected with 409), `PATCH …/redaction` (published text replaced or restored, original text and rating untouched), `GET /admin/reports`, `POST …/investigate|resolve` (outcome retain/remove/spam). The approved aggregate moves inside the moderation transaction, so totals cannot drift or double count; every action is audited.
- **Security**: `CaptchaPort` with a real `TurnstileVerifier` (server-side verification including hostname and action). Without `TURNSTILE_SECRET_KEY` the API answers 503 for public writes — never accepts them unverified — and production start-up now requires both `TURNSTILE_SECRET_KEY` and `PUBLIC_SITE_URL`. Limiter or verifier outages fail safe with 503; `SUBMISSION_TERMS_VERSION` is stored with every acknowledgement.
- **Admin**: Reviews moderation queue (filters, repeat and report flags, expandable original text and moderation contact, decision dialogs with reasons, redaction dialog) and Abuse reports queue (investigate, resolve with outcome and note), both permission-gated (`reviews.moderate`, `reports.manage`).
- **Web**: approved reviews and a moderated review form on the business page (rating radios, name, unpublished email, text, guidelines acknowledgement, hidden honeypot, Turnstile widget, neutral receipt, errors preserving input). Without a configured site key the form is replaced by an honest "submissions are temporarily closed" notice.

Verification (all green, 2026-09-06): `pnpm check` — database 23, API 117, admin 66, web 13, e2e 19, builds, contracts in sync (64 paths); `pnpm test:integration` — database 5, API 62 (`reviews.integration-spec.ts`: pending scope invisible in public reads and aggregates, encrypted email and hashed IP, validation and honeypot and captcha failures, unpublished target 404, missing idempotency key, replay returning the original receipt with no extra rows, key reuse conflict, fail-safe 503, per-IP ceiling, repeat flag, permission denial, approve/reject/re-approve aggregate correctness with no double counting, redaction preserving the original, report lifecycle with neutral receipts for unknown targets and reports never changing the review). Runtime: the live API serves the 12 new paths, refuses a submission without an idempotency key (400) and answers 503 while no Turnstile secret is configured; the public business page renders the reviews section, "No reviews yet" and the closed-submissions notice.

Decisions: the captcha verifier is a port with one real implementation — no development bypass exists, because a bypass would make the check meaningless (SEC 003); receipts are truncated identifiers, so a receipt cannot be used to look up or guess a review; resolving a report never changes the reported review, matching REP 002.

Limitations / follow-ups: real Turnstile keys are a client account (decision D03) and must be set before public launch; retention purges for rejected reviews, reporter details and IP signals are Phase 22; comment moderation reuses this core in Phase 19; the reviewer-facing guidelines page is Phase 22 (the form links to `/review-guidelines`, which will 404 until then).


## Phase 17 — Enquiries, transactional outbox and the worker application (complete, 2026-09-06)

SRS: ENQ 001–007 (form fields and acknowledgement that details are shared with the named business, no marketing consent bundling, no attachments; the recipient always comes from the listing configuration and a listing without one cannot accept a form; enquiry and outbound event saved in one MySQL transaction with a 202 receipt that never claims delivery; a transactional outbox dispatcher enqueues BullMQ jobs so queue downtime loses nothing; delivery states queued/providerAccepted/delivered/retrying/failed/suppressed kept separate from handling states new/inProgress/closed; stable message ids, bounded retries with exponential backoff; verified sender with the visitor address only as Reply-To, escaped content, plain-text body, header-injection prevention, no provider credentials or recipient addresses in browser responses; recipient and listing rechecked before dispatch, suppressed with an alert when routing is no longer valid; permission-restricted admin views with no public listing or export; enquiry contents excluded from logs and analytics), EVT 001–002 (durable outbox rows with id, type, resource id and version, occurrence time and correlation id; payloads carry identifiers, never private message bodies; dispatcher retries until enqueue succeeds; consumers deduplicate by event id and tolerate repeats; five attempts with exponential backoff and jitter, then a visible failed state; permission-protected audited manual retry), ARC 003 (`apps/worker` as an independently operable Nest-compatible BullMQ runtime), API 003/004 (idempotent public POST with a 202 receipt, 64 KB bodies), SEC 002 (three enquiries per 15 minutes and ten per day per IP, Turnstile and honeypot), DAT 002/PRIV 001 (encrypted recoverable contact details, retention fields, acknowledgement version).

Acceptance criteria:
1. Migration: `enquiries` (nullable business for site contact, kind, name, encrypted email and phone, subject, message, acknowledgement version/time, hashed submitter IP, handling status, delivery status, attempt count, provider message id, last error, suppression reason, version, timestamps), `outbox_events` (type, resource type/id/version, correlation id, identifier-only payload, status, attempts, availableAt, dispatchedAt) and `provider_message_events` (provider event id unique, kind, received at) for future webhook deduplication. Harness list updated.
2. API: `POST /api/v1/businesses/{id}/enquiries` and `POST /api/v1/contact` → 202 `{receiptId, status:'accepted'}` after the enquiry and its outbox row commit together; recipient resolved server-side from the listing's private enquiry email (or the configured site recipient), never from the request; a listing without a routable recipient answers 409 `NO_ENQUIRY_ROUTE` and the web form is replaced by phone/website/correction actions. Idempotency-Key, Turnstile, honeypot and the SEC 002 ceilings apply exactly as for reviews.
3. Outbox dispatcher: a polling dispatcher inside the API claims pending rows transactionally and enqueues BullMQ jobs keyed by event id; enqueue failures leave the row pending for the next pass, and a dispatched row is never enqueued twice for the same attempt.
4. `apps/worker`: a standalone Nest application (own package, `pnpm dev:worker`, its own README) running a BullMQ worker for `enquiry.email` jobs with five attempts, exponential backoff with jitter and a visible failed state; it loads the enquiry, rechecks the business is still published with a valid recipient (otherwise suppresses with an audited reason), sends through the shared `MailerPort` with a configured verified sender, the visitor address as Reply-To only, an escaped plain-text body and header-injection protection, then records the delivery state and provider message id.
5. Admin: `GET /admin/enquiries` (business, handling status, delivery status filters), `GET /admin/enquiries/{id}`, `PATCH …/{id}` (handling status with `expectedVersion`), `POST …/{id}/retry` (`enquiries.manage`, audited, refuses when nothing is retryable); an Enquiries screen showing target, times, delivery and handling status and the contact details, gated by `enquiries.read`/`enquiries.manage`.
6. Web: enquiry form on the business page mirroring the review form's protections, with the acknowledgement wording required by ENQ 001 and a 202 receipt that says the message was accepted, not delivered.
7. Tests: unit (outbox claim semantics, backoff, mail body escaping and header injection, delivery state machine), integration (transactional accept, no route → 409, idempotent replay, rate limits, admin filters and permission denial, retry path, suppression when the listing is unpublished), worker unit tests, admin and web tests; root gate and runtime verification with the console transport.
Out of scope: provider webhook ingestion and bounce/complaint processing (ENQ 006 — the signature scheme belongs to the chosen provider, decision D03; the deduplication table and delivery states are in place), visitor receipt emails (default off per ENQ 005), the public Contact page (Phase 22 static pages; the API route exists), retention purges (Phase 22).

Delivered:
- **Migration** `20260906151604_enquiries_outbox`: `enquiries` (nullable business for site contact, encrypted email and phone, acknowledgement version/time, hashed submitter IP, separate handling and delivery states, attempts, provider message id, last error, suppression reason, version), `outbox_events` (type, resource type/id/version, correlation id, identifier-only payload, status, attempts, `availableAt` backoff, dispatchedAt) and `provider_message_events` (unique provider event id, ready for webhook deduplication).
- **API**: `POST /businesses/{id}/enquiries` and `POST /contact` → 202 with a receipt that says accepted, not delivered; the enquiry row and its outbox event commit in one transaction, so an accepted request is never lost. The recipient is read from the listing (or the configured site address) and there is no destination field in the request; a listing without one answers 409 `NO_ENQUIRY_ROUTE` and the public page shows phone, website and a correction mailto instead. Idempotency-Key, Turnstile, honeypot and the SEC 002 ceilings (3 per 15 minutes, 10 per day) apply as for reviews. Admin: `GET /admin/enquiries` (+ filters), `GET/PATCH /admin/enquiries/{id}` (handling status, `expectedVersion`) and `POST …/retry` (`enquiries.manage`, audited, refuses anything that is not failed or suppressed).
- **Outbox dispatcher** (`apps/api/src/outbox/`): claims due rows with a conditional update so two dispatchers cannot take the same event, enqueues through a `QueuePort` (BullMQ in production, a recording queue in tests) using the event id as the job id, marks rows dispatched, and on failure leaves them pending with exponential backoff until the five-attempt budget is spent.
- **`apps/worker`** (new application, SRS ARC 003): standalone BullMQ consumer with its own configuration validation (refuses the console transport and a missing sender in production, and states plainly that no provider adapter exists yet), an `EnquiryMailerPort` with a console transport, AES-256-GCM field decryption, and delivery that re-reads the listing at dispatch time — unpublished listings or missing recipients are suppressed with a reason instead of emailed. Transient failures are rethrown for BullMQ's retries; permanent ones are recorded as failed; exhausted jobs mark the enquiry failed so an admin can retry.
- **`packages/domain`** (new shared package): the enquiry mail composition (header sanitisation, Reply-To validation, plain-text body) and the queue names, retry policy and Redis connection parsing, imported by both the API and the worker so the invariant is shared rather than copied (SRS ARC 002).
- **Admin**: Enquiries screen with separate delivery and handling columns, expandable message and contact details, start/close actions and an audited retry dialog, gated by `enquiries.read`/`enquiries.manage`. **Web**: enquiry form on the business page with the ENQ 001 acknowledgement, honeypot, Turnstile and an "accepted" receipt; listings that cannot be routed show contact actions and a correction link instead.

Verification (all green, 2026-09-06): `pnpm check` — database 23, API 117, admin 69, web 13, domain 6, worker 9, e2e 19, all builds, contracts in sync (69 paths); `pnpm test:integration` — database 5, API 69 (`enquiries.integration-spec.ts`: transactional accept with the outbox row and identifier-only payload, encrypted contact details, no-route 409, validation and honeypot and captcha failures, rejected destination field, missing idempotency key, replay creating nothing, per-IP ceiling, queue outage leaving events pending and dispatching them afterwards with the event id as the job id, admin filters and permission denial, handling state independent of delivery, retry rules and audit trail). Runtime: a private API instance (Cloudflare's published always-pass test key) accepted an enquiry with 202, the dispatcher enqueued it, and the worker delivered it through the console transport with the visitor address as Reply-To — the enquiry ended at `providerAccepted` with the outbox row `dispatched`. The API's own hostname check was observed rejecting a token whose hostname did not match, before the site origin was aligned.
- Test-suite stability: the admin suite now caps Vitest at two workers and allows 2.5 s for async queries, after interaction-heavy Ant Design specs proved load-dependent; three consecutive full runs pass with steady timings.

Decisions: the message body never enters a queue payload or a log, only identifiers; delivery state and handling state are separate columns and are never conflated in the UI; a provider timeout is treated as ambiguous, so the retry dialog warns before re-sending; `packages/domain` was added to the workspace (an addition to the SRS ARC 001 table) because the worker must apply the same mail rules as the API and copying them would violate ARC 002.

Limitations / follow-ups: no email provider adapter exists (decision D03) — the console transport is development-only and the worker refuses to start in production without a real one; webhook ingestion and bounce/complaint processing (ENQ 006) wait for the same decision, though the deduplication table and delivery states are ready; visitor receipt emails stay off (ENQ 005); the public Contact page arrives with the static pages (Phase 22), and `SITE_ENQUIRY_RECIPIENT` must be set for general enquiries to be accepted; retention purges are Phase 22.


## Phase 18 — Blog and editorial content (admin core) (complete, 2026-09-06)

SRS: BLOG 001 (admin-only articles with title, unique stable slug, excerpt, sanitised rich content, author attribution, primary category, optional tags, cover image, publication and updated dates and SEO fields; the public author identity is separate from the admin login and email), BLOG 002 (draft/scheduled/published/archived; title, content, author, active category and a valid slug required before publish or schedule; scheduled timestamps stored in UTC while the admin works in Australia/Melbourne with the offset shown; idempotent scheduled publishing with a periodic catch-up so a missed run never strands due posts), BLOG 003 (preview only for an authenticated authorised admin through a short-lived route, `noindex` and `no-store`, excluded from sitemaps; a public draft lookup is 404; updating a published article creates a revision and invalidates public content; first publication date preserved separately from `updatedAt`), §14 (Post, Author, BlogCategory, Tag, ContentRevision entities), DAT 004–006 (indexes on post status and publish time, unique slugs even for archived content, atomic publication with outbox insertion, optimistic versions, reviewed migrations), SEC 001 (allowlist sanitisation, stored-XSS protection in admin previews as well as public pages), RBAC 001 (`posts.write`, `posts.publish`), EVT 001 (publication events on the outbox for later cache invalidation).

Acceptance criteria:
1. Migration: `authors` (display name, slug, bio, public image placeholder, active, version), `blog_categories` and `blog_tags` (name, unique slug, active, landing content, version), `posts` (title, unique slug incl. archived, excerpt, `bodyMarkdown`, `sanitizedBody`, status enum, `scheduledAt`, `firstPublishedAt`, `publishedAt`, `archivedAt`, `commentsEnabled`, SEO title/description, author FK RESTRICT, primary category FK RESTRICT, cover media placeholder, version), `post_tags` join, `content_revisions` (resource type/id, version, sanitised snapshot, actor, reason). Indexes per DAT 004. Harness list updated.
2. Sanitisation: authoring is Markdown; the server converts it and sanitises the result with an explicit allowlist (headings, paragraphs, lists, emphasis, links with safe protocols and `rel`, blockquote, code, images with required alt, tables) — scripts, event handlers, iframes, styles and `javascript:`/`data:` URLs are always removed. Unit tests cover each attack shape.
3. Admin API (`posts.write` / `posts.publish`): CRUD for authors, blog categories and tags (slug rules, activate/deactivate, `expectedVersion`, `TERM_IN_USE` when a term is referenced by a non-archived post); posts list with filters (status, category, tag, author, search), create/PATCH with `expectedVersion`, and explicit `publish`, `schedule`, `unpublish`, `archive`, `restore` actions with the BLOG 002 gates (409 `PUBLICATION_BLOCKED` listing what is missing) and slug lock after first publication. Publication writes a `post.published` outbox event in the same transaction and stores a revision of the previous sanitised body.
4. Preview: `GET /admin/posts/{id}/preview` returns the sanitised body with `Cache-Control: no-store` for `posts.write` holders only; there is no public draft route, and unauthenticated access is 401/404 rather than a redirect.
5. Scheduled publishing: a worker job that runs every minute, claims due scheduled posts transactionally, publishes them idempotently (already-published posts are skipped), records the outbox event, and catches up after downtime. Tests cover the catch-up path and a Melbourne daylight-saving boundary.
6. Admin UI: Posts list and editor (Markdown body with live preview, excerpt, author/category/tag selectors, SEO fields, comments toggle, schedule picker showing Melbourne time and the resulting UTC instant), plus Authors, Blog categories and Tags screens; all permission-gated.
7. Tests: unit (sanitiser, slug and publication gates, schedule conversion), integration (CRUD, gates, slug lock, revisions, preview permissions, scheduling and catch-up, taxonomy references, permission denial), admin tests; root gate and runtime verification.
Out of scope: public blog pages, comments and related articles (Phase 19), cover images beyond the reference field (Phase 20 media), SEO metadata beyond per-post title/description (Phase 21), author archive pages (never in MVP).

Delivered:
- **Migration** `20260906160308_blog_posts_authors_taxonomy`: `authors` (public byline, separate from `admin_users`), `blog_categories`, `blog_tags`, `posts` (title, unique slug incl. archived, excerpt, `bodyMarkdown` + `sanitizedBody`, status enum, scheduling and publication timestamps, SEO fields, comments toggle, version), `post_tags`, `content_revisions` (unique per resource and version). Indexes per DAT 004 on status with published and scheduled time, category and author.
- **Sanitisation** (`apps/api/src/blog/sanitise.ts`): Markdown is rendered with `marked` 18 and then filtered by `sanitize-html` 2.17 against an explicit allowlist — headings, text, lists, quotes, code, tables, links and images only; `http`/`https`/`mailto`/`tel` schemes only; external links forced to `rel="noopener noreferrer nofollow" target="_blank"`; images given `alt` and lazy loading. Unit tests assert that scripts, event handlers, iframes, styles, forms, objects, SVG and `javascript:`/`data:`/`vbscript:` URLs never survive.
- **Editorial API**: authors, blog categories and blog tags with generated slugs, sanitised landing content, `expectedVersion` and activate/deactivate guarded by `TERM_IN_USE` when a live article still uses them; posts with list filters (status, category, tag, author, search, sort allowlist), create/PATCH, and explicit `publish`, `schedule`, `unpublish`, `archive`, `restore`. Publishing enforces the BLOG 002 gates (409 `PUBLICATION_BLOCKED` listing what is missing), locks the slug after first publication, preserves `firstPublishedAt`, writes a `post.published`/`post.updated`/`post.removed` outbox event in the same transaction, and stores a `ContentRevision` of the previous sanitised body whenever a published article changes.
- **Preview**: `GET /admin/posts/{id}/preview` returns the sanitised body for `posts.write` holders with `Cache-Control: no-store, private` and `X-Robots-Tag: noindex, nofollow`; there is no public draft route at all, so an unauthenticated lookup is 404 and an unauthenticated preview is 401.
- **Scheduled publishing**: `ScheduledPublishingService` scans every minute, claims due posts by row version and publishes them idempotently with their outbox event, so a scan that runs late (or twice) publishes each post exactly once and never strands one.
- **Admin UI**: Articles list (status and search filters in the URL, incomplete and scheduled markers), the article editor (Markdown body, sanitised server-side preview shown verbatim, author/category/tag selectors, SEO fields, comments toggle, revision reason, publish/schedule/unpublish/archive/restore dialogs with the blockers from the API, and a Melbourne-time schedule picker that sends a UTC instant), plus Authors, Blog categories and Blog tags screens. All gated by `posts.write`/`posts.publish`.

Verification (all green, 2026-09-06): `pnpm check` — database 23, API 127, admin 75, web 13, domain 6, worker 9, e2e 19, builds, contracts in sync (90 paths); `pnpm test:integration` — database 5, API 77 (`blog.integration-spec.ts`: slug generation and collisions, sanitisation of body and landing content, publication gates with field-level reasons, permission denial for a write-only role, slug lock, revision capture with the first publication date preserved, preview headers and unauthenticated 401/404, scheduling refusals for past times, catch-up publication across the 2026-10-04 AEDT transition with idempotency, `TERM_IN_USE` for author/category/tag, archive/restore transitions and the audit trail). Runtime against the live API: 21 blog paths served, a created draft had its `<script>` stripped and its external link marked `rel="noopener noreferrer nofollow"`, publish set `firstPublishedAt`, the preview returned `no-store, private` with `X-Robots-Tag: noindex, nofollow`, and a public post lookup returned 404.

Decisions: articles are authored in **Markdown** and stored with the sanitised HTML beside the source — the preview therefore shows exactly what will be published, and a future editor change cannot bypass the sanitiser; the public author identity is a separate `authors` table that grants no access; scheduling stores UTC while the admin picker works in Melbourne time and shows the offset, with the conversion unit-tested across a daylight-saving boundary.

Limitations / follow-ups: public blog pages, comments and related articles are Phase 19; cover images are a reference field until the media pipeline (Phase 20); per-post SEO fields exist but sitemaps, JSON-LD and redirects are Phase 21; the outbox events are written but cache invalidation consumes them in Phase 22.


## Phase 19 — Public blog pages and comment moderation (complete, 2026-09-06)

SRS: BLOG 004 (article page with heading hierarchy, byline, date, cover, body, tags, share links without third-party widgets, related articles and approved comments; related articles prefer the shared category then tags, exclude self and unpublished content and return at most four with a deterministic tie order), BLOG 005 (blog index and category/tag pages server-rendered, 12 articles per page, newest published first; a tag without substantive editorial landing content is `noindex`; no author archive pages), COM 001 (name 2–80, private email ≤ 254, plain-text comment 2–2000, no login, guidelines and privacy acknowledgement, all comments pending, approved/rejected/spam following the review moderation rules, only approved comments public, flat list), COM 002 (comments can be closed per article; submission rechecks publication and `commentsEnabled`; archived, draft or closed articles are rejected with a safe public error; chronological order with a stable id tie-break and page size 20; reporting and removal invalidate comment counts and pages), REP 001–002 (an abuse report may target an approved comment as well as a review; exactly one target), API 003/004 (idempotent public POST, 201 receipt, bounded pagination), SEC 002 (comment ceilings: five per 15 minutes and 20 per day per IP, Turnstile and honeypot), SEO 001/003 (server-rendered HTML, one H1, canonical, `noindex` for thin tag pages).

Acceptance criteria:
1. Migration: `comments` (post FK cascade, display name, encrypted private email, keyed email hash, original and optional redacted text, status enum, moderation fields, acknowledgement version/time, hashed submitter IP, version) and an `abuse_reports.commentId` column with the "exactly one target" invariant enforced by a check constraint and in the service.
2. Public API: `GET /posts` (12 per page, newest published first, category/tag filters, published-only), `GET /posts/{slug}` (404 unless published, sanitised body, byline, tags, related articles ≤ 4), `GET /blog-categories` and `GET /tags` (active terms with post counts and whether they have landing content), `GET /posts/{id}/comments` (approved only, chronological, 20 per page) and `POST /posts/{id}/comments` (201 neutral receipt; rejects closed comments, unpublished articles, failed Turnstile/honeypot/limits; requires an `Idempotency-Key`). `POST /reports` accepts a comment target.
3. Moderation: `GET /admin/comments` (status, post filters), `POST …/approve|reject|spam` with reason and `expectedVersion`, `PATCH …/redaction`; the same rules as reviews, audited, with the post's approved comment count kept correct.
4. Web: `/blog` index, `/blog/category/{slug}` and `/blog/tag/{slug}` landings (thin tags `noindex`), and `/blog/{slug}` article page with byline, date, tags, share links (copy link and ordinary mail/X/Facebook URLs, no third-party scripts), related articles, approved comments and the comment form (or a clear "comments are closed" notice). Blog appears in the public navigation.
5. Admin: Comments moderation queue mirroring the Reviews queue.
6. Tests: unit (share links, comment rules), integration (public index/detail scope and pagination, related-article ordering, comment submission rules incl. closed and unpublished articles, idempotent replay, limits, moderation transitions and counts, report targeting a comment, permission denial), admin and web tests; root gate and runtime verification.
Out of scope: threaded replies (never in MVP), author archive pages (never), cover images (Phase 20), sitemap/JSON-LD (Phase 21), cache purge on publication (Phase 22).

Delivered:
- **Migration** `20260906162923_comments_and_report_targets`: `comments` (post FK cascade, encrypted private email, keyed hash, original and optional redacted text, review-style status enum, moderation fields, acknowledgement, hashed IP, version) plus `abuse_reports.commentId` with `reviewId` made nullable. MySQL refuses a check constraint on a column used by a cascading foreign key (error 3823), so the "exactly one target" rule is the application invariant SRS REP 001 explicitly permits — enforced in `ReportsService` and covered by an integration test; the migration records why.
- **Public API**: `GET /posts` (published only, newest first, 12 per page, `category`/`tag`/`q` filters), `GET /posts/{slug}` (404 for drafts; sanitised body, byline, tags, related articles ranked by shared category then shared tags with a stable tie-break, at most four), `GET /blog-categories` and `GET /tags` (active terms with published counts and landing content), `GET /posts/{id}/comments` (approved only, oldest first, 20 per page) and `POST /posts/{id}/comments` (201 neutral receipt; rechecks publication and `commentsEnabled`, 409 `COMMENTS_CLOSED`, Turnstile, honeypot, per-IP ceilings, `Idempotency-Key` with replay). `POST /reports` now accepts a comment target.
- **Comment moderation** (`comments.moderate`): list with status, post and reported filters; `approve`/`reject`/`spam` with reason and `expectedVersion`; `PATCH …/redaction` preserving the original. Approved comment counts follow the moderation state, so removing a comment updates the article's count.
- **Web**: `/blog` index (12 per page, category chips), `/blog/category/{slug}` and `/blog/tag/{slug}` landings (sanitised landing content; a tag with neither content nor articles is `noindex, follow`), and `/blog/{slug}` with byline, date, sanitised body, tags, author card, share links (plain `mailto` and share URLs with `rel="noopener noreferrer nofollow"`, no third-party scripts), related articles, approved comments and the moderated comment form or a "comments are closed" notice. Blog joined the public navigation.
- **Admin**: Comments moderation queue mirroring Reviews; the Abuse reports queue shows the target type and links to the right queue.

Verification (all green, 2026-09-06): `pnpm check` — database 23, API 127, admin 78, web 15, domain 6, worker 9, e2e 19, builds, contracts in sync (101 paths); `pnpm test:integration` — database 5, API 83 (`blog-public.integration-spec.ts`: index scope and ordering with drafts excluded, filters, pagination bounds, article detail with related ordering, taxonomy counts and the thin-tag case, comment submission rules incl. closed and unpublished articles and idempotent replay, moderation transitions with public visibility and counts following them, redaction preserving the original, comment reports with the single-target rule). Runtime: `/blog`, an article and a category page returned 200 while an unknown tag and article returned 404; the article page rendered one H1, a canonical URL, Melbourne-formatted dates, share links with safe `rel`, no third-party scripts and no overflow at 375 px.

Decisions: comments reuse the review moderation core (states, reasons, redaction, audit) rather than a parallel implementation; share links are plain URLs so no third-party script runs on an article page; the thin-tag `noindex` rule is applied in the web layer from the API's `landingContent` and `postCount`.

Limitations / follow-ups: comment counts on cached pages refresh on the next revalidation until tag purge lands (Phase 22); cover images (Phase 20); sitemap, JSON-LD and redirects (Phase 21); the comment and review forms link to `/review-guidelines`, which arrives with the static pages (Phase 22).


## Phase 20 — Media pipeline (complete, 2026-09-06)

SRS: MED 001 (only authorised admins upload; accept JPEG, PNG and WebP up to 10 MB and 40 megapixels; reject SVG, executables, animated formats and documents; validate the signature and the decoded image, not the filename or the browser's MIME; re-encode derivatives and strip EXIF including location), MED 002 (request a short-lived constrained signed upload → private quarantine → validate completion and checksum → process variants → mark ready; a pending or rejected asset is never publicly addressable; random server-generated object keys, least-privilege credentials, no client-chosen keys or overwrites), MED 003 (metadata: source name, MIME, bytes, dimensions, checksum, object key, derivatives, alt text, credit, rights/source note, focal point, processing status, creator and timestamps; responsive thumbnail/card/hero renditions preserving aspect ratio with a fallback when processing fails; content images require useful alt text), MED 004 (gallery order, caption and contextual alt overrides live on the usage record; an asset may be used by several businesses or posts; deletion of a referenced asset is blocked until usages are removed; abandoned quarantine objects removed after 24 hours and unreferenced ready objects after 30 days), DAT 003 (restrict deletes of published media), ARC 003 (S3-compatible object storage behind an adapter), SEC 004 (credentials only in the environment, never in media metadata or browser responses), RBAC 001 (`media.manage`), BUS 002/BLOG 001 (listing galleries and article covers).

Acceptance criteria:
1. Local infrastructure: MinIO added to the Compose project on a loopback port with its own volume and credentials in the ignored `infrastructure/.env`, so the real S3 API is exercised locally. Two buckets: a private quarantine and a public media bucket, created idempotently at start-up.
2. Migration: `media_assets` (source name, MIME, bytes, width, height, checksum, object key, status `quarantined|ready|rejected`, alt text, credit, rights note, focal point, rejection reason, uploader, version, timestamps), `media_variants` (asset FK, kind `thumbnail|card|hero`, object key, dimensions, bytes, MIME), `business_media` (business + media FK, order, caption, alt override, cover flag, unique pair) and real foreign keys for `posts.coverMediaId` and `authors.imageMediaId` with `RESTRICT`.
3. Storage port: an `ObjectStoragePort` with an S3 adapter (AWS SDK v3) used for MinIO and production alike; presigned PUT URLs constrained by content type, size and a random server-generated key; the API never proxies file bytes and never accepts a client-supplied key.
4. Upload flow: `POST /admin/media/uploads` (returns the asset id and a short-lived signed URL), `POST /admin/media/{id}/complete` (re-reads the object, verifies size and checksum, validates the magic bytes and the decoded image, rejects SVG/animated/oversized/too-many-pixels, then enqueues variant processing), worker job that re-encodes thumbnail/card/hero to WebP with EXIF stripped, publishes them to the public bucket and marks the asset ready (failures mark it rejected with a reason and never leave a half-published asset).
5. Usage and deletion: business gallery endpoints (add, reorder, caption, alt override, cover) and post/author cover references; `DELETE /admin/media/{id}` refuses while any usage exists; retention scans remove abandoned quarantine objects after 24 hours and unreferenced ready assets after 30 days, logged by count.
6. Admin: media library (upload with client-side size/type pre-check, alt text and rights fields, status, usages), gallery management on the business editor and a cover picker on the article editor.
7. Web: listing cards and detail pages render the real cover and gallery images with responsive sizes and the stored alt text, falling back to the existing placeholder when an asset is missing.
8. Tests: unit (validation rules, key generation, variant sizing), integration (upload lifecycle incl. rejection paths, quarantine invisibility, usage rules and deletion refusal, permission denial), worker unit tests, admin/web tests; root gate and runtime verification against MinIO.
Out of scope: CDN configuration and cache purge (Phases 22/24), video or document uploads (never in MVP), image cropping UI beyond the focal point.

Delivered:
- **Infrastructure**: MinIO added to the Compose project (`melbourne-sphere-minio`, host ports 9010/9011 because php-fpm holds 9000 on this machine, volume `melbourne-sphere_minio-data`, credentials in the ignored `infrastructure/.env`). The API creates both buckets at start-up and applies an anonymous read policy to the **public** bucket only; the quarantine bucket never gets one (verified: a quarantine URL returns 403).
- **Migration** `20260906165837_media_pipeline`: `media_assets` (source name, MIME, bytes, dimensions, checksum, random object key, status quarantined/ready/rejected, rejection reason, alt text, credit, rights note, focal point, uploader, version), `media_variants` (unique per asset and kind) and `business_media` (order, caption, alt override, cover). `posts.coverMediaId` and `authors.imageMediaId` became real `RESTRICT` foreign keys (the widening is documented in the migration; both columns were empty).
- **Shared rules** (`packages/domain/media.ts`): allowed MIME types, 10 MB and 40-megapixel limits, minimum dimensions, variant sizes (thumbnail 320, card 800, hero 1600), the rejection-reason order and the random object-key builder, used by the API and the worker alike.
- **API**: `ObjectStoragePort` with an S3 adapter (AWS SDK v3, path-style for MinIO). `POST /admin/media/uploads` returns a five-minute signed PUT for a server-generated key; `POST /admin/media/{id}/complete` re-reads the object, verifies the checksum, detects the real type from the magic bytes, reads the dimensions and rejects anything outside the rules (deleting the rejected original immediately), then writes a `media.uploaded` outbox event; list/detail/update/delete with usage counts, and deletion refused with 409 `MEDIA_IN_USE` while an asset is referenced. Gallery usage lives on `PUT /admin/businesses/{id}/gallery` (order, caption, alt override, single cover, `expectedVersion`), and only processed assets with alt text may be used.
- **Worker**: `media.process` job re-encodes thumbnail/card/hero to WebP with sharp, never upscaling, publishing only after every variant succeeds and marking the asset ready; a failure rejects it with a reason and removes any partial variants. Re-encoding drops EXIF, including GPS.
- **Retention** (`MediaService.runRetention`): abandoned quarantined or rejected assets after 24 hours, unused ready assets after 30 days, logged by count.
- **Admin**: Media library (upload with client-side type and size checks, required alt text, status, dimensions, usage counts, details dialog for alt/credit/rights/focal point, delete guarded by usage), a reusable media picker that only offers processed assets with alt text, and a gallery editor on the business page (add, reorder, caption, contextual alt, cover).
- **Web**: listing cards and detail pages show the real cover and gallery with responsive sizes and stored alt text; blog cards and articles show the cover; the placeholder remains the fallback. `next.config.ts` allows exactly one remote image origin, derived from `MEDIA_PUBLIC_BASE_URL`.

Verification (all green, 2026-09-06): `pnpm check` — database 23, API 127, admin 83, web 15, domain 10, worker 13, e2e 19, builds, contracts in sync (106 paths); `pnpm test:integration` — database 5, API 89 (`media.integration-spec.ts`: signed upload with a server-generated key and refused client key, permission denial, size/type refusals, checksum mismatch and disguised-file rejection with the original deleted, duplicate completion refused, gallery rules incl. not-ready and missing-alt refusals, single cover, stale version, deletion refused while used, detail usages, metadata edit with version). Runtime against real MinIO: buckets created, public read policy applied, a 2400×1600 JPEG uploaded through the signed URL, validated, processed into three WebP variants (320/800/1600), fetched publicly (200) with EXIF stripped, while a quarantine URL returned 403.
- Test-suite cost: the admin specs now render the page under test instead of the whole route tree (the nav-visibility tests still mount `AppRoutes`), cutting the interaction-heavy files from about 29 s to 4 s and removing the load-dependent flakes.

Decisions: MinIO joins the local stack so the same S3 client and signed-URL flow used in production is exercised locally; the public read policy is applied by the API but a failure is logged rather than fatal, because a production key may legitimately lack `PutBucketPolicy`; alt text is required before an asset can be placed on a page, and the contextual override lives on the usage record.

Limitations / follow-ups: no CDN in front of the bucket yet (Phase 22/24) — `MEDIA_PUBLIC_BASE_URL` points straight at storage locally; retention runs on demand (`runRetention`) until the scheduled maintenance job lands with the operations phase; the article cover picker is available through the media library and gallery editor, but the article editor's own cover field is still a reference only; no image cropping beyond the focal point.


## Phase 21 — SEO: sitemaps, structured data, canonicals and redirects (complete, 2026-09-06)

SRS: SEO 001 (server-rendered HTML with one H1, descriptive title and meta description, absolute canonical on one configured origin, correct status codes, Open Graph and social image; admin and private content never in public metadata), SEO 002 (XML sitemap index split into businesses, editorial content and curated taxonomies, canonical 200 pages only, meaningful last-modified timestamps, no drafts, redirects, empty taxonomies, search combinations or private routes; robots.txt is guidance, not access control), SEO 003 (curated category and area pages need real editorial content and eligible listings; no automated category × area pages; filtered searches are `noindex, follow` with a normalised self canonical; tracking parameters stripped from canonicals; paginated listings use self canonical page URLs with crawlable previous/next links), SEO 004 (a slug change creates a 301 to the new canonical path; no collisions, cycles, chains or cross-origin targets; aliases resolve to the latest target; drafts 404; deliberately removed resources may return 410; never redirect every missing page to the home page), SEO 005 (validated JSON-LD: Organization and WebSite, BreadcrumbList where breadcrumbs are visible, the most accurate LocalBusiness subtype for a listing and BlogPosting for an article, with address, phone, URL, geo and hours only when known and displayed — nothing invented), SEO 006 (rating markup only from approved, visible submissions and the same aggregate the page shows; omitted when empty; review rich-result eligibility must be confirmed by the technical lead before enabling review markup), SEO 007 (text embedded in JSON-LD sanitised so it cannot break out of the script element, sitemap content XML-escaped, unpublished resources gone from schema, related blocks and sitemaps as well as search).

Acceptance criteria:
1. Migration: `redirects` (unique source path, target path, kind `permanent|gone`, reason, resource type/id, actor, timestamps) with cycle and chain prevention in the service.
2. API: `POST /admin/businesses/{id}/slug` and `POST /admin/posts/{id}/slug` change a published slug and create the 301 in the same transaction (replacing today's blanket `SLUG_LOCKED` refusal), resolving any existing alias to the new target so chains cannot form; `GET /redirects/resolve?path=` for the web tier; admin list of redirects; `GET /sitemap/*` feeds returning canonical paths and last-modified times for published businesses, published posts and curated taxonomies that have both editorial content and at least one eligible item.
3. Web: `robots.ts` (allow public routes, disallow `/admin` and query-filtered paths, point at the sitemap index), `sitemap.ts` generating the index plus child sitemaps from the API feeds, canonical URLs with tracking parameters stripped, `rel="prev"`/`rel="next"` on paginated listings, and a middleware that resolves redirects (301) and returns 410 for deliberately removed resources.
4. JSON-LD: Organization and WebSite on the home page, BreadcrumbList wherever breadcrumbs are shown, LocalBusiness (with address, geo, phone, URL and opening hours only when published) on business pages, BlogPosting on articles, plus `aggregateRating` only when approved reviews exist and are displayed. All values escaped so `</script>` in content cannot break out.
5. Tests: unit (canonical normalisation, JSON-LD builders and escaping, redirect cycle/chain rules), integration (slug change creating a redirect and resolving aliases, sitemap feed exclusions, permission denial), web unit tests, and runtime checks of robots, sitemap, canonical, redirect status codes and structured data with JavaScript disabled.
Out of scope: review rich-result markup is built but stays behind an explicit setting until the technical lead confirms eligibility (SEO 006); cache purge on publish (Phase 22); Search Console verification and analytics (Phase 24).

Delivered:
- **Migration `add_redirects`**: `redirects` (unique `sourcePath`, nullable site-relative `targetPath`, `kind permanent|gone`, reason, resource type/id, actor, timestamps). `RedirectsService` keeps three invariants on every write — one source resolves one way, aliases pointing at an old path are repointed at the newest target (no chains), and a path that becomes live content again loses its outgoing rule (no cycles).
- **Slug changes**: `POST /admin/businesses/{id}/slug` and `POST /admin/posts/{id}/slug` change a published slug and write the 301 in the same transaction (`listings.publish` / `posts.publish`, `expectedVersion`, audit entry, article outbox event). Unpublished content changes slug with no redirect, because it never had a public URL.
- **Redirect administration**: `GET/POST/DELETE /admin/redirects` behind the new `redirects.manage` permission, plus an admin screen for moved and permanently removed pages.
- **Sitemap feeds**: `GET /api/v1/seo/sitemap/{businesses|editorial|taxonomies}` returning canonical paths and real last-modified times. Only published listings and articles appear; a taxonomy needs its own editorial text *and* at least one published item, so thin generated pages stay out.
- **Web**: `robots.txt` (sitemap index, `/admin`, `/api/` and query-filter paths disallowed), `/sitemap.xml` index with `/sitemaps/{section}.xml` children (XML-escaped, rendered per request with a five-minute public cache header so the build never needs a live API), and `middleware.ts` resolving redirects for `/business/*`, `/blog/*` and `/business/*` — 301 to the new address, 410 for a removed page, and pass-through for unknown paths so a missing page still renders its own 404 rather than being sent to the home page. Resolutions are cached in memory for 60 s and an unreachable API never blocks rendering.
- **JSON-LD** (`lib/structured-data.ts`): Organization and WebSite on the home page, BreadcrumbList wherever breadcrumbs are visible, the most accurate LocalBusiness subtype on a listing (address, geo, phone, hours and `aggregateRating` only when the page itself shows them) and BlogPosting with a Person author on an article. `serialiseJsonLd` escapes `<`, `>` and `&`, so pasted text cannot close the script element.
- Canonicals already strip tracking parameters (only known search keys survive `parseSearchParams`), filtered searches stay `noindex, follow`, and pagination keeps crawlable previous/next links.

Verification: `pnpm check` green (database 23, API 141, admin 92, web 20, domain 10, worker 13, e2e 19, all builds, contracts in sync); `pnpm test:integration` green (database 5, API 101) including `seo.integration-spec.ts` — sitemap exclusions for unpublished content and empty taxonomies, a slug change creating a 301, a second change repointing the older alias instead of chaining, reusing a redirecting path removing the rule, article slug change with stale/invalid refusals, manual 301/410 entries, cross-origin and reserved-path refusals, permission denial for an admin without `redirects.manage`, and path normalisation on resolve.

Decisions: redirects live behind their own `redirects.manage` permission rather than `settings.manage`, because changing where a public URL goes is a different risk from editing site settings; chain prevention happens on write (repointing aliases) rather than by following chains on read, so every resolution is a single lookup.

Limitations / follow-ups: review rich-result markup (SEO 006) is deliberately not emitted beyond `aggregateRating`; cache purge on publish is Phase 22; Search Console verification is Phase 24.


## Phase 22 — Editorial depth, interface quality, static pages, featured placements and caching (complete, 2026-09-07)

Raised by the client during Phase 21: the product felt thin — authors were a two-field modal, the article body was a plain Markdown textarea, the dashboard was a placeholder, and the interface did not read as a finished product. The instruction is to lift every section to a premium, industry-standard level, one at a time. SRS anchors: BLOG 001 ("sanitized rich content", author attribution separate from admin login), BLOG 004 (byline, author card), ADM 002 (the full admin screen inventory with search, filters, confirmations and stale-edit warnings), ADM 003 (dashboard shows pending moderation, open reports, failed enquiries, due/failed scheduled posts and recent audit activity, with no private text), SEC 001 (allowlist sanitisation of rich content in public pages *and* admin previews), UX 001, NFR 005/011.

Delivered so far:
- **Author profiles** (migration `author_profiles`): role, short bio, sanitised long biography, pronouns, location, public editorial email, website, topic labels, profile photo (a processed media asset with alt text) and per-network profile links (`author_links`, one per known network, host-checked). Authors remain attribution only — no login, no administrator email (SCP 002). New admin screens: an authors list (photo, role, topics, published/total counts, activate/deactivate) and a full profile editor; the public article page now renders a real byline (photo, role, dates, reading time) and an author card (photo, biography, topics, links), and `BlogPosting` credits a Person with those fields.
- **Rich text editor**: TipTap 3.31.3 in the admin (headings, emphasis, lists, quotes, code blocks, dividers, links, media-library images and tables) with a keyboard-accessible toolbar, word count and reading time. Articles carry a `bodyFormat` (`markdown` legacy, `html` from the editor); both formats pass the identical server-side allowlist, so the editor is a convenience and never the security boundary. Existing Markdown articles keep working and can be converted in one click. The editor is code-split (461 kB separate chunk) and loads only on the two screens that write rich content.
- **Article cover images**: `coverMediaId` is now a real field on the article API and editor (validated as a ready asset with alt text), not just a caption override.
- **Dashboard** (`GET /api/v1/admin/dashboard`): permission-scoped counts for pending reviews and comments, open reports, failed and new enquiries, draft listings, uploads still processing and overdue scheduled articles, plus the next scheduled articles and recent audit activity. Counts only — no enquiry, review or comment text — and a metric is omitted entirely when the caller lacks the permission that owns its screen.
- **Admin design system**: refreshed tokens (palette, type scale, elevation, control sizing), shared `PageHeader`, `SectionCard`, `StatCard`, `StatusTag`, `EmptyState` and sticky `StickyActions` save bar, a grouped navigation shell (Overview, Directory, Editorial, Community, Configuration) with an account menu and a "View site" link, and route-level code splitting that cut the main bundle from 2.17 MB to 973 kB (298 kB gzip).
- **Public reading experience**: one `.ms-prose` editorial style shared by article bodies and author biographies (measure, headings, quotes, code, tables, figures) replacing ad-hoc utility strings.

Verification: `pnpm check` and `pnpm test:integration` green (counts above), including new suites `authors.integration-spec.ts` (full profile round-trip, biography sanitisation, link host and email validation, unusable image refused, link replacement, stale version, deactivation refused while credited), `dashboard.integration-spec.ts` (permission-scoped metrics, anonymous 401, no private text) and admin specs for the authors screens, redirects screen and dashboard.


Also delivered in this phase:
- **Information pages** (migration `static_pages_and_featured`, SRS CFG 002): the five fixed pages (about, contact, privacy, terms, review guidelines) with sanitised rich content, revisions on every change to published text, and a publication gate that refuses stub copy, placeholder wording ("lorem ipsum", "TBD", "sample text", example domains) and unvalidated contact routing. Admin screen with the rich editor and per-page publication blockers; public routes at `/{slug}`; the footer links only pages that are actually published.
- **Featured placements** (SRS DIR 007): manual editorial placements with a position and a validated interval, overlap refused, no payment fields anywhere (FUT 002). Public search returns at most three matching, published, featured listings in `meta.featured`, excluded from the organic results, their count and their pagination; the same set appears on every page of a query and empties when filters no longer match. Admin screen under Directory → Featured listings.
- **Caching and invalidation** (SRS CACHE 001–003): a Redis read cache for public search, namespaced by a publication version so a publication change retires every dependent entry at once; publication, featuring, moderation, page and settings changes write a `cache.invalidate` outbox event in the same transaction, the dispatcher hands it to the worker, and the worker purges the web tier through `POST /api/revalidate` (shared secret, tag allowlist, immediate expiry) with BullMQ retries — so a failed purge is tracked and retried rather than waiting for a TTL. Redis being unavailable degrades to uncached reads; MySQL stays authoritative.
- **Home banner** (SRS HERO 001): the hero is a real banner with up to six admin-managed Melbourne photographs behind a navy overlay, cross-fading with previous/next, pause and per-image controls, a caption slot and per-slide focal points. It falls back to the solid navy panel when no images are configured, and anyone who prefers reduced motion sees only the first slide. Slides are chosen from the media library in Site settings.
- **Dark scheme rework**: the public palette had cards and page background both in navy, which read as one flat field. The dark scheme is now a near-black slate page with clearly lifted surfaces and documented contrast ratios; navy is a brand accent (hero, header) rather than the page colour.

Verification: `pnpm check` green (database 23, API 147, admin 99, web 23, domain 12, worker 16, e2e 19, builds, bundle budget, contracts in sync); `pnpm test:integration` green (database 5, API 115) including `static-pages.integration-spec.ts`, `featured.integration-spec.ts` and `cache-invalidation.integration-spec.ts`.

Limitations / follow-ups: the remaining public screens (directory filters, listing detail) have had a light pass rather than a full redesign; no CDN sits in front of the media bucket yet; review rich results stay disabled pending the technical lead's confirmation (SEO 006).

## Phase 23 — Accessibility and performance (complete, 2026-09-07)

SRS: NFR 005 (performance budgets), NFR 006 and NFR 011 (WCAG 2.2 AA, keyboard operation, visible focus, reduced motion), NFR 013 (client bundle discipline).

Delivered:
- **Automated accessibility checks**: axe-core runs over representative admin screens (dashboard, sign-in, author editor, redirects) in the test suite, and over the public hero banner in a jsdom component test. The rules cover WCAG 2.0/2.1/2.2 A and AA plus best practice; colour contrast is verified separately by the palette test, because jsdom has no layout.
- **Defects the checks found, and fixed**: table action columns had empty headers (now visually hidden "Actions" text), section headings were plain `<div>`s so the heading order jumped from h1 to h4 (SectionCard now renders a real `<h2>` and the dashboard lists use their own markup), and the lazy editor's loading skeleton exposed an empty heading (now an announced status message with a decorative skeleton). The public `PageHeader` also stopped rendering a second `banner` landmark inside `<main>`.
- **Performance**: route- and editor-level code splitting cut the admin entry chunk to 755 kB (26 chunks, 2.15 MB total) from a single 2.17 MB bundle, and `pnpm budget` now fails the phase gate if either the entry chunk or the total exceeds its cap.
- Reduced motion is honoured by both rotating elements (hero phrases and banner slides), each with a persistent pause control, and neither causes layout shift.

Verification: `pnpm check` green including the new accessibility specs and the bundle budget step.

Limitations / follow-ups: automated rules do not replace a manual audit — a keyboard-only pass, screen-reader pass and 320 px/200 % zoom review of the public pages remain a launch gate (SRS T02/T14); no synthetic load test has been run (NFR 003).

## Phase 24 — Operations: deployment, backups and monitoring (complete, 2026-09-07)

SRS: OPS 001–003, BACK 001–002, MON 001–002.

Delivered:
- **CI** (`.github/workflows/ci.yml`): frozen-lockfile install, migration policy lint, lint, typecheck, unit, e2e, build, bundle budget and contract check; a separate job runs the integration suites against real MySQL 8.4 and Redis 8 services after applying migrations exactly once; a third job audits production dependencies and fails on high or critical advisories.
- **Images**: multi-stage, non-root Dockerfiles for the API, worker and web app, each pinned to Node 24.19.0 and pnpm 12.3.4, with health checks and `STOPSIGNAL SIGTERM` for the worker's drain.
- **Monitoring** (`GET /api/v1/admin/operations/status`, permission `audit.read`): queue age, failed events, failed enquiries, scheduled-publishing lateness, moderation backlog and stuck uploads, each with the MON 002 threshold and the action an operator should take. Counts and ages only — the integration test asserts no address ever appears in the payload.
- **Backups**: `infrastructure/backup/backup-database.sh` takes an encrypted, checksummed logical backup with the binlog position recorded for a one-hour RPO; `restore-drill.sh` restores into an isolated `*_restore` database (it refuses any other name), verifies schema, collation and row counts, and prints the measured restore time plus the manual steps a drill still requires.
- **Runbooks**: `docs/operations/runbook.md` (environments, deployment and rollback, runtime health, pools and network policy, backup and restore, the alert table and common procedures) and `docs/operations/restore-drills.md` for drill results.

Verification: `pnpm check` and `pnpm test:integration` green, including `operations.integration-spec.ts` (signal set and thresholds, degraded state, permission and session refusal). Container builds and CI itself run on the client's infrastructure and are not exercised from this machine.

Limitations / follow-ups (all client decisions, not code): no cloud accounts, DNS, TLS certificates, CDN, error tracking or uptime monitoring are provisioned; the cross-border processing register and the on-call responder table in the runbook are deliberately blank until the client fills them; the first restore drill must be run and recorded before launch.


## Phase 25 — Verification: UAT journeys, capacity and the restore drill (complete, 2026-09-07)

SRS: QA 001–003 (release verification and UAT flows), NFR 003 (capacity), NFR 006/011 (accessibility), BACK 002 (restore drill).

Delivered:
- **UAT journeys** (`e2e/`, Playwright 1.63): the four QA 003 flows plus the checks a manual pass would repeat — home → search → business in three interactions, search with JavaScript disabled, the review and comment forms stating plainly when submissions are closed, blog → article with byline and author card, a genuine 404 that keeps its address, robots and sitemap contents, admin anonymous refusal on every admin surface, an administrator signing in and opening the moderation queues, skip-link focus, one `h1` and one `main` per page, and no horizontal scrolling at 320 px. They run at desktop and 320 px widths against a running stack; credentials come from the environment, so the suite contains none.
- **Defects the journeys found, and fixed**: a `notFound()` inside a dynamic route rendered a blank page (Next 16 serves its bare error document and keeps the content in the flight payload) — fixed with per-segment `not-found` boundaries plus `global-not-found`; and the directory list had a streaming `loading.tsx` boundary, so with JavaScript disabled it showed "Loading businesses…" forever — the boundary is gone and results are server-rendered.
- **Capacity** (`tools/load/`): a seeder that fills an isolated `*_load` database with the NFR 003 volume (10,000 businesses, 2,000 articles, 100,000 approved reviews) and an autocannon profile at 50 GET/s across 100 sessions. Captcha-protected POSTs are deliberately excluded and measured separately, because driving them would measure the protection rather than the product.
- **Capacity defects found, and fixed**: the first run failed at 5.4% errors, all connection-pool timeouts. Two real causes: the pool size was the driver default of 10 with no way to configure it (now `DATABASE_CONNECTION_LIMIT`, validated, default 20, documented as a budget across replicas in the runbook), and a cold cache let concurrent identical requests each hit the database — the stampede CACHE 003 asks about. `CacheService` now coalesces concurrent misses for the same key into one load. Listing detail reads are cached too (five minutes, retired by the publication namespace). After the fixes, the full 30-minute acceptance run passed: 89,850 requests, 0 errors, p50 53 ms, p95 200 ms, p99 244 ms at the full data volume.
- **Restore drill** (`docs/operations/restore-drills.md`): a real rehearsal — encrypted backup, checksum verified, restored into an isolated `melbourne_sphere_restore` database, schema (45 tables), collation (0 mismatches) and row counts verified, restore time recorded, database dropped afterwards. The scripts now use `age` or `gpg`, whichever is installed, and take a `--port`. The drill recorded one gap honestly: the local account cannot write the binlog position, so a production backup account needs `RELOAD`/`BINLOG ADMIN` for the one-hour RPO.
- **Public design pass**: directory filter toolbar, results header and empty state, listing header and description measure, and a shared not-found treatment.

Verification: `pnpm check` green (database 23, API 153, admin 99, web 23, domain 12, worker 16, e2e 19, builds, bundle budget, contracts in sync); `pnpm test:integration` green (database 5, API 115); Playwright 30 journeys passing at two widths plus 4 authenticated admin journeys; the capacity profile passing at NFR 003 volume.

Limitations / follow-ups: a 404 still renders blank with JavaScript disabled (Next 16 keeps the not-found body in the flight payload; every other page is server-rendered); the manual screen-reader pass and the production-shaped restore drill remain launch gates; the load profile covers public reads only.

## Phase 26 — Home page redesign: a light-and-dark editorial composition (complete, 2026-09-07)

SRS: UX 001–003 (branding, navigation, three-interaction discovery), HERO 001–007 (banner, headline, search), DIR 001 (card contents), CFG 002 (contact routing), NFR 006/007/011 (accessibility, 320 px, focus and target size), NFR 001/013 (server rendering, bundle discipline), SEO 001–003.

Client feedback that prompted it: the page was one narrow column of near-identical navy, the hero read as a plain card rather than a destination banner, there was no Melbourne photography, cards looked like admin components, and the whole thing looked like a technical prototype.

### Visual implementation plan (the plan this phase was built to)

1. **Token layer first** (`packages/ui/src/styles.css`): a light-first palette — warm off-white page, white cards, a cool neutral band — plus explicit dark *band* tokens for the header, hero, locality feature, call to action and footer. Content widths (1520 / 1120 / 68ch), gutters, section rhythm, radii, shadows, focus rings and motion timings become tokens rather than per-component values.
2. **Drop the OS dark scheme.** The light/dark rhythm is designed per section; a `prefers-color-scheme` override repainted every band the same navy, which was the defect being fixed. `palette.test.ts` fails the build if one is reintroduced.
3. **Full-bleed layout.** `main` loses its width; sections are full-bleed and bound their own content with `.ms-container`. Inner pages opt back into the column in one place.
4. **Section rhythm**: dark header → photographic hero → light categories → soft-neutral listings → dark Melbourne localities → light stories → dark call to action → dark footer.
5. **Real data or an honest state.** Every band loads independently and renders a populated, empty or failure state; nothing is invented to fill space.
6. **Verify in the browser at 1440 / 1024 / 768 / 390 px**, then run the automated accessibility scan, the journeys and the full gate.

### Delivered

- **Design system** (`packages/ui/src/styles.css`): the token set above, `.ms-container` / `.ms-container-tight` / `.ms-section` primitives, and `.ms-on-dark` so focus rings stay visible on dark bands. `apps/web/src/app/globals.css` adds the display-face rule and one shared card-lift treatment. Typography is a pairing: Geist for the interface, Instrument Serif (one weight, self-hosted by `next/font`) for display headings only.
- **Hero** (`hero-banner.tsx`, `hero-headline.tsx`, `hero-search.tsx`): a full-bleed photograph with a directional navy wash from `sm` up and an even tint below it (a narrow screen has no empty side of the picture to clear), per-slide focal points, prioritised first slide, cross-fade rotation with previous/next/pause and per-image controls at 44 px, a photo credit, and a designed gradient underneath so the banner still works if the image fails. The headline is the display serif with the reserved-height rotating phrase; the search panel is one rounded card with a fixed "Melbourne, Australia" label, a labelled keyword combobox, an optional category select and a prominent Search button, stacking full-width on mobile with its labels intact.
- **Photography** (`apps/web/public/hero/`, `lib/hero-assets.ts`, `docs/content/hero-photography.md`): two licensed Melbourne images — Flinders Street Station at night (CC BY 2.0) and Degraves Street (CC BY 4.0) — stored locally, cropped to 2560×1440, re-encoded as WebP with EXIF stripped, and credited in the banner. Creative Commons *Attribution* only: no share-alike obligation. Admin-configured slides replace them entirely.
- **Header and footer**: a full-width navy header with the brand mark, active-page state, an always-available "Add a business" action and a native `<details>` mobile menu that works without JavaScript; a structured dark footer with directory, editorial, information and contact columns. About and Contact join the navigation automatically once those pages are published.
- **Home page** (`app/page.tsx`): the seven-band composition, category cards with restrained icons and a tile that completes the grid, listing and article grids whose column count follows how many cards actually exist, a Melbourne locality band that is a real grid rather than a row of pills, a lead-article treatment that works with a single published article, and a call to action that explains the no-account listing process.
- **Cards** (`business-card.tsx`, `post-card.tsx`, `featured-post-card.tsx`, `lib/category-visuals.ts`): a listing without a photograph gets a branded panel derived from its category — never a shared placeholder and never a fabricated photograph. The whole card is one link (stretched title anchor) with the contact action above it, so there is one focus stop and one accessible name.
- **Per-section states**: the home page loads its six sources with `Promise.allSettled`; a failing endpoint degrades its own band with a "we couldn't load this" notice and a retry, and is never reported as "nothing to show" (DIR 006, NFR 012).
- **Contact routing** (`lib/site.ts`): a development address (`.local`, `.test`, `.invalid`, `.example`, `.internal`) is treated as unset. The site then withholds it everywhere — footer, hours corrections, listing correction link — and the listing action points at the homepage explanation instead of publishing a mailbox nobody can write to.

### Verification

- **Browser review at 1440, 1024, 768 and 390 px**: hero composition and search usability, header navigation and the mobile menu, section widths, card grids, the light/dark rhythm, spacing, footer; no clipping, overlap, horizontal overflow or unexplained empty areas. `document.scrollWidth === innerWidth` at every width. Console clean apart from Next's image-preload warning under device-pixel-ratio emulation.
- **Automated accessibility**: a new axe-core WCAG 2.2 AA scan in `e2e/specs/accessibility.spec.ts` over `/`, `/business`, `/blog` and a listing page, at desktop and 320 px — **zero violations** — plus a mobile-menu operability test. `palette.test.ts` proves AA contrast for body, muted and link text on all three light surfaces and all three dark band shades.
- **Journeys**: `pnpm --filter @melbourne-sphere/e2e test` — 34 passed, 4 skipped (admin credentials absent).
- **Gate**: `pnpm check` green — database 23, API 153, admin 99, web 54, domain 12, worker 16, e2e 19, all builds, admin bundle entry 751 kB, contracts in sync.

### Defect found and fixed while testing

`categoryVisual('auto-repair')` returned the home-services family, because the home rule matched "repair" first — a mechanic would have been given a plumbing wrench. The rules are now ordered specific-first and short ambiguous tokens ("car" inside "carpet") match on hyphen boundaries; `category-visuals.test.ts` covers it.

### Outstanding content (client)

Brand logotype and wordmark, the client's own hero photography (the CC BY images are interim), the approved public contact address, and the About/Contact/policy page copy — until those pages exist the navigation omits them rather than linking to a 404.

## Phase 27 — Contact page and form, editorial and listing detail (complete, 2026-09-07)

SRS: UX 002/003 (navigation and the public route contract), CFG 002 (information pages and contact routing), ENQ 002/003 (the general enquiry uses the same durable pipeline), SEC 002/003 (captcha and honeypot on every public write), BLOG 004/005, BUS 001/003, REV 003/004, DIR 001/006, NFR 006/011.

Client feedback that prompted it: "I also need a contact us page with same way", "add form in contact us page", "improve the Blog and directory detail page in same way", and "I think you also missed rating system in directory detail page with review".

### Delivered

- **`/contact`** (`app/contact/page.tsx`): a real route instead of a 404. When an editor publishes the Contact information page its approved copy and address take over completely; until then the page explains how to reach the editors using facts about how the product actually works — no invented policy — and is `noindex, follow`, because that copy has not been through the client's approval. `InformationPage` (dark title band, reading column, aside) now backs About, Privacy, Terms and the review guidelines too, so every information page looks like the same publication.
- **Contact form** (`components/contact-form.tsx`, `lib/submissions.ts`): posts to `POST /api/v1/contact`, which already existed — the general site enquiry runs through the same transactional outbox as a business enquiry (ENQ 002/003), so no new endpoint, table or admin queue was invented for it; the message lands in the enquiries queue as `kind: site`. A fixed topic list becomes the enquiry subject, so the queue stays sortable and the visitor does not have to invent one. Turnstile-protected with a honeypot and an idempotency key; without a site key the form is not offered at all, because the API would refuse the submission anyway and a form that always fails is worse than an honest notice. `validateContactForm` mirrors the API's rules and is unit-tested.
- **Blog** (`app/blog/**`, `collection-header.tsx`): a dark title band with the category chips and counts on the index, a lead article plus a grid, and an article page that opens with a dark editorial header (breadcrumbs, category, display-serif title, standfirst, byline, share) with the cover lifted into it, then a clean reading column, tags, author card, comments and a related band. Category and tag landing pages share the same header. Their landing copy also stopped being invisible: it was styled with a `prose` class that does not exist in this project (there is no Tailwind Typography plugin) and now uses `.ms-prose`.
- **Listing detail** (`app/business/[slug]/page.tsx`): an identity band carrying the category, name, area, rating, open/closed state and the three actions a visitor wants (call, directions, website) with the photograph — or the branded category panel — beside it; then about, services, hours, reviews and the enquiry form beside a sticky contact card, and related listings in a soft band.
- **Rating system** (API `ratingBreakdown`, `rating-panel.tsx`, `rating-stars.tsx`, `review-list.tsx`): the listing detail response now carries the approved-review distribution — five buckets, zeros included, empty when nothing is approved — computed with a grouped read over *all* approved reviews. It is deliberately not inferred from the page of reviews the client happens to have loaded, and not a stored aggregate, so it cannot drift from the moderation state. The page shows the average, a partial-fill star row (a 4.3 average looks like 4.3, not five stars), the count, and a bar per star where the count and percentage are written out, so nothing depends on the bar alone (NFR 011). An unrated listing says "No reviews yet" and invites the first review instead of drawing an empty five-star row, which reads as a zero.

### Verification

`pnpm check` green — database 23, API 153, admin 99, web 64, domain 12, worker 16, e2e 19, all builds, admin bundle entry 751 kB, contracts regenerated and in sync. `pnpm test:integration` green — database 5, API 116, including a new integration test that submits and approves 5/5/3-star reviews and asserts the published distribution, the empty array before the first approval, and that the buckets sum to the published count. Playwright: 34 journeys passing at desktop and 320 px, with the axe WCAG 2.2 AA scan extended to `/contact` — zero violations. Browser review of the contact, blog index, article, directory, category, area and listing pages at 1440/1280/390 px: no horizontal overflow (`scrollWidth === innerWidth`), no clipping or overlap.

### Notes and limitations

- The contact form cannot be exercised end to end locally: without `TURNSTILE_SECRET_KEY` the API answers 503 by design, and there is no email provider adapter (both are decision D03). Rendering and validation were verified against a temporary instance started with Cloudflare's published *test* site key; no key was written into the project.
- A defect found while testing the category visuals: `auto-repair` was matching the home-services rule ("repair") before the auto rule, so a mechanic would have been given a plumbing wrench. Rules are now ordered specific-first, with hyphen boundaries for short ambiguous tokens ("car" inside "carpet"); covered by `category-visuals.test.ts`.

## Phase 28 — General settings, brand marks, loading and error states (complete, 2026-09-07)

SRS: CFG 001 (site identity, branding, contact routing), BUS 003 and BLOG 001/004 (profile links), UX 002, SEO 001–003, NFR 006/011/012, SEC 001.

Client instructions that shaped it: an editable general-settings screen; social **icons instead of text everywhere**, with Pinterest added; icons shown wherever a link is valid, including the header and the directory; real star icons in the review rating; a loading screen on both the public site and the admin; and error pages that fail gracefully.

### Delivered

- **General settings** (`apps/api/src/settings/general-settings.ts`, `dto/general-settings.dto.ts`, admin `GeneralSettingsPage.tsx`): application, short and organisation name, tagline, default meta description, support email, Australian phone, website, postal address, logo/browser icon/share image chosen from the media library, the header contact bar and the footer copyright template (`{year}`, `{name}`) and text. Validated server-side, versioned with `expectedVersion`, audited by shape only — the audit metadata records counts and flags, never the values. A support address on a development domain (`.local`, `.test`, `.invalid`, …) is refused rather than published as a dead mailbox, and the contact bar cannot be enabled with nothing to put in it. The public shell reads the settings and omits anything unset instead of rendering a blank; a failed settings read falls back to the shipped defaults, so no page ever fails because of the shell.
- **Pinterest** across the three link vocabularies — the site's own profiles, business links (BUS 003) and author links — with `pinterest.com`, `pinterest.com.au` and `pin.it` as its own domains. One additive migration (`20260907065911_social_link_pinterest`) extends both enums; every existing value keeps its position, so no row is rewritten.
- **Brand marks instead of link text** (`apps/web/src/components/brand-icon.tsx`, admin `src/components/BrandIcon.tsx` + `shared/brands.ts`): one table of icon and name per kind, used by the header contact bar, the footer, listing detail links, the author card, the share row and the admin editors. The icon is decorative; the platform name (or the editor's own label) is the accessible name and the hover title, and targets are 44 px (36 px inside the slim contact strip). LinkedIn deliberately keeps a neutral globe: Simple Icons withdrew that mark at the trademark owner's request, and hand-copying it would reinstate exactly what was withdrawn.
- **Rating stars are icons** (`rating-stars.tsx`, `review-form.tsx`): the display row and the review form both draw the icon set the rest of the interface uses instead of the ★ character. The form is still a native radio group — five radios, one per star, filled up to the choice, each named "N stars" for a screen reader, with "4 of 5" beside it.
- **Waiting is visible** (NFR 012). Public: a navigation indicator (`route-progress.tsx`) — a top progress bar and a corner spinner from the moment an internal link or GET form is used until the new page renders, announced politely. It is deliberately **not** a `loading.tsx` boundary: a streaming placeholder is all a visitor sees when JavaScript is off, which was the /business defect found during the UAT journeys. Admin: one `PageLoader` for route code, the session check and record loads, plus a boot loader in `index.html` that is removed once React mounts, so a slow connection never shows a white page.
- **Error pages** (`status-page.tsx`, `error.tsx`, `global-error.tsx`, `global-not-found.tsx`, admin `ErrorBoundary.tsx`): one designed treatment — dark title band, the status named ("Error 404"/"Error 500"), a plain explanation, the digest as a quotable reference and real published destinations, with a retry on the error boundary. `global-error.tsx` covers a failure in the root layout itself and depends on nothing but the stylesheet. The admin boundary tells a stale build (`ChunkLoadError` after a deployment) apart from a genuine fault and offers the reload that actually fixes it, with the time of the failure. The API needed no change: its exception filter already answers every failure with the `{error:{code,message,fields,requestId}}` envelope — verified again by curl for an unknown route, a wrong method, a malformed body and an anonymous admin call.

### Defects found and fixed

- Two assertions in the in-progress settings work expected `listings@melbournesphere.com` for the input `Listings@MelbourneSphere.com.au` (unit and integration); the normaliser only folds case, so the expectations were wrong, not the code.
- `link-in-text-block`: the review and comment acknowledgements, the hours-correction mailto and the 404 body used colour-only links inside sentences. They are underlined now — a genuine WCAG 2.2 AA failure that only surfaced once a Turnstile site key made the forms render.
- The axe journey waited for `networkidle`, which never arrives once the Turnstile widget holds a connection open. It now waits for `load` and for the images to decode, which is what the contrast check actually needs.
- A broken `@icons-pack/react-simple-icons` link in `apps/admin/node_modules` (pnpm recorded the dependency without its React peer while skipping resolution); the lockfile entry was corrected and the install repaired.

### Verification

`pnpm check` green — database 23, API 168, admin 103, web 74, domain 12, worker 16, e2e 19, all builds, admin bundle entry 753 kB, contracts regenerated and in sync. `pnpm test:integration` green — database 5, API 118. Playwright: 34 journeys at desktop and 320 px (4 admin journeys skipped without credentials), including the axe WCAG 2.2 AA scan of `/`, `/business`, `/blog`, `/contact` and a listing — **zero violations**. Runtime: the settings document seeded into the dev database and checked in the browser — five brand marks in the header bar and footer including Pinterest, 44 px icon links on listing detail, five star radios, no horizontal overflow at 1280 px; the designed 404 at a real 404 status; and with the API stopped, an uncached page returned a real **500** with the shell intact, the reference printed and a working retry (a cached page still answered from the data cache, as intended).

### Notes and limitations

- The admin screens behind sign-in (loaders on the editors, the icons in the link selects) are covered by their unit tests; they were not driven in the browser, because doing so means typing an administrator password.
- The public site now renders the Turnstile widget: a real site key is present in the git-ignored `apps/web/.env.local`. Submissions still need the matching API secret.

## Phase 29 — Administrator roles, permissions and permission-aware admin (complete, 2026-09-07)

SRS: **1.1 RBAC 002–012** (new, added at explicit client instruction), amending RBAC 001 and withdrawing the ADM 003 deferral of role-editing interface. Decision record: `docs/decisions/0001-authorization-casl.md`. Developer guide: `docs/authorization.md`.

Client requirement: permissions assignable to roles, roles to administrators, permissions also directly to an administrator; an admin interface showing only what the signed-in administrator may use; and backend enforcement of every permission.

### Specification first

The SRS moved to revision 1.1 with a change-log entry naming the affected IDs, the data, security and test impact, and the approver. RBAC 002–012 specify the catalogue, roles, assignments, effective-permission calculation, enforcement, the principal endpoint, the administration API, caching and revocation, the interface, the privileged invariants and the audit trail; section 13 gained the entities, section 16 the endpoint families, section 21 test group T15. No unrelated section was rewritten.

### Delivered

- **Model.** `effective = permissions of active roles ∪ direct permissions`, restricted to active permissions and empty unless the account is active. Grant-only: no deny rules, recorded as a deliberate decision so a future deny model arrives through a migration rather than by accident.
- **Catalogue** (`identity/permissions.ts`): 22 codes with label, description, module and active/system state, six of them new for access control (`roles.view/create/update/delete`, `permissions.view`, `admins.access.manage`). Declared in code, synchronised by the idempotent `admin:seed-rbac`, and never creatable through an interface. The established codes were **not** renamed to the client's example names: they are the ones SRS RBAC 001 names and every route, seed, test and existing assignment carries, and a rename would be a data migration with no behavioural gain (RBAC 002 governs the convention, not a fixed list).
- **Schema** (migration `20260907082702_authorization_roles_and_direct_permissions`, additive): role activation and version, permission label/module/active/system, `admin_permissions` for direct grants, `assignedById` on every assignment, `admin_users.authzVersion`, `audit_logs.userAgent`. Deletion behaviour keeps history: assignments cascade with their administrator, never remove a permission row, and null the assigning administrator rather than vanishing.
- **Enforcement** (`AuthorizationModule`): the resolver, a CASL 7.0.1 ability factory used directly (NestJS's documented pattern, no third-party wrapper — ADR 0001), and the existing default-deny guard now deciding through the ability. Unregistered or retired codes can never satisfy a requirement. 401 without authentication, 403 without permission, no role-resolution detail in either.
- **Administration API**: roles list/read/create/update/activate/delete, complete replacement of a role's permissions, the read-only catalogue, an administrator's access, and complete replacement of their roles and direct permissions — every one permission-checked, `expectedVersion`-guarded (409 `STALE_VERSION`), transactional with its audit record, and idempotent on repeat.
- **Cache and revocation**: effective permissions cached under `authz:admin:{id}:v{authzVersion}`; every access change increments the version in the same transaction, so withdrawn access is gone on the next request rather than at a TTL. Redis unavailable falls back to MySQL — proven not to grant *or* lose access.
- **Invariants**: no self-editing of access, no granting beyond what the actor holds, the last active super administrator cannot be demoted or disabled, the protected role cannot be deleted, deactivated, unprotected or hand-edited, no inactive role or unknown permission assignment, no deleting a role still in use.
- **Admin interface**: Refine `accessControlProvider` fed by the server's codes, one canonical route→permission mapping, a route guard that waits while capabilities are unknown and otherwise renders an accessible forbidden page, typed codes with a drift test against the API catalogue, navigation that shows nothing until capabilities are known, and screens for roles, the role editor with a module-grouped permission matrix, the read-only catalogue and an administrator access editor that distinguishes inherited from direct and names the source of every effective permission.

### Defects found and fixed

- **CASL wildcard escalation.** Mapping `resource.action` onto CASL's action/subject made `admins.manage` a wildcard (`manage` means "any action" in CASL), which would have granted `admins.access.manage` and every future `admins.*` code. The whole code is now the action on one subject; a unit test holds the line.
- The pre-existing auth integration test edited permission tables directly and expected the next request to see it; with the version-scoped cache that is deliberately invisible. It now signals the change the way the API does.
- The administrator access editor implied "nothing granted" for an account that is merely not active; it now says the access is kept but not in force.
- The permission matrix overflowed horizontally at 390 px, and the roles table broke role keys across lines.

### Verification

`pnpm check` green — database 23, API 178, admin 117, web 74, domain 12, worker 16, e2e 19, all builds, admin bundle entry 775 kB, contracts regenerated and in sync. `pnpm test:integration` green — database 5, API 139, including the 21-case access-control suite against real MySQL and Redis. Browser: signed in through the documented reset-link flow (temporary value, rotated and its session revoked afterwards), then checked the roles list, permission catalogue, role editor and administrator access editor at 1280 px and 390 px — no horizontal overflow, a real role assignment saved through the confirmation dialog, and the resulting `authz.admin.roles` audit event read back with a safe summary. Axe (unit) over the role editor and access editor: zero violations.

### Notes and limitations

- No explicit deny rules, and no `@casl/prisma`: neither is required by SRS 1.1, both are recorded in ADR 0001 as deliberate omissions with the conditions for revisiting them.
- Authorization audit events share the existing `audit_logs` table under the `authz.*` action family rather than a separate table: it already carries actor, target, safe metadata, request id and address, keeps text targets that survive a deleted role, and one audit trail is better than two that can disagree. `audit_logs.userAgent` was added for RBAC 012.
- The four Playwright admin journeys still skip without credentials; the access-control behaviour they would cover is proven by the API integration suite and the admin unit tests.

## Access-control audit and remediation (complete, 2026-09-07)

Full report: `docs/audits/authorization-integration-audit.md`; route matrix: `docs/audits/route-authorization-matrix.md`.

An adversarial audit of administrator authentication, roles and permissions, run against the real MySQL and Redis and the running applications, treating the Phase 29 completion claims as unverified.

### Defects found and fixed

- **Critical — self-escalation.** `PATCH /admin/admins/{id}` and `POST /admin/admins` assigned roles with only `admins.manage`, with no self-edit check, no "cannot grant beyond your own permissions" check and no active-role check. An account manager could make themselves a Super Admin in one request; proved at runtime (200 OK, 22 permissions afterwards). Both endpoints now require `admins.access.manage` for the role payload and go through the same `assertMayAssignRoles` invariants as the access API. The second, weaker assignment path is gone.
- **High — the last-super-admin invariant lost a race.** The check counted survivors outside the transaction that then wrote. Two concurrent demotions both returned 200 and left the deployment with zero active super administrators. `assertNotLastSuperAdminTx` now takes `SELECT … FOR UPDATE` on the protected role row inside the transaction and re-counts; applied to role replacement, account update and disable. The concurrency tests now see `[200, 409]`.
- **High — inactive roles were assignable** through the account endpoint (expected 400, got 200). Same fix.
- **High — privilege changes did not end the target's sessions**, contrary to AUTH 002 and inconsistent with the older account endpoint. Every role and permission change now revokes the affected sessions in the same transaction; a live session went 200 → 401 in 49 ms in the runtime check.
- **Medium — the frontend capability cache survived logout**: the previous administrator's codes still answered `can()` until a fresh `/me`. Extracted to `auth/capability-store.ts` + `auth/capability-lifecycle.ts`, cleared on logout, logout-causing errors and failed session checks, with unit tests.
- **Medium — editors rendered read-only for one render** before capabilities were known; they now wait, as RBAC 010 asks.
- **Medium — ten raw permission strings** across eight screens sat outside the typed catalogue and its drift test; all replaced with `useCapabilities().can(PERMISSION.…)`.
- **Medium — `@nestjs/mau`**, an unused dev dependency from the scaffold, pulled five high advisories into the tree; removed (9 → 4 high).
- **Low — dead code**: the superseded unlocked check and role resolver were removed so they cannot be called by mistake.

### Evidence added

`authorization-audit.integration-spec.ts` (21 attack scenarios: escalation on every path, two concurrency tests, session replay after revocation, corrupt cache, cross-user cache, forged codes and role ids, pagination limits, oversized payloads, injection and markup in role text, audit immutability and secret-freedom, the `/me` contract, and a sweep proving **all 137 admin routes** refuse an anonymous caller with 401 and a permission-less administrator with 403 except the 5 public and 9 session-only ones); `authorization-schema.integration-spec.ts` (8 constraint proofs against real MySQL: duplicate assignments, orphans, restricted deletes, cascade with audit survival, collation, indexes); admin `capability-lifecycle.test.ts` and `ActionGating.test.tsx`.

### Runtime verification

Five personas against the live stack — super administrator (22 permissions, everything allowed), role-limited editor (3, moderation and configuration refused), editor plus one direct permission (4 = 3 inherited + 1 direct, moderation allowed), an administrator with nothing (0, everything refused but the session-only dashboard, which returns no metrics), and a disabled account (login refused). Browser: the editor's navigation showed only Overview and Editorial; `/admin/roles` typed directly rendered the forbidden page while the API answered 403; signing out cleared the session. Persona passwords were random, single-use, kept in the session scratchpad and deleted with the accounts.

### Verification

`pnpm check` green — database 23, API 178, admin 129, web 74, domain 12, worker 16, e2e 19, all builds, admin bundle entry 776 kB, contracts in sync. `pnpm test:integration` green — database 5, API 168. Playwright 34 passed, 4 skipped. Frozen-lockfile install, Prisma validate/generate, migration status and policy check all clean. Secret scan of trackable files clean.

### Note

`docs/traceability.md` was renamed to `docs/requirements-traceability.md` (the path the client's instructions use), and every reference updated.

## Access-control audit closure (complete, 2026-09-07)

Closes the items the audit left open; the findings themselves are unchanged. Addendum: `docs/audits/authorization-integration-audit.md`.

- **Privileged-mutation ceiling** (SEC 003): a guard that runs *after* authorization, so it meters what an already-authorised session may do and never turns a missing permission into a 429. 20 per minute and 200 per hour **per administrator** — the id, never `X-Forwarded-For`, which is only meaningful for the documented `TRUST_PROXY` hops. Covers administrator create/update/enable/disable/setup-resend, session revocation, role create/update/delete, role-permission replacement and administrator role/permission replacement. A Redis outage falls back to 5 per minute per process — a ceiling, not a closed door, so an operator can still restore access. Refusals use the standard envelope with `Retry-After` and disclose no counters.
- **The four skipped Playwright journeys are gone**, replaced by five that run on desktop and at 320 px: permission-aware navigation (including the mobile drawer), forbidden direct navigation with the API still answering 403, allowed action visibility, forbidden action suppression, a direct grant with no role at all, live revocation during an open session, and logout clearing session and browser state. `e2e/specs/provisioning.ts` creates the administrators with `crypto.randomBytes` passwords, refuses `NODE_ENV=production` and any database not ending in `_dev`/`_test`/`_e2e`, and cleans up before *and* after so a mid-run failure leaves nothing usable. Suite: **44 passed, 0 skipped** (was 34 + 4 skipped).
- **Verified MySQL TLS — implemented, not just documented.** The audit's mitigation for the `mariadb` advisory turned out not to exist: the connection layer never passed an `ssl` option. `DATABASE_URL` now carries `?sslmode=disabled|required|verify-ca|verify-identity` (with `?sslca=`), the driver option is derived from it, and **production refuses to start** unless the mode verifies. Covered by `url.spec.ts` and `env.validation.spec.ts`.
- **Advisory disposition**: `docs/security/dependency-advisories.md` — package, version, path, severity, whether the vulnerable path is used, the fixed version, why upgrading is or is not possible, the mitigation, the production action and the revisit trigger. No overrides were used: `@prisma/adapter-mariadb@7.10.0` pins `mariadb@3.4.5` exactly, so the fix is genuinely unreachable until Prisma moves.
- **Operational consistency**: `docs/operations/authorization-runbook.md` (supported changes go through the API; emergency SQL must bump `authzVersion` and revoke sessions; recovery path) plus `pnpm --filter api authz:verify [email]`, which reports the invariants or one administrator's access and says whether the cache is in step with the database. No polling was added.

Verification: `pnpm check` green (database 27, API 185, admin 129, web 74, domain 12, worker 16, e2e 19, builds, bundle 776 kB); `pnpm test:integration` green (database 5, API 169); Playwright 44 passed / 0 skipped; frozen-lockfile install, Prisma validate/generate/status/policy clean; secret scan clean and the e2e fixtures verified removed from the database.

## DIR 008 — conditional "Open now" filter (complete, 2026-09-07)

The last SRS requirement that was neither delivered nor blocked by a client decision. DIR 008 makes the filter **conditional**: it ships only when the hours data supports it, because a filter that quietly drops well-run listings with no published hours is worse than no filter.

- **Predicate in SQL** (`directory/hours/open-now.ts`) so paging, counts and facets stay in the database, with Melbourne's wall clock computed by the same Intl helpers the evaluator uses and passed in as plain numbers. It covers today's intervals, all-day, an interval that began yesterday and runs past midnight, and date exceptions replacing the weekly rule in both directions. A listing with no published schedule is never "open".
- **One authority, proven.** `evaluateHours` remains the display authority; `open-now.integration-spec.ts` seeds a listing per case against the real MySQL and asserts the SQL set equals the evaluator's answer at the same instant. That comparison caught a real gap: the predicate trusted `endNextDay` on rows the schedule validator would reject, so a malformed row could have read as "open all night". Both now require the closing minute to be earlier than the opening minute.
- **Conditional exposure**: the filter is offered only when at least 60% of published listings publish a schedule and at least five do. `meta.openNow` reports `available`, `applied`, `withHours` and `published`; below the threshold a request for it is answered **unfiltered** rather than with a misleadingly short list. Verified at runtime on the dev data (2 of 3 listings with hours → `available: false`, `applied: false`, full results returned).
- **Web**: `?openNow=1` round-trips through the URL like every other filter, and the control appears only when the API says it is available — never disabled or misleading. Cached search answers carry the Melbourne minute in their key, so a cached page cannot claim a shop is open after it has closed.

Verification: `pnpm check` green (database 27, API 185, admin 129, web 75, domain 12, worker 16, e2e 19, builds, contracts regenerated); `pnpm test:integration` green (database 5, API 172).

## Launch-readiness decision pack and external-service boundaries (complete, 2026-09-07)

Consolidates everything the client must decide or supply, and closes the one external-service boundary that still had no production adapter.

- **Decision pack** in `docs/launch/`: `client-decisions.md` (D01–D08 plus SEO sign-off, review rich results, on-call, staging ownership and the screen-reader review: question, why it matters, recommended default, alternatives, technical impact, deadline, status, owner), `melbourne-boundary.md` (D01: the three models evaluated; recommendation for a curated allow-list of gazetted localities bounded by ABS Greater Melbourne, activated in tiers with the council area as Tier 1; validation behaviour today and proposed; data-update procedure; acceptance criteria — **nothing activated**, the 14-area baseline stands), `content-requirements.md` (audit of development-only content plus every client-supplied item with location, format, length, image sizes, accessibility requirement, fallback and approval status) and `seo-approval.md` (titles, descriptions, patterns, canonical and indexing policy, structured data, SEO 006 sign-off record). No production contact details, credentials, legal copy, owners or brand assets were invented.
- **Transactional email boundary** (`packages/mail`, `@melbourne-sphere/mail`): SMTP on nodemailer 10.0.0 — the provider-independent shape every D03 candidate offers — with bounded timeouts (DNS 5 s, connection 10 s, greeting 10 s, socket 30 s), no pooling, plain text only, no file/URL access, header-injection refusal, a caller-owned stable `Message-ID`, and failures classified transient/permanent with addresses redacted before they are thrown. `MAIL_TRANSPORT` gains `smtp`; the API (`SmtpMailer`) and the worker (`SmtpEnquiryMailer`) both use it; **production refuses to start** unless `smtp` is configured with an authenticated, TLS-protected, non-loopback relay and a verified sender, and start-up errors name variables only. Worker: one attempt per job, the queue keeps the retries; the "no provider adapter" production refusal is gone. Runtime: password reset and contact enquiries delivered through the adapter into Mailpit with Reply-To and `Message-ID`, `providerAccepted` recorded, a replayed idempotency key sent once, a closed relay classified transient in 5 ms.
- **CAPTCHA, storage and queue boundaries** reviewed against the requirements: `CaptchaPort`/`TurnstileVerifier` (5 s timeout, fail-safe 503, hostname/action checks, no token logged), `ObjectStoragePort`/`S3ObjectStorage` (signed constrained uploads, quarantine never public), `QueuePort`/`BullmqQueue` (job id = outbox event id, five attempts with backoff). Production already required their credentials; no change needed.
- **Local services**: Mailpit `v1.31.1` added to Compose (loopback `1025`/`8025`, health check, named volume, message cap); MinIO and Redis/BullMQ were already present. Ports checked free before binding; no other container touched.
- **Content isolation**: the starter favicon (the Vercel mark) replaced by an original development icon; review and comment forms link to `/review-guidelines` only once it is published; directory category and area pages follow the SEO 003 substantive rule; `AggregateRating` is gated behind `REVIEW_RICH_RESULTS` (off) per SEO 006. Public site audit found no `.local` addresses rendered, no fake contact details, claims, testimonials or ratings.
- Build tooling: `mail:build` in `check`/`contracts:*`, both Dockerfiles and CI build the shared packages before typecheck.

Verification: `pnpm check` green (database 27, API 188, admin 129, web 79, domain 12, **mail 10**, worker 19, e2e 19, all builds, admin bundle entry 776 kB, contracts in sync). `pnpm test:integration` green on the confirming run (database 5, API 172); the first run failed two order-dependent cases unrelated to this work (`reviews` distribution answered 401, `static-pages` contact routing hit an HTTP parse error) and both passed immediately in isolation — recorded as flakes in `docs/ai/current-state.md`. Runtime: Mailpit at 127.0.0.1:1025/8025 started and healthy, private API on 3011 and a worker run with the SMTP transport, then stopped; user-started servers untouched. Secret scan over trackable files clean; no env file tracked; `apps/*/.env.example` and `infrastructure/.env.example` hold placeholders only.

## Launch-readiness cleanup: artifact revocation, test isolation, Mailpit consistency, mail audit (complete, 2026-09-07)

Closes the loose ends the decision pack left: the credentials a runtime check leaves behind, two order-dependent integration failures that were **not** harmless, and an audit of the new mail boundary.

### 1. Authentication artifacts

The reset link mailed during the earlier runtime check was retired, along with every other unused token and live session in the development database. `POST /admin/auth/reset-password` with that exact token now answers `400 INVALID_RESET_TOKEN`; the residue check reports `0 active token(s), 0 live session(s)`. No token value was written to a tracked file, a document or a log — it was read from the Mailpit inbox into an untracked scratch file, used once to prove refusal, and deleted.

New, and reusable: `apps/api/src/auth/auth-artifacts.ts` (`countAuthArtifacts`, `revokeAuthArtifacts`, `assertRevocableTarget`), the CLI `pnpm --filter api auth:revoke-test-artifacts` / `auth:artifacts:check`, and `e2e/global-teardown.ts`, which runs the provisioning cleanup after **every** Playwright run including a failed or interrupted one (the cleanup now also deletes reset tokens belonging to provisioned accounts). Both refuse `NODE_ENV=production` and any database not named `*_dev`, `*_test` or `*_e2e`, and print counts only. `apps/api/test/auth-artifacts.integration-spec.ts` proves the whole loop against the real database: a mailed link plus an open session are created, revoked, the link is then refused by the real flow, the session stops authenticating, and a second pass is idempotent.

### 2. Order-dependent integration failures — root cause

Both were the **same defect**, and it was real: **supertest binds a new ephemeral port for every request**. When the Nest app is only `init()`-ed and never `listen()`-ed, `server.address()` is null, so supertest calls `server.listen(0)` per request and closes it afterwards. Across a full suite that is thousands of bind/close cycles; a port handed out again while its predecessor is still in `TIME_WAIT` lets the new client read bytes belonging to the previous connection. Every symptom matches that and nothing else: a **public** review POST answered `401` (a response to an earlier admin request — the public route cannot produce 401, its guard returns early for non-admin paths), `Parse Error: Expected HTTP/, RTSP/ or ICE/` in the static-pages suite, and, reproduced during this investigation, a `403` assertion in the media suite receiving the `401` that the *preceding* line expected. Not shared database state, Redis keys, fake timers, singletons, transaction visibility or account collisions — the requests were answered by the wrong socket.

**Fix:** `listenForTests` in the integration harness binds the server once per test file on one ephemeral loopback port; `createIntegrationApp` and the bespoke bootstrap in `auth.integration-spec.ts` both use it, and `app.close()` releases it. supertest then reuses that address and never listens per request.

A **second, independent** defect surfaced while reproducing: `truncateApplicationTables` empties more than fifty tables inside one interactive transaction (so `FOREIGN_KEY_CHECKS = 0` covers them all), and Prisma's default 5 s transaction timeout expired mid-loop on a loaded machine — `A query cannot be executed on an expired transaction … 5280 ms passed` — taking four suites' `beforeAll` with it. The timeout is now explicit (60 s, `maxWait` 30 s), so a slow disk delays a run instead of breaking it.

**Determinism evidence:** the three implicated files individually (9, 4, 6 tests) ✓; the full suite in its normal order five consecutive times, 174 passed each ✓; the full suite in reversed file order ✓; the three files together five consecutive times ✓. Before the fix the same loop failed on two of three runs, with a different victim each time.

### 3. Local SMTP consistency

The ignored `apps/api/.env` now carries `MAIL_TRANSPORT=smtp`, `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025`, `SMTP_SECURE=false` (the variable names the mail package actually reads). Verified from that file: the password-reset message and an enquiry both arrive in Mailpit as `text/plain; charset=utf-8`, the enquiry carries the visitor as `Reply-To` and the configured sender as `From`, **two submissions sharing one idempotency key produced exactly one message**, and no token appears in the API console (the only `password` matches are route names). Mailpit was emptied afterwards. The file is still git-ignored; every `*.env.example` holds placeholders only. Production rules are unchanged and still refuse loopback, plaintext and unauthenticated relays.

The API the client left running on 3001 is a `start:prod` process, not a watcher, so it still runs the console transport: it needs their own restart to pick the change up. It was deliberately not stopped.

### 4. Mail-package audit

Reviewed each item and added tests for what was not yet proven: TLS pinned to 1.2 or newer with certificate verification never disabled; multi-address, display-name and bracketed values refused for `to`, `from` and `replyTo` so a caller cannot widen the envelope; subject bounded at 998 characters and, newly, the body at 256 KB with an empty body refused; plain text only, with no `html` or `attachments` key ever set and UTF-8 passed through unchanged; `verify()` failures classified like send failures; `close()` releasing the transport; the `Message-ID` identical across retries of the same message and never invented; and thrown errors carrying no body, subject, address or credential. Traced every input: the relay host comes only from the environment, the sender only from configuration, the recipient only from the listing's encrypted field or the configured site recipient, and `Reply-To` — the one visitor-supplied header value — is validated in `packages/domain` and again in the transport. **No request can select an arbitrary SMTP host, sender or Reply-To.**

**Verification.** `pnpm check` green (database 27, API 188, admin 129, web 79, domain 12, mail 16, worker 19, e2e 19, all builds, admin bundle entry 776 kB, contracts in sync). Integration determinism: 5 consecutive full runs (174 passed each), a reversed-file-order run, 5 repeats of the implicated trio, and each implicated file alone — all green. Secret scan over tracked and untrackable-but-present files clean; `apps/api/.env` still git-ignored; no token literal in any trackable file; the scratch file holding the captured token was deleted. `pnpm --filter api auth:artifacts:check` reports 0 active tokens and 0 live sessions. Mailpit emptied.

## Next step

All planned phases are complete. The client-facing register is `docs/launch/client-decisions.md` (index: `docs/launch/README.md`); every remaining item is a client decision or input, a staging-dependent verification (UAT journeys, capacity run and restore drill on the production shape), or the manual screen-reader pass. Engineering follow-ups that unlock on decisions: boundary rules 5–7 (D01), provider webhooks for bounces (D03b), the error-tracker integration (D03d), and a mandatory-TOTP gate if chosen (D06). Infrastructure is running (`pnpm infra:status`); stop with `pnpm infra:down` (keeps data).

---

# SRS 1.2 extension — Phases 30–41 (System & Settings, Security Settings, Website content)

Authorised by client instruction of 7 September 2026, specified by SRS sections 25–26 (revision 1.2) and informed by the read-only Logimart reference comparison in `docs/reference/logimart-comparison.md`. Implemented **one module at a time**; each phase runs the same gate: focused checks while implementing, then `pnpm check` and `pnpm test:integration`, browser verification of the primary workflow, then traceability, current-state and this file updated before the next phase starts.

| Phase | Module | SRS IDs | Key deliverables |
| --- | --- | --- | --- |
| 30 | Shared settings architecture and permission catalogue | SET 001–005, RBAC 013 | Typed setting registry per owned group (security / email / operations / website), declaration metadata, validated versioned update path with transactional activity audit and cache invalidation, permission codes for every module of sections 25–26 |
| 31 | Resend provider and email logs | MAIL 001–010 | Resend adapter behind `packages/mail`, production config validation, delivery records, signed webhook with event idempotency and status precedence, read-only log UI with masked recipients and audited unmasking, throttled manual resend, deliverability documentation |
| 32 | Activity log | ACT 001–006 | Typed event catalogue, consolidated append-only read model over admin/authorization/operational events, redaction, bounded filters and indexes, 365-day retention job |
| 33 | Security settings | SECS 001–008 | Authentication, password policy, login security and session security groups — enforced, bounded by AUTH 001/002 and SEC 002, recovery-path invariant, session administration, audited consequences |
| 34 | Cache manager | CMGR 001–005 | Namespace/tag registry, Redis availability and counts, registered invalidate/warm operations only, throttled audited actions, prohibited-capability tests |
| 35 | Queue monitor | QMON 001–005 | Per-queue BullMQ metrics, worker availability, redacted job detail, retry/cancel/pause/clean within bounds, bounded bulk with per-item outcomes |
| 36 | Scheduled tasks | TASK 001–006 | Code registry with schedule metadata, BullMQ job schedulers, distributed lock, missed-run policy, allow-listed "run now" dispatched to the worker, 30-day history |
| 37 | FAQs | FAQ 001–005 | Admin CRUD with publication actions, sanitised answers, accessible public disclosure list, gated `FAQPage` structured data |
| 38 | Service alerts | ALRT 001–007 | Alert model with severity and display window in Melbourne time, deterministic selection, above-header rendering, version-aware keyboard-accessible dismissal, write-time URL validation, urgent cache purge |
| 39 | Testimonials | TSTM 001–005 | Consent/approval record with approver, approved media, sanitised quotes, publication gated on approval, clean empty state |
| 40 | Client/partner logos | PTNR 001–005 | Content-only partner records with recorded display authorisation, mandatory alt text, validated URLs, clean empty state |
| 41 | Cross-module audit and documentation | all of 25–26 | Authorization, sensitive-data exposure, cache-key separation, queue redaction, email idempotency, webhook security, audit completeness, production configuration, accessibility, responsive, SEO, migration safety and backup implications; defects fixed and traceability closed |

New client decisions raised by this extension are **D09** (Resend account, verified domain, DNS records, approved addresses, webhook secret, DMARC schedule) and **D10** (initial website content and its rights: FAQ copy, alert policy, consented testimonials, partner logo authorisations) — both recorded in SRS §23 and to be tracked in `docs/launch/client-decisions.md`.

## Phase 30 — Shared settings architecture and permission catalogue (2026-09-07)

**SRS:** SET 001–005, RBAC 013 (revision 1.2, section 25).

**Delivered.** Configuration is now separated by ownership rather than pooled: `security_settings`, `email_settings` and `operations_settings` join the established `site_settings` table, one per owning module, added by the reviewed migration `20260907135714_settings_owned_groups` (additive; it also drops the `permissions.updatedAt` default left by the 1.1 backfill, which had shown as schema drift on every migration since). `apps/api/src/settings/registry.ts` declares each group with its owner, store, permissions and note, and declares each setting with the metadata SET 002 requires — type, bounds, default, visibility, runtime-or-restart, sensitivity, view and update permissions, the cache tags it invalidates, and `enforcedBy`. `settings-store.service.ts` implements the whole SET 003 contract once: validation with field errors, `expectedVersion` with 409, the change and its audit record in one transaction, declared cache invalidation, and an unchanged save as a no-op that writes nothing. `settings-groups.controller.ts` gives each group its own route pair with statically declared permissions, plus a session-only registry listing filtered to the groups the caller may view.

The three new groups intentionally declare **no settings yet**: each one lands with its enforcement in its own phase, because SET 005 and SECS 001 forbid a stored-but-unenforced control. The registry spec fails if a group is left empty without a note explaining that, if any declaration is credential-shaped or marked sensitive, or if a setting has no `enforcedBy`.

**Permission catalogue (RBAC 013).** 41 new codes across three new modules — System, Security and Website — covering email logs (including recipient unmasking as a code distinct from viewing), activity logs, cache, queues, schedules, security settings and sessions, and the four website content modules. Viewing and acting are always separate. `pnpm --filter api admin:seed-rbac` applied them (41 created); the admin app's mirror list was extended so the contract test still proves the two agree.

**Verification.** API unit 216 passed (registry invariants, generic store contract with fakes, reserved-slug rules); `settings-groups.integration-spec.ts` 11 passed against the real MySQL: registry filtering by permission, 401 anonymous, 403 per group without a permission and without naming it, defaults at version 0, unknown key rejected with field errors, malformed payload rejected, 409 on a stale version, unchanged save writing no row and no audit event, and each group proven to live in its own table with the website group unreachable through the generic routes.

## Phase 30a — Listing page layout and the public directory route rename (2026-09-07)

Two client requests handled alongside Phase 30.

**Enquiry form moved into the listing sidebar.** On `/business/{slug}` the enquiry form sat at the foot of the main column while the sidebar ended after the contact card, leaving most of the right-hand column empty. The form now sits under the contact card in the sidebar (`EnquiryForm` gained a `compact` prop so its fields stack in one column at every width, because the previous two-column layout was keyed to the viewport rather than to the space the form actually has), the sidebar column is no longer sticky since it is now taller than the viewport, and the column is 28 rem. Measured on the dev listing: sidebar 1208 px against a 1672 px main column, previously about 600 px; no horizontal overflow. The `#enquiry-heading` anchor the hero's "Send enquiry" action targets is unchanged.

**`/directory` renamed to `/business` (SRS revision 1.3, UX 002/003).** The list, the curated category and area pages and the listing detail now share one prefix: `/business`, `/business/category/{slug}`, `/business/area/{slug}`, `/business/{slug}`. Public navigation, breadcrumbs and the footer heading read "Businesses"; the admin navigation group and the permission-matrix module read "Business". Old addresses answer 301 in the web middleware — a mechanical `/directory…` → `/business…` mapping that preserves the query string, deliberately not a seeded redirect row, so the rename cannot depend on a seed having been run. `category` and `area` became reserved business slugs, because a static route segment wins over the dynamic one and a listing slugged that way would be unreachable; refused at write time in `directory.service.ts` with a unit test. The sitemap emits only the new addresses.

**Verification.** `next build` lists the four `/business` routes; runtime: `/business` 200, `/directory` 301 → `/business`, `/directory/category/cafes?page=2` 301 → `/business/category/cafes?page=2`. Web unit 80 passed, admin 129 passed, API 216 passed, SEO and open-now integration specs updated to the new paths.

## Phase 31 — Resend provider and email logs (2026-09-07)

**SRS:** MAIL 001–010 (revision 1.2, section 25).

**Provider.** `packages/mail` gained a second adapter behind the same boundary: `ResendTransport` speaks the provider's HTTP API with `fetch` (no client library — one POST is the whole surface, and a dependency would own the retry, timeout and classification that EVT 002 specifies), sends a stable `Idempotency-Key`, classifies 429 and 5xx as transient and every other 4xx as permanent, and never lets a recipient, body or key into an error. `MAIL_TRANSPORT` now accepts `resend`; production start-up **fails** on a missing or malformed key, an absent sender, a sender on a development or reserved domain, a missing webhook secret or an overridden API base URL.

**Delivery records.** Migration `20260907151409_email_delivery_records` adds `email_deliveries` and `email_delivery_events`. Operational metadata only: no rendered body, the recipient held as AES-256-GCM ciphertext with a masked display form, and failures recorded as a bounded code plus a redacted summary. `providerMessageId` is unique so a duplicated acceptance cannot fork a record, and `providerEventId` is unique because that uniqueness is what makes duplicate webhook delivery idempotent.

**Webhook.** `POST /api/v1/webhooks/email` verifies the Svix-style signature over the **raw** body (kept for `\`/webhooks/\`` paths only, in the body parser) before parsing anything; unsigned, wrongly signed, tampered, stale and replayed requests answer 401 with a body that explains nothing. Events are deduplicated on the provider event id, out-of-order events record their own timestamp without lowering a more meaningful status (complained/suppressed > bounced > delivered > sent > queued), and untracked event types (opens, clicks) are acknowledged and ignored.

**Admin.** `/admin/email-logs` is read-only by construction — no create, edit or delete route — with filters, bounded pagination, a detail view with the provider timeline, a reveal endpoint behind `system.email_logs.recipients.view` that audits every reveal, and a resend behind `system.email_logs.resend` that refuses delivered, complained and suppressed messages and non-resendable templates, creating a linked new attempt. The **System → Email logs** screen mirrors those rules in the interface (masked recipient, reveal and resend hidden without the permission, confirmation stating the double-send risk).

**No duplicated send path.** Authentication mail is recorded by `RecordingMailer`, which wraps whichever transport is configured rather than reimplementing any of them; the worker writes the same record around enquiry delivery, so a bounce for an enquiry can be matched back. Recording is best-effort in both places: a log write never blocks an accepted message.

**Verification.** `packages/mail` 32 tests (config refusals with no value echoed, transport classification, webhook signature: valid, rotated secret, tampered body, wrong secret, replay in both directions, non-numeric timestamp, unconfigured). API unit 217. `email-logs.integration-spec.ts` 13 tests against the real MySQL covering every webhook refusal, unknown message, idempotent retry, out-of-order precedence, masking, absent write routes, the separate reveal permission with its audit row, both resend refusals, the linked replacement, bounded pagination and "a recipient is not a search key". Worker 22 (including the log records and that a failed log write still delivers). Admin `EmailLogsPage.test.tsx` 4.

**Documentation.** `docs/operations/email-deliverability.md` records the domain set-up (dedicated subdomain, SPF, DKIM, staged DMARC, From/Reply-To, bounce, complaint and suppression handling, rate limits, pre-launch test messages) and states plainly that no provider guarantees inbox placement.

**Outstanding:** D09 (account, verified domain, DNS, addresses, webhook secret) and, with it, staging verification; the 180-day/90-day retention job lands with the scheduled tasks module (TASK).

## Phase 32 — Activity log (2026-09-07)

**SRS:** ACT 001–006 (revision 1.2, section 25).

**One surface, not a third store.** Administrative actions, authorization changes and operational events already share `audit_logs`; ACT 001 asked for one consolidated *experience* over them, so this phase added the vocabulary and the reading, not another table. `audit/activity-catalogue.ts` declares activity domains (auth, admin, authz, listing, taxonomy, blog, media, settings, seo, review, comment, report, enquiry, email, system), each with a category and a label, and derives the outcome from the event code rather than storing a second field that could disagree with the first. `activity-catalogue.spec.ts` reads every `action:` in the API source and fails on a domain the catalogue does not declare — that is what keeps a caller from inventing an unregistered event, without a per-code list of eighty entries that would drift the first time somebody forgot it.

**Read model.** `/admin/audit` became `/admin/activity` (one route over one table; an alias would have been the duplication this module exists to remove) and gained `category`, `outcome` and `requestId` filters plus the derived `category`, `domainLabel` and `outcome` on every row. Category and outcome filter in the database, on the same suffix list the derivation uses. The admin screen is now **Activity log**, with category and outcome filters and a request-id search that follows one request across its events.

**Retention.** `AuditService.purgeExpired()` applies the 365-day bound of ACT 006 and PRIV 001, reports the number of rows removed and never their content, and is idempotent. It is registered as a scheduled task in the scheduled-tasks phase; until then it is called deliberately.

**Permission tidy-up.** `system.activity_logs.view` was retired in the catalogue (`active: false`) before it was ever assignable: the consolidated log is read with `audit.read`, which RBAC 001 already names, and two codes for one access is how a permission model rots. The admin contract test now compares against *active* catalogue entries, which is the correct reading of RBAC 002.

**Verification.** API unit 224 (7 catalogue tests including the source sweep); `activity-log.integration-spec.ts` 7 against the real MySQL: derived category/label/outcome, database filtering by category, outcome and request id, no create/update/delete route, secrets refused even when a caller passes them, bounded page size and rejected filter values, 401/403, and the retention purge proven to remove an aged row and to be idempotent. The default-deny route sweep and the admins suite pass on the renamed route; `/api/v1/admin/settings/registry` was added to that sweep's session-only list with the reason recorded.

## Phase 37 — FAQs (2026-09-07)

**SRS:** FAQ 001–005 (revision 1.2, section 26).

`faqs` (migration `20260907161650_website_faqs`) stores the answer twice, exactly as articles and information pages already do: the source the editor wrote and the sanitised HTML that is the only thing ever rendered, so a sanitiser change can be re-applied without losing the original. Sanitisation is the existing SEC 001 allowlist — the same path as posts, not a second one — and an answer that is nothing but disallowed markup is refused rather than saved empty. Publication is an explicit action; a repeated publish is a 409 rather than a silent no-op; reordering is one bounded transaction; every mutation writes an activity event with the change.

Public: `/faqs` renders published questions grouped as authored, using native `<details>`/`<summary>` rather than a scripted accordion — keyboard operable, announced correctly and working with no JavaScript, which is what NFR 011 asks for and what a scripted widget usually gets wrong. Nothing published means a 404, not an empty page. `FAQPage` structured data sits behind `FAQ_RICH_RESULTS`, off by default, on the same discipline as review rich results, and describes only the questions on the page with answers reduced to text. The footer links FAQs only once a question is published, on the same rule as the information pages.

**Verification.** `faqs.integration-spec.ts` 10 against the real MySQL (draft invisible publicly, sanitisation and the markup-only refusal, documented lengths, explicit publish/unpublish with the first publication timestamp kept, 409 on a stale edit, display order and transactional reorder, an activity event per mutation, view separated from create/update/publish/delete, bounded list and reorder payload); web `faq.test.ts` 2; admin `FaqsPage.test.tsx` 3. Runtime: two published questions render at `/faqs` in their groups with `<details>` disclosure and no structured data while the gate is off.

## Phase 38 — Service alerts (2026-09-07)

**SRS:** ALRT 001–007 (revision 1.2, section 26).

`service_alerts` (migration `20260907162953_website_service_alerts`) carries severity, a display window, dismissibility, priority and **two** version numbers: `version` is optimistic concurrency for editors, `contentVersion` is what a viewer's dismissal is keyed to. Editing the wording or severity bumps the second, so an alert somebody dismissed comes back with its new message; changing only the display order does not.

`alert-rules.ts` holds the two things worth proving on their own. **Selection** is severity, then priority, then display order, then creation time, then id — fully determined, so the same state always renders the same order and a caching layer cannot be blamed for a flicker that was really a tie. **Links** are validated at write time against an allowlisted scheme: a site-relative path or an http(s) URL, with `javascript:`, `data:`, protocol-relative `//host` and embedded credentials refused on save rather than filtered at render.

Public: the bar renders above the header on every page, server-side, so an alert outside its window cannot reach a page by any route. Severity chooses the accessible semantics — `role="alert"`/`aria-live="assertive"` only for a genuine emergency, polite otherwise. Dismissal is a real `<button>` with an accessible name that says which alert it closes; state lives in that browser only, is keyed to the content version, and storage being unavailable shows the alert rather than failing. It is rendered in document order rather than inside a Suspense boundary: a streamed boundary was swapped in *after* the header, which put the alert in the wrong place and shifted the page as it arrived.

Because the bar is on every page, publication, editing a published alert and removal purge the shell, and taking a live alert down is marked **urgent** (CACHE 002).

**Verification.** `alert-rules.spec.ts` 11 (window bounds with an exclusive end, severity outranking priority, deterministic ties, the bound of two, an expired emergency dropped, correctness across the Melbourne daylight-saving change, every unsafe link refused, assertive reserved for emergencies); `service-alerts.integration-spec.ts` 11 against the real MySQL (write-time link validation, link/label pairing, inverted window, draft invisible, window filtering, severity order and bound, content-version bump only on a readable change, 409s, the urgent purge event on unpublish, an activity event per mutation, public read without a session); web `service-alert-banner.test.tsx` 6. Runtime: the bar renders above the header as a direct body child at the top of the page.

## Phase 38a — Hero pause controls removed from the visual composition (2026-09-07)

Client instruction: remove both visible pause buttons (the circular one beside the headline and "Pause the banner" in the control row), while keeping the automatic motion.

HERO 003 and WCAG 2.2 SC 2.2.2 require a mechanism to stop automatically continuing motion — they do not require a permanently visible button. Both controls are now rendered off-screen (`sr-only`) and appear in place on keyboard focus (`focus-visible:not-sr-only`), so they stay in the accessibility tree, reachable by keyboard and announced to screen readers, while the hero carries no visible pause button. The motion itself is unchanged: it still stops under `prefers-reduced-motion`, while the tab is hidden, and when a visitor pauses it, and stepping through the images with previous, next or a dot stops the rotation, which gives a sighted mouse user a way to stop it without a button.

I first removed the automatic motion with the buttons — the only way to drop the controls and stay compliant — and restored it when the client confirmed they wanted the motion kept.

**Verification.** `hero-banner.test.tsx` 5: the pause control is present with `aria-pressed` and carries both `sr-only` and `focus-visible:not-sr-only`; the banner advances on its own after the seven-second dwell; stepping through with next stops it. Web suite 89 passed, axe clean on the hero. Runtime: both controls measure 1×1 px in the layout (off-screen) and are still in the accessibility tree; rotation was correctly paused in the check because the browser pane reports `document.hidden`.

## Phase 38b — Header layering: alerts, contact bar, pinned navigation (2026-09-07)

Client instruction: the top bar should hide on scroll, as in Logimart, and service alerts should sit above it.

Logimart achieves this by sticking only the navigation and leaving everything above it in normal flow. Melbourne Sphere had the whole header sticky, so the contact strip stayed pinned. The contact strip and the navigation are now **siblings** — the strip in normal flow, the navigation `sticky top-0` — rather than one sticky block: a `sticky` child only sticks within its own parent's box, so nested inside the header it would have unpinned the moment the header scrolled past. There is no scroll listener, so there is nothing to jank on a slow device and nothing to recalculate on every frame.

Rendered order is now service alerts → contact strip → navigation, which is the Logimart arrangement and was already the layout order; only the stickiness changed.

**Verification.** Runtime at three scroll positions: at rest, alerts at 0, contact strip at 380, header at 629; at 2000 px the contact strip is at −1620 (gone) and the header is pinned at exactly 0. Web suite 90 passed. An end-to-end check was added to `e2e/specs/accessibility.spec.ts` so the behaviour cannot regress silently: after scrolling, the header sits at the top and its navigation links are still reachable.

## Phases 39–40 — Testimonials and client/partner logos (2026-09-07)

**SRS:** TSTM 001–005, PTNR 001–005 (revision 1.2, section 26). Migration `20260907170938_website_testimonials_partners`.

**Approval and authorisation are evidence, not flags.** Each record names the administrator who gave it, when, and optionally how it was obtained. Publication is refused without it — `APPROVAL_REQUIRED` for a testimonial, and for an organisation three separate refusals in the order they matter: `LOGO_REQUIRED`, `ALT_TEXT_REQUIRED`, `AUTHORISATION_REQUIRED`, because each is a different mistake. Authorisation cannot even be recorded before there is a logo to authorise.

**Consent does not survive a rewrite.** Editing a testimonial's quote clears its approval and returns it to draft: consent was given for particular words. Changing an organisation's logo clears its authorisation for the same reason — permission was given for a particular mark. Both admin screens say this in a confirmation *before* the edit, rather than letting an editor discover it afterwards.

**Testimonials carry no rating.** The product's ratings are the moderated reviews of section 7; a second, unmoderated star display beside them would misrepresent both. Quotes are stored as plain text with markup stripped and bounded at 1,000 characters.

**A partner record is content and nothing else.** It is not an account, holds no credentials and grants nobody access — the reference project this module was modelled on let exactly that boundary blur, growing a logo strip into a customer account with API tokens, so the requirement, the migration comment and the service all state the boundary.

**Public.** Both bands render on the home page and are **omitted entirely** when nothing qualifies — no empty strip, no placeholder. Testimonials use semantic `figure`/`blockquote`/`figcaption`; a linked listing is dropped if it is no longer published. Partner logos carry their mandatory alternative text and use safe external-link attributes; a record whose asset has since disappeared is dropped rather than rendered broken.

**Verification.** `showcase.integration-spec.ts` 11 against the real MySQL: publication refused without approval, published once recorded with the approver named, approval cleared by a quote edit (and the testimonial pulled from the public list), markup stripped and bounds enforced, non-existent listing or image refused, the three partner refusals in order, authorisation refused before a logo exists, write-time website validation, nothing unpublished or unauthorised served publicly, an activity event per mutation in both modules, approving and authorising proven separable from creating, publishing and deleting, and both admin surfaces refused anonymously while both public lists need no session. Admin `Showcase.test.tsx` 5 proves the interface never offers an action the server would refuse. API unit 235, web 90, lint clean.

**Section 26 is complete.** All four website content modules ship empty and honest: they wait on the client's content and permissions (D10), not on engineering.

## Phase 33 — Security settings (2026-09-07)

**SRS:** SECS 001–008 (revision 1.2, section 25). Migration `20260907173222_security_password_history`.

**Eight settings, every one enforced.** `sessionIdleMinutes`, `sessionAbsoluteHours`, `maxConcurrentSessions`, `passwordResetMinutes`, `passwordMinLength`, `passwordHistoryDepth`, `loginMaxFailedAttempts`, `loginBlockMinutes`. Each declares in the registry the code that enforces it, and `SecurityPolicyService` resolves them once (15-second cache, invalidated on write) so `SessionService`, `AuthService`, `AccountService`, `PasswordService` and `LoginThrottleService` all read the same answer instead of each keeping its own constant.

**No setting can weaken the specification.** Every bound narrows AUTH 001/002 or SEC 002 and can never widen it: session timeouts are additionally clamped to what the deployment configured, login limits use `Math.min` on attempts and `Math.max` on windows, and a stored value outside its bounds is clamped rather than trusted — so the worst this module can produce is the baseline the SRS already requires. There is no boolean anywhere in the group: `loginEnabled`, `throttlingEnabled` and `passwordResetEnabled` are exactly the shape SECS 007 forbids, and the reference project's lockout switch is why the requirement says so.

**Mandatory two-factor is deliberately absent.** It is client decision D06, and SECS 001 forbids shipping a security control that is stored but not enforced. The group's note says this in the interface rather than leaving an empty switch that implies otherwise.

**Consequences are applied, not just described** (SECS 006). Lowering the concurrent session limit ends the oldest sessions immediately; lowering the password history depth prunes the hashes that are no longer needed — the second was found by its own test, which is exactly what the test was for. Both are audited. Session timeouts apply on the next request from each session, including sessions that already exist, and a password rule applies at the next password change: raising the minimum length cannot invalidate a stored hash, and the screen says so rather than implying otherwise.

**Password history** (`admin_password_history`) keeps only hashes, only to the configured depth, verified never compared, checked *before* a reset token is consumed so a refused password does not cost somebody their link.

**Session administration** (SECS 005) moved to its own capability: `security.sessions.view` / `security.sessions.revoke` replace `admins.manage` on the three session routes, so a security operator can end somebody's sessions without being able to create or disable administrators. Session listings gained a coarse `device` summary — browser family and platform, derived from the user agent, never presented as device identification, with a test proving no version, build or serial reaches it.

**Verification.** `security-settings.integration-spec.ts` 10 against the real MySQL: the declared defaults are the specification baseline; every weakening refused (eight cases, each with its field error); no setting exists that could disable sign-in, reset or throttling; a stricter minimum applies at the next change while the existing password still works; reuse refused and history bounded by the depth; the reset link shortened; the oldest sessions ended when the limit is lowered and when a new session would exceed it; the before/after summary recorded; and viewing separated from changing. Plus `device-summary.spec.ts` 4. API unit 240, integration 247, **three consecutive full integration runs green**. Admin `SecuritySettingsPage.test.tsx` 4 proves the form is generated from the server's declarations, a reader cannot edit, and neither the D06 note nor the "applies at the next change" wording is dropped.

## Phase 34 — Cache manager (2026-09-07)

**SRS:** CMGR 001–005 (revision 1.2, section 25).

**Two registries, no keys.** `cache/cache-registry.ts` declares what an operator may see and clear: *namespaces* this API holds in Redis under a declared prefix (`search:`, `business:`), and *tags* the web tier caches (businesses, posts, taxonomy, settings, pages, faqs, alerts, testimonials, partners). Clearing a namespace scans that prefix inside the current publication namespace; clearing a tag emits the ordinary invalidation event, so the same worker purges the same pages a publication would, across replicas and the CDN. Nothing outside the registry can be reached: an administrator names a registered entry, never a key or a pattern, so arbitrary commands, raw key access, whole-store flushes and pattern deletion have nowhere to enter.

**What must stay out of reach is written down and proven.** `PROTECTED_PREFIXES` names the key spaces this interface must never touch — `session:`, `throttle:`, `authz:`, `bull:`, `idempotency:` — and the spec proves no declaration overlaps them in either direction (a prefix inside a protected space, or one broad enough to swallow it). A second spec reads the module's own source and fails if `flushall`, `flushdb`, `sendCommand`, `client.call(` or `eval(` appear anywhere in it: the claim is that those calls do not exist, not that some code path avoids them. The integration test then writes real `throttle:`, `authz:`, `bull:` and `idempotency:` keys, clears every registered namespace, and asserts all four survive untouched.

**A real bug the tests caught.** ioredis applies its `keyPrefix` to ordinary commands but **not** to `SCAN`: the first implementation scanned an unprefixed pattern, matched nothing, deleted nothing, and reported success. The pattern now carries the prefix and the returned keys are stripped before `DEL` (which would otherwise apply it a second time). The integration test asserts on entries actually removed, which is why the silence was caught rather than shipped.

**Honest reporting.** Entry counts are sampled with a bounded SCAN and capped, and are labelled approximate in the API and on the screen. Redis being unavailable is reported as what it means for the site — pages are served from the database instead — and a clearing attempt while it is unreachable answers 503 rather than claiming success (CMGR 003).

**Verification.** `cache-registry.spec.ts` 6, `cache-manager.integration-spec.ts` 8 against real Redis and MySQL (status shape and approximate flag, a namespace cleared with the count reported, protected keys proven untouched, `*`/`search:*`/`cache:*`/`FLUSHALL` and friends all refused, view separated from clear with anonymous refused, the tag clearance proven to write the same `cache.invalidate` event a publication writes, both clearings audited, and "last cleared" recorded). Admin `CacheManagerPage.test.tsx` 4 proves the screen offers no clear-everything control, no free-text field, and explains an unavailable cache rather than only reporting failure.

## Phase 40a — Admin editing moved from dialogs to pages, and the showcase publication rule relaxed (2026-09-08)

Two client instructions, handled together because they touch the same screens.

**Dialogs → pages.** Record editing now happens on its own route rather than in a modal. A dialog constrains a form to a box, hides the record's context behind it, cannot be linked to or reloaded, and traps focus in a scrolling area; a page can be bookmarked, opened in a new tab, read at the width the content needs, and keeps its save bar in view without stealing the screen. `components/ui/RecordEditorPage.tsx` is the one layout every editor uses — breadcrumbs, a back link, the form, an optional context panel, a sticky save bar with the record's version and last edit — so nine screens do not each invent their own.

Converted so far: FAQs, service alerts, testimonials and clients/partners, each with `/new` and `/:id` routes. `permissionsForPath` gained segment-wise matching for `:param` patterns, so an editor route requires the *edit* permission rather than inheriting the list's read permission — without that, an administrator who may only view could open a form the server would refuse to save (RBAC 010). Still to convert: taxonomy terms, editorial terms, redirects, administrators, featured listings, media library, and the moderation decision dialogs.

**Confirmations stay dialogs.** ADM 002 requires confirmation for destructive actions, and CMGR 003, QMON 003, MAIL 009 and ALRT 007 each name one. An interruption is the point of those, so they remain — what went away is *forms* in dialogs, not warnings.

**Publication no longer waits on recorded permission (SRS 1.5).** At the client's instruction, a testimonial no longer requires a recorded approval to publish, and a partner organisation no longer requires a recorded authorisation. Both records remain, optional: recording one still names the administrator and the time, editing a quote or replacing a logo still clears the record it covered, and both stay permission-separated from creating and publishing. What a partner *does* still require is the logo asset and its alternative text, because those are about the strip being renderable and readable rather than about permission (MED 003, NFR 006).

The concern was stated once and the instruction stands: the record was never about who typed the content in, but about evidence that the subject agreed to be quoted or to have their mark shown. That residual risk is legal rather than technical, and is recorded in the SRS change log and in TSTM 002 so it is not rediscovered later as a surprise.

**Verification.** API unit 245, `showcase.integration-spec.ts` 11 rewritten to the new rule (publish without consent recorded; consent still recordable and still cleared by a quote edit, without unpublishing; partner still refused without logo or alternative text). Admin `Showcase.test.tsx` 6 and `permissions.test.ts` 6 (including the new `:param` route cases).

## Phase 40b — Website → Pages, and a custom About page (2026-09-08)

Two client instructions, resolved together because the second depends on the first: the information-page screen was to carry only Privacy Policy, Terms of Use and Review Guidelines, and About was then to become a designed page whose copy stays in the CMS.

**One page set, two templates.** `Contact` is gone from the editable set. `/contact` is still a public route, but its address, phone and postal details come from the general settings (CFG 001), where the API already refuses a non-routable domain — an editable contact page meant a second place to type an address, and the one an editor typed won. `About` stays in the same `static_pages` record as the policy pages (same revisions, same publication gate, same audit) but declares `template: 'about'`, which is what decides that a bespoke public template renders it. No second content source, no schema change; the unused `contact_email` column is left in place for a reviewed drop rather than dropped in passing, and rows for a withdrawn slug are ignored by the registry rather than deleted.

**Admin.** The master-detail "Information pages" screen is gone. Website → Pages lists the known pages with their address, template, readiness and last change; each opens at `/website/pages/:slug`. The editor form, the publish action and the blocker reporting live in one `StaticPageEditor` used by that route, so there is a single implementation rather than a copy per screen. `/pages` redirects to the new address so old links still land.

**About page.** `/about` composes the administrator's title, introduction and SEO fields with material that must not be retyped: live published counts from a new `GET /site/metrics`, the configured contact route, and a description of how listings are created, checked, published and corrected. Eight bands, alternating light and dark, all server-rendered with no client JavaScript of its own. A count that cannot be taken is `null`, not zero, and a section with nothing true to show is omitted entirely — which is why the snapshot disappears rather than displaying dashes when the database is unreachable, and why a genuine zero is not advertised. The page claims no certification, endorsement or guaranteed accuracy, and describes the Melbourne boundary as it is actually enforced, naming D01 as still open.

**Content.** `pnpm --filter api pages:seed` writes shipped baseline copy into an empty About row and publishes it, through the same cache-invalidation pipeline an editor's publish uses. It refuses to run over an existing row, so it can never overwrite what an editor wrote or re-publish what an editor unpublished, and it is held to the same publication gate. The client's approved wording replaces it in the editor. Photography is the two licensed images already shipped for the hero, with their credits; replacing them with the client's own is recorded in `docs/content/hero-photography.md`.

**Verification.** API unit 245, web 103 (10 new About tests, 3 new navigation tests), admin 152 + 5 new page tests; `seo.integration-spec.ts` and `static-pages.integration-spec.ts` extended and green against the real database. Production build clean. Runtime on a preview at 3010 against the running API: `/about` 200 with the About link in both navigations and the footer, `/privacy` 404 while unpublished, `/contact` 200; sitemap index carries `pages.xml` listing `/about` and `/contact`; canonical, Open Graph, breadcrumb and `AboutPage` JSON-LD present; no console errors and no failed requests. Measured at 1440/1024/768/390/320 px: no horizontal overflow anywhere, hero 380 px at 1440 and 402 px at 1024 (inside the 360–440 px target), taller on narrow screens because the same copy wraps rather than because anything is oversized.

**A note on the first instruction.** Taken literally it would have removed About as well; the instruction that followed required About to stay in the CMS. Reading them together, what the client did not want was About and Contact on the *policy* screen — so the policy list holds exactly the three named pages, About has its own editor, and Contact has no editable page at all.

## Phase 35 — Queue monitor (2026-09-08)

QMON 001–005. Two closed registries in `apps/api/src/queues/queue-registry.ts`: the queues an operator may see and act on, and — per job name — the *only* payload fields that may be displayed. The redaction rule is an allowlist rather than a deny-list, because a deny-list has to be updated every time a job gains a field and the cost of forgetting is a token or an address on screen; an allowlist's cost of forgetting is a field not shown until someone adds it deliberately.

Everything is read through BullMQ's own interfaces — counts, paused state, workers, oldest waiting job — so nothing depends on Redis key layout, and worker availability is labelled an estimate because it is a live reading from Redis rather than a guarantee (QMON 005). A job that is not registered shows as work with its details withheld rather than as a payload dump.

Actions are four separate permissions and apply only to an explicit selection of at most 25 jobs, each applied independently with its own outcome, so a job another replica has already taken fails on its own line (QMON 004). Retry is refused for anything not failed; removal for anything running; cleaning is limited to completed or failed metadata at least 24 hours old, so a failure that has just happened cannot be erased. Pausing states its consequence — enquiries stored but not delivered, images unprocessed, pages served from cache — before it is confirmed. There is no route that creates a job, edits a payload or replays arbitrary work, and the integration test asserts that.

**Verification.** `queue-registry.spec.ts` 7 (redaction, unrecognised payloads, bounds), `queue-monitor.integration-spec.ts` 9 against the real Redis (depths, redaction end to end, permission separation, per-item outcomes, bounds, pause/resume audit, no create route), `QueueMonitorPage.test.tsx` 7 (nothing actionable for a viewer, retry disabled until a selection exists, the repeat-effect warning, the unreachable state).

## Phase 36 — Scheduled tasks (2026-09-08)

TASK 001–006. The registry is `packages/domain/src/scheduled-tasks.ts`, shared by the API and the worker so neither can invent a task the other does not know: five tasks, each declaring its schedule, timezone, missed-run policy, timeout, retries, whether it may be run manually, whether it is high impact, whether it may be switched off, and whether two runs may overlap.

**Where things run.** The worker owns the schedules (BullMQ job schedulers derived from the registry's cron) and the implementations; the API shows state, records history and can ask for one registered task to run. A manual run is a queue job, not an inline execution — the integration test asserts that the request returns in milliseconds with no run recorded — so "run now" during a scheduled run meets the same lock rather than racing it. Nothing an administrator sends becomes a schedule, a command or a payload: the only identifier any route accepts is a registry code, and a request body carrying `cron` or `command` is ignored entirely.

**Tasks.** Scheduled article publication (which had a health alert but no runner until now), activity-log retention (ACT 006), email-log retention in two stages — the address removed at 90 days, the record deleted at 180 (MAIL 010) — queue metadata tidying, and retention of this history itself. Every implementation works from "everything older than X" rather than a cursor, so a repeat, a retry or an overlapping manual run converges on the same state.

**Safety.** A distributed Redis lock per task, released only by its holder; a task already running elsewhere is *skipped* and recorded as such rather than queued behind the first, because these are periodic jobs and the next occurrence does the work anyway. A run that exceeds its timeout is stopped and recorded as timed out. Failures are recorded as one line — the test proves a stack trace with file paths does not reach the record. History holds outcomes, durations and counts, never what a task touched, and is itself retained 30 days.

**Enable/disable.** Only `queue.clean-metadata` is optional; publication and the three retention tasks are marked required for correctness and refuse to be switched off, in the API (409 `TASK_REQUIRED`, no row written) and again in the worker's schedule sync. The admin screen shows the disabled switch with the reason rather than a control that would fail.

**Migration.** `20260907205054_scheduled_tasks` adds `scheduled_task_runs` and `scheduled_task_states`; additive only, no destructive statement. `taskCode` is deliberately not a foreign key — the registry lives in code and history must outlive a retired task.

**Verification.** `scheduled-tasks.spec.ts` (worker) 10, `schedules.integration-spec.ts` 9, `ScheduledTasksPage.test.tsx` 5 (including that clicking through a high-impact confirmation without typing the code dispatches nothing). Root: lint clean with zero warnings, typecheck clean, unit suites db 27 / api 252 / admin 169 / web 103 / worker 32.

## Phase 40c — The rest of the dialogs, and one submit path (2026-09-08)

Completing the client's instruction that record editing happen on pages rather than in dialogs, and the code-quality pass they asked for afterwards.

**Converted.** Taxonomy terms (categories, services, local areas — one `TermEditorPage` driven by the same config the list uses), blog categories and tags, SEO redirects, administrators, featured placements and media details. Each has its own route, its own permission entry, and a link from the list rather than a button that opens a box. Two things came out of the conversions rather than into them: `EditorialTermsPage` carried a dead "authors" branch (authors have had their own screen for some phases), and `AdministratorsPage` sent `roleKeys: ['super_admin']` for every invitation — every new administrator was silently a super administrator. The invite screen now asks which roles, requires at least one, and the test proves nothing is sent until one is chosen.

**Still dialogs, deliberately.** Moderation decisions (approve, reject, redact), enquiry handling, and the publish/unpublish confirmations on the business and post editors. Each is a confirmation of a decision about the row in front of you, with a reason recorded — ADM 002, REV 004 and CMGR 003 all require the interruption, and moving them to a page would separate the decision from the thing being decided. What went away was *forms* in dialogs, not warnings.

**One submit path.** Fourteen editors repeated the same six lines: sign out on an expired session, explain a stale version, put field errors on the fields the API named, fall back to one message. Repeated, it had drifted — different wording for the same conflict, and in two screens `if (fields)` on an object that is always truthy, so a plain error silently cleared the form's own messages. `shared/useRecordEditor.ts` now owns validation, the saving flag, the error text and the field mapping; each editor supplies only what to send. `RecordEditorPage` gained the loaded-values fix the taxonomy editor exposed: `initialValues` applies at mount, and a record that arrives later has to be pushed in.

**Consistency.** Every screen now uses `PageHeader` — breadcrumbs, one H1, an explanation, the actions — including the business editor and the administrators and editorial-terms lists, which had grown their own heading blocks.

**Test stability.** The admin suite failed differently on each run once it passed 35 files: interaction-heavy specs missed their own async windows while eight workers competed for the CPU. Two changes, both about the machine rather than the code: `asyncUtilTimeout` raised to 15 s (a query that waits longer still fails, it just is not decided by load), and the pool capped at four threads. 37 files / 175 tests, 77 s, repeatable.

## Phase 41 — Cross-module audit (2026-09-08)

The last item on the roadmap: looking across the modules built over the programme rather than at each in turn, for the things that only go wrong between them.

**What was checked, and with what.** Authorization: `pnpm --filter api authz:verify` plus the default-deny guard and the access-control integration specs, which enumerate the admin surface — every route added this programme (`/admin/system/queues`, `/admin/system/schedules`, `/admin/pages`, `/site/metrics`) declares a registered permission or is explicitly public. Envelopes: every new controller returns `{data}` or `{data, meta}` and every failure the `{error:{code,message,fields,requestId}}` shape, exercised by the 400/403/404/409 assertions in the new integration specs. Activity coverage: `activity-catalogue.spec.ts` reads every audit call site in the source and fails on an undeclared domain — `system.queue.*`, `system.schedule.*` and `settings.page.*` are covered by the `system` and `settings` domains. Cache invalidation: the publication paths and the content seed all write through `CacheService.recordInvalidation` rather than touching Redis. Migrations: `db:migrations:check` clean. Secrets: tracked `*.example` files carry placeholders only; the real `.env` is ignored.

**One finding, fixed.** `MediaService.runRetention` — the MED 004 policy that deletes abandoned uploads and month-unused images — had no caller anywhere. It had been written, tested by nothing, and never run. Now that Phase 36 exists it is a scheduled task (`media.retention`, daily, required for correctness) implemented in the worker where the object storage lives, and the API's uncalled copy is gone with a comment at its former site saying where it went. The retention windows moved to `packages/domain/src/scheduled-tasks.ts` so the policy is declared once. The schedules integration test now asserts that every retention policy the SRS states has a registered task applying it, which is the check that would have caught the original omission.

**One observation, not changed.** `authz:verify` reports the protected role holding 63 permissions against a catalogue of 62: the extra is `system.activity_logs.view`, retired when the activity log was consolidated in Phase 32. It grants nothing — the guard refuses a retired permission, and the CLI confirms zero assignments grant access through one — so the row is untidy rather than unsafe, and removing it means writing to the client's database outside a migration. Left for the next reviewed migration, recorded here so it is not rediscovered as a surprise.

**Gate.** `pnpm check` exit 0: lint with zero warnings, typecheck, unit (database 27, API 252, admin 175, web 103, domain 12, mail 16, worker 33), e2e 19, every build, bundle budget, contracts in sync. `pnpm test:integration` exit 0: 35 files / 275 tests against the real MySQL and Redis.

## Phase 42 — Pages an administrator can add (2026-09-08)

The client asked what happens when they need another CMS page, and whether the screen could have an Add button. It can, and now does.

**What was in the way, and what replaced it.** The slug set was closed in code, which is what guaranteed that nobody could publish an arbitrary top-level URL. That is a guarantee worth keeping, but a fixed list is not the only way to keep it. `pageSlugProblem` now enforces it directly: a strict lower-case pattern, a reserved list, and a uniqueness check at write time. The reserved list matters more than it looks — Next.js resolves a static route before the dynamic page route, so a page slugged `blog` would have been created, published, listed in the footer and then answered by the blog index: a page that exists everywhere except where you look for it. Each refusal returns the sentence an editor can act on rather than "invalid".

**Two kinds of page.** System pages (About and the three policies) stay declared in code, always listed, and cannot be created, renamed or deleted, because the product links to them by address — the review form's acknowledgement points at the review guidelines, About has its own template and navigation item. Everything below them is the administrator's, and carries exactly the same content rules: sanitised rich text, a revision of the previous published text on every edit, the publication gate. No schema change was needed: a custom page is simply a `static_pages` row whose slug the registry does not name.

**Addresses are fixed at creation.** Anything that links to a page links to its address, so renaming quietly breaks other people's links. The create form suggests an address from the title and stops suggesting once the editor types their own; after that the address is the one thing on the page that cannot be edited, and the aside says what to do instead — a new page and a redirect.

**Deleting.** Refused for a system page, and refused while a page is published: unpublishing first turns the resulting 404 into a decision the administrator made rather than one they discover later from a support message. The list disables the button and says "Unpublish it first" rather than offering an action the API would reject. A deletion takes the page's revisions with it and is audited.

**The public side stopped keeping its own list.** `app/(pages)/[slug]` had the three policy slugs hardcoded; it now asks the API, because a list in the web tier would have to be edited every time an editor added a page and would be wrong until it was. The footer and the sitemap already worked from published rows, so a new page appears in both without further code.

**Verification.** Slug validation unit tests including path traversal, uppercase, spaces, double hyphens and every reserved route; five integration cases against the real database (create → draft invisible → publish → served, listed and in the sitemap; reserved and taken addresses; malformed addresses creating nothing; both deletion refusals; delete and stop serving, with the audit trail); admin tests for the Add button, the address suggestion and override, the API's refusal landing on the address field, and the delete affordance; a web test proving the shared template renders a page created after that code was written. `pnpm check` and `pnpm test:integration` green.


## Post-audit remediation — 8 September 2026

The audit found two High defects and fixed them. This pass asked a harder
question: could the same class of failure happen again, and would anyone notice?

**F-01, closed structurally.** The original fix corrected one call site. Job-id
construction is now a single function — `queueJobId()` in
`packages/domain/src/queue.ts` — that strips every character BullMQ refuses,
names `:` explicitly in its failure message, bounds the length and refuses an id
with no usable characters. `assertQueueJobId()` guards the one place jobs are
enqueued, so an invalid id fails at creation rather than at consumption.
`scheduledTaskJobId()` delegates to it. Six integration cases run against real
Redis and BullMQ: every registered task dispatches manually and on recovery,
every job name round-trips, a `:` id is refused with the message naming the
character, a repeated dispatch stays one job holding the first payload, an id
persisted before this change is still reachable, and a real `Worker` retry keeps
the same id and payload.

**F-02, closed structurally.** API and worker now read one list —
`MAIL_TRANSPORTS` in `packages/mail/src/transports.ts` — and both suites iterate
it, so a value one side accepts and the other refuses is a test failure rather
than a production start-up failure. The worker was started under `console`,
`smtp` and `resend`.

**A new defect, found while testing the above.** The Resend transport summarised
the provider's response body into the error it threw. A provider that echoed the
request would have written the API key into a log, an admin screen and a stored
failure reason. The existing assertion passed only because its fixture never
contained the key. `redactCredentials`/`redactSensitive` now strip `re_…`,
`whsec_…`, `Bearer …` and `sk_…` alongside the addresses already redacted.

**Monitoring (MON 001–002).** Provider-neutral `prom-client` exposition on
`/metrics`, deliberately outside `/api/v1` and out of the OpenAPI document,
loopback-only unless `METRICS_TOKEN` is set, answering **404** rather than 401 to
an unauthorised caller. The worker gets the same endpoint plus `/health`, and
only when `WORKER_METRICS_PORT` is set. Each worker replica publishes a heartbeat
to `ms:worker:heartbeat:<instanceId>` every 15 s with a 45 s expiry, carrying
instance id, version, start time, last beat, queues and counters — nothing about
the host and nothing from the environment. `WorkerLivenessService` turns those
into the states an operator actually has to distinguish: Redis unreachable, no
worker ever started, every worker stopped, alive but not finishing work, alive
but the required schedule has stopped. The last one is the F-01 shape, and it is
derived from run history rather than from a socket. It is exposed at
`GET /api/v1/admin/system/queues/workers` behind `system.queues.view` and shown
as the Workers card on the Queue Monitor. Route labels are Nest patterns, never
URLs; no address, body, token, session or visitor-supplied value is a label, and
a test asserts that over the real exposition.

Verified live: a worker started locally, the API reported `ms_worker_heartbeats 1`
with real queue depths, and the gauge went to `0` after the worker stopped.

**Release gate (F-09).** `pnpm test:browser` runs Playwright against production
builds on free ports, creates and drops its own database, provisions a temporary
administrator with a generated password, treats a skipped test as a failure, and
stops only what it started. `pnpm verify:release` chains it after `check` and
`test:integration`. A CI job is prepared and not connected.

**F-05 is still open.** The empty server-rendered 404 body is a Next.js 16
streaming property, not a defect in this code: once a Suspense boundary has
rendered, `notFound()` cannot replace a body that is already going out. Both
documented answers were implemented and tested; the proxy variant worked but put
an API call on every unmatched request, so it was reverted. The application is
unchanged and healthy. The recommendation stands: serve the already-correct
prerendered `_not-found.html` at the reverse proxy.

**Not done, and deliberately so.** No on-call person assigned (client approval,
SRS §23). No CI workflow pushed and no external account connected. No commit.

## Staging closure — 9 September 2026

Scope: finish the evidence a staging hand-over needs. No product features.

* **API restarted on 3001** from the current build (the process was identified by
  its listener, restarted with the same ignored `.env`, no secret printed, no
  other process touched). `/api/v1/health` 200, `/api/v1/health/ready` 200 with
  database and Redis ok; `/metrics` 200 from loopback with 131 series and **404
  from the host's LAN address**; admin on 3002 unaffected.
* **Release gate** run as `pnpm verify:release` — root checks, integration tests
  and the browser suite in one command. Green in **13 min 23 s**: 1,010 unit and
  integration tests, then 52 browser tests with **0 failures, 0 skips, 0 flakes**.
  Three defects the gate itself surfaced were fixed rather than worked around:
  the runner created a database whose name the provisioning guard rightly
  refused (so four authorization journeys failed), the journeys skipped for want
  of published content (now seeded per run), and the run left its Redis database
  behind (now flushed on the way out). A fourth was found while checking the
  machine afterwards: the runner signalled its child but not the process group,
  so the admin and web servers it started kept listening after every run. Servers
  are now started detached and the group is signalled, with a `SIGKILL` fallback;
  verified by a clean run that left no listener and no key behind.
* **Nine failure drills executed.** D5–D9 were run this session against isolated
  infrastructure; they found and closed two real defects (a `/metrics` hang under
  a Redis outage, a sticky oldest-waiting gauge).
* **F-05 closed at the deployment layer.** A reference reverse proxy
  (`infrastructure/edge/`) serves the prerendered not-found document for 404s
  from the web upstream, with the status preserved. Measured through nginx, not a
  development server.
* **Monitoring proven deployable.** Prometheus in a separate container scrapes the
  API and two worker replicas over a bearer token read from a git-ignored file;
  no metrics port is published beyond loopback.
* **Alert coverage validated** against the recorded drill series; three conditions
  (object storage, backup success, restore-drill age) are documented as staging
  tasks because nothing emits them yet. **No on-call person assigned** — that
  needs the client's approval (D07).

## Admin interface redesign — 10 September 2026

Scope: the admin application's appearance, structure and wording. No change to
authentication, authorization, validation, concurrency or audit behaviour.

* **Inventory first** (`docs/audits/admin-ui-inventory.md`): every route
  classified, its problems recorded, and where it has been verified.
* **Tokens and shared components**: one theme file; `SettingsSection`,
  `ErrorState`, `PermissionDenied`, `DangerZone` and `RecordMetadata` added to
  the existing set, with contract tests.
* **Security settings rebuilt as the reference screen**, and the copy fixed at
  its source — the server's settings registry, which now declares units and
  plain-language limits and keeps its internal justification internal.
* **Dashboard** gained real worker liveness, scheduler state and queue links,
  permission-filtered, with no invented numbers.
* **Ten defects found by running the interface**, all fixed, listed in the
  inventory — including an accessibility failure (an icon-only link with no name
  on a phone), a contrast failure in empty tables, and two layouts that scrolled
  sideways on a phone.
* **Evidence**: axe over one screen of each page family and the overflow rule at
  six widths, in `e2e/specs/admin-ui.spec.ts`, inside the release gate.

## Operational safety, record editors and the route sweep — 10–12 September 2026

Scope, in the order the client set it: make media processing safe to operate,
then featured listings, redirects, the administrator access editor, the service
alert preview, and a sweep of every admin route. No commit, no push.

* **The worker is a required, separately supervised process.** Uploads stayed in
  "processing" because no worker was running, and nothing said so.
  `apps/worker/README.md` and `docs/operations/runbook.md` now state the
  requirement (restart always, liveness from the heartbeat, graceful shutdown,
  alerts C4/W3/W5), and the media library reads worker liveness and says
  definitively when processing has stopped instead of waiting quietly.
* **Featured placements**: `PATCH` now runs the overlap check `POST` runs, from
  one shared function. The check was also read-then-write, so simultaneous
  requests could each pass it; it now runs inside the write transaction behind a
  lock on the listing's row. The integration test sends six overlapping requests
  at once and requires exactly one to be stored. Without the lock, all six were
  accepted.
* **Redirects** (client decision): a temporary 302 kind and an on/off state,
  full stack. One function, `redirectEffect`, decides the outcome for both the
  public resolver and the new admin preview, so they cannot disagree. An inactive
  rule answers 404 publicly. Both caches in front of the resolver dropped to
  10 seconds, and a 302 is sent `no-store`. The enum member was appended last,
  so the migration is an instant alter rather than a table rewrite.
* **Administrator access editor**: each permission's source by role name, a
  direct grant that duplicates a role flagged, grants the acting administrator
  does not hold withheld (as is the Super Admin role, for anyone who is not
  one), and every change named, with the sign-out it causes, before it is
  confirmed. The server's invariants are unchanged.
* **Service alerts**: the severity table (colours, tone, role, politeness) and
  the link validator moved to `@melbourne-sphere/domain`, read by the API, the
  public banner and a new admin preview; parity tests on both sides pin them to
  the one table. Two defects fixed with it: the editor scheduled alerts in the
  browser's timezone rather than Melbourne's, and the service re-derived a link's
  externality with its own heuristic.
* **A data-loss defect in media usage** (client-approved fix, larger than
  reported). Testimonials, partners, the site logo/icon/sharing image and home
  hero slides were not counted as uses, so those images could be deleted from
  the library — and **the worker's retention task would have deleted them
  automatically 30 days after upload**. One shared definition
  (`packages/domain/src/media-usage.ts`) now drives the library's refusal, its
  "unused" filter and the retention task.
* **The route sweep** (`e2e/scripts/route-sweep.ts`) opened all 72 routes at
  1440 and 320 px and as a moderation-only administrator. The first run found 21
  routes with a finding; all are fixed. The largest was structural: every editor
  with a side column collapsed its form to nothing below 992 px. The full list
  is in `docs/audits/admin-ui-inventory.md`.
* **Outstanding, named:** a preview of the placed listing on the featured
  editor, a preview of the home hero on `/settings`, and a manual screen-reader
  pass.
* **Evidence (12 September 2026):** `pnpm verify:release` exit 0 — lint with no
  warnings; unit: database 27, API 274, admin 220, web 111, domain 35, mail 37,
  worker 46; API e2e 19; builds; bundle entry 700 kB within budget; contracts in
  sync; integration: database 5, API 299; browser 64 with none skipped or flaky.
  Route sweep: 72 routes, 0 findings.
* **Not production-ready.** Still outstanding: worker supervision in a real
  environment, staging itself, a production-shaped backup/restore verification,
  and the client launch decisions in `docs/launch/client-decisions.md`.

## Sign-in, themes, password reuse and helper text — 12 September 2026

Client requests in this session, in order. No commit, no push.

* **Sign-in redesigned** on a lit navy ground with the form on a frosted-glass
  card, shared by all five signed-out screens. Native placeholders on every
  field. Failures are answered by kind — wrong details (without saying which
  half), too many attempts (the server's wait counted down on the button),
  throttle unavailable, network down — and a server field error lands on its
  field. Caps Lock is flagged while typing.
* **A production-safety defect fixed on the way:** Refine's login hook opened
  its own error toast for every unsuccessful sign-in, and for the two-step
  marker that toast printed the challenge token on screen. That one toast key
  is now dropped; the screen reports failures in place.
* **After a reset or setup link, the reader is sent straight to sign in** with a
  notice. Only notices defined in `auth/sign-in-notice.ts` are shown, so text
  placed in navigation state cannot reach the screen. The reset and setup
  screens now share one `NewPasswordForm` instead of two diverging copies.
* **Password reuse.** The current password could be "changed" to itself
  whenever history depth was zero (the old default), because the depth check
  returned first. The current password is now always refused, on change and on
  reset, and the default depth is **3** earlier passwords (client instruction;
  SRS SECS 003 sets no default). The setting's label and summary say exactly
  that. Integration tests cover change, reset, and depth zero.
* **Light and dark themes**, light by default, chosen per browser. One palette
  pair in `config/theme.ts` feeds both Ant Design and the CSS variables every
  inline style reads; ~25 hard-coded colours moved onto tokens. Gradients —
  page ground, navigation, cards, titles, stat icons, one brand gradient on all
  primary buttons — in both themes. Contrast is tested for both palettes, which
  caught a pre-existing failure: the light theme's subtle text was 4.4:1 on the
  page ground (now 4.8:1). The browser suite runs axe in dark as well; that
  caught links inside alerts told apart by colour only (now underlined).
* **Reloading the dashboard in development** showed Vite's "did you mean
  /admin/?" page, because the router writes `/admin`. A small Vite plugin now
  301s `/admin` → `/admin/` on the dev and preview servers, as nginx already does
  in production.
* **Helper text cut down**: 60 descriptions and hints rewritten to one line; two
  were also wrong (the partner and testimonial editors still claimed a recorded
  approval was required, which SRS 1.5 removed). `src/copy-length.test.ts` now
  enforces the limits.
* **Email log.** The log was correct — it held the one message sent today (a
  password reset). Enquiry emails are sent and logged by the worker, and none is
  running, so nothing appears for them. The log and the media library now share
  one `WorkerStoppedAlert` that says so instead of showing an empty list.
* **Branded HTML email** (client request). Every transactional message —
  password reset, account setup, business enquiry — is now rendered by one
  layout (`packages/domain/src/email-layout.ts`) as HTML and plain text from
  the same content: navy header and brand gradient with solid fallbacks for
  clients that drop gradients, a bulletproof button with a copy-and-paste link,
  a hidden preview line, dark-mode overrides, every value escaped and links
  limited to http(s) (SRS ENQ 005 allows HTML provided visitor content is
  escaped and a text body is sent — both hold). Two defects fixed with it: the
  reset email promised "30 minutes" whatever the security setting said (it now
  states the real lifetime), and the invitation and its resend were two
  different messages (now one builder). The worker's copy of the enquiry-mail
  types was replaced by the domain's.
* **A test that restored its fixture by reusing a password** (`admins`
  integration) now asserts the refusal and restores the fixture by clearing its
  history directly.
* **Seven pages lost their heading when their data failed to load** (site and
  general settings, website pages, the permission catalogue, and the author,
  administrator and article editors): they returned only an error block, with
  no h1. They now share `PageLoadError` — the page's own header and
  breadcrumbs, then the error with a retry. This was also why an access-control
  test was flaky: it watched the catalogue heading appear, and the page's
  unanswered request then replaced it. That test now answers its requests.


## 12 September 2026 — Demonstration listings, richer business and taxonomy records

* **Twenty fictional Melbourne listings** seeded into development databases by
  `apps/api/scripts/seed-businesses.ts`, with services, hours, addresses,
  contact routes, social links, four attribution-licensed photographs each and
  approved reviews; the three existing listings were filled in the same way.
  Content and licensing rules: `docs/content/business-demonstration-listings.md`.
* **Four additive, reviewed migrations**, each approved by the client before it
  was written (SRS §74): `businesses.establishedYear` ("n years in business");
  image and search-appearance fields on `categories` and on `local_areas`;
  `services.icon`. No existing row changed.
* **Public business page:** photographs open at full size from a sliding
  gallery; every service carries a pictogram — an editor's choice from the
  shared icon library in `@melbourne-sphere/domain/service-icons`, or a
  name-based match until one is made; "n years in business" in the header.
* **Categories and local areas** can carry an image (home-page tile and landing
  header) and their own SEO title, description, keywords and share image; the
  home page's category band is titled "Browse businesses by category".
* **SRS conflict surfaced and resolved:** a request to rename local areas to
  "Cities" was declined by the client once the Melbourne-only scope rule
  (SCP 001–005, UX 003) was pointed out; local areas keep their name.


## 12 September 2026 — Public blog: editorial presentation and media handling

Client request: the blog index, category archive and article page read as
functional but sparse, with very large navy blocks where article pictures
should be. Frontend only — no schema change, no business-rule change, no change
to moderation or editorial workflow.

* **The oversized navy blocks had three causes, all now closed.** (1) A cover
  reaches the public API only once the worker has processed it —
  `BlogPublicService.renditions()` publishes nothing for an asset that is not
  `ready` — so with no worker running every cover arrives as an empty array and
  every card takes its no-picture branch. (2) `gridColumns(1)` returned
  `grid-cols-1`, so a single article's card spanned the whole 1520 px content
  width and its 16:10 frame became an ~880 px-tall panel; `articleColumns()`
  now never collapses a row below half width, and a one-article collection is
  given the lead layout instead of a stretched grid card. (3) `next/image` had
  no failure path, so a rendition that 404s left the frame's `bg-navy-900`
  showing with nothing on it — indistinguishable from having no cover, and
  undiagnosable. Measured after the change: the tallest media block on a
  one-article archive is 352 px at 1440 px, and an article hero 567 px.
* **`components/article-media.tsx`** is the one place an article picture is
  drawn: reserved aspect ratio before load, `card` (800 px) or `hero` (1600 px)
  rendition chosen by the layout it sits in, lazy by default and eager only for
  a genuine LCP image, and one restrained fallback — the brand mark on a
  category-derived gradient (`editorialGradient`) — for both ways a picture can
  be absent. A load failure swaps in that fallback *and* writes the failing URL
  to the console, so a broken media origin stays diagnosable while a reader
  never sees a broken-image glyph or an error.
* **One canonical card.** `post-card.tsx` now carries both the `standard` and
  `featured` layouts (`featured-post-card.tsx` is gone), with `showCategory`
  off on an archive, where the term is already the page heading. The fallback
  panel carries no words for the same reason.
* **One fixed four-column grid,** at client instruction: `cardGridColumns`
  (1 / sm 2 / lg 3 / xl 4) is used by the blog index, the blog category and tag
  archives and the business search results, and does **not** narrow to the
  number of cards. A collection therefore keeps its shape as it fills up, and a
  lone card is a quarter of the row rather than the full section width — which
  is the other half of the fix above, since a full-width card is what turned a
  missing cover into an 850px-tall panel. The count-dependent `gridColumns` is
  unchanged and still used by the home-page bands and the related-articles row,
  where the section is narrower and a row of three is the maximum that fits.
* **Reading width.** New `--ms-content-read` (46 rem) and `.ms-container-read`;
  the article's breadcrumb, title, standfirst, byline, body, author and
  comments all share one 736 px column while the hero runs wider at 1008 px.
  `.ms-prose-article` sets the long-form scale (17–18 px, 1.78, H2 clamped to
  1.6–2.05 rem) and switches off the per-element 68ch cap, which had left
  paragraphs at one measure while the headings beside them ran to the full
  column.
* **Article flow** is now body → tags → author → related → comments; related
  articles previously sat below the comments. **The hero caption prints the
  photographer credit only.** It previously printed `coverAlt` as visible body
  copy, which put an editor's own name under the photograph as if it were a
  caption; alternative text is the description announced in place of a picture,
  the data model has no caption field, and none was invented.
* **Category navigation** (`blog-category-nav.tsx`) on the index and the
  category archives: "All stories" plus the stocked categories from the API,
  `aria-current` on the active chip so the state is not colour alone, and a
  row that scrolls sideways on a phone rather than wrapping into four lines.
* **Comments** gained the states the brief asks for: field messages that say
  what to do, errors tied to their controls and focused on failure, distinct
  copy for rate limiting, a closed service, a validation failure, a server
  fault and an unreachable network (`submissionFailureMessage`), "Posting…"
  with repeat submission refused, guidelines and privacy notice linked
  separately once each is published, and a success message that says the
  comment is awaiting review. The API's own message is no longer shown.
  Nothing about validation, the honeypot, the captcha, the acknowledgement or
  moderation changed.
* **Defect found and fixed during verification:** a `loading.tsx` added to the
  category and tag archives made those routes stream, so `notFound()` could no
  longer set the status and an unknown category answered **200** instead of 404
  (SRS SEO 001). Both files were removed; only `/blog`, which never 404s, keeps
  its skeleton. The repository already knew this hazard — `/business` uses a
  route group for the same reason.
* **The three editorial headers were reworked again at client instruction**
  ("I do not like this hero section"). `.ms-editorial-band` (in
  `apps/web/src/app/globals.css`) gives the blog index, the collection headers
  and the article header one treatment: a single sky light source in the upper
  right over a band that deepens downward, a fine dot texture masked to fade
  before the content ends, and a lit hairline where the band meets the page.
  All of it is decoration behind `-z-10`, so nothing can sit over text, and the
  strongest layer still leaves white at about 9.5:1 and band-muted at about
  5.9:1. The rhythm was tightened as well: the kind of page and its size now
  share one line above the heading (`BLOG CATEGORY • 3 articles`,
  `MELBOURNE SPHERE • 8 stories`) instead of being stacked blocks that made the
  band twice as tall as its content needed, and the article's category badge is
  a sky-outlined chip with the standfirst set a step larger.
* **The category page's repeated name is gone.** An editor's landing content
  reasonably opens by typing the category name, which the H1 has just said, so
  the archive read "City guides / City guides / Our guides.".
  `lib/landing-content.ts` drops an opening heading when its text matches the
  title — a presentation decision only: the stored content is untouched, a
  heading that says anything else is left where the editor put it, and the
  helper only ever removes, so it cannot introduce markup.
  **Note for the client:** the copy itself ("Our guides.") is admin-controlled
  and still thin; a fuller category description is worth writing in the admin.
* **Verified**: `pnpm --filter web test` (184 passed, 30 files), typecheck,
  lint, production `next build`; and the real pages driven in Chromium at
  375/430/768/1024/1280/1440 px against a stub API (this container has no
  MySQL, Redis or object storage), covering an article with a cover, without
  one, with a cover that 404s, a long headline, the business search results,
  and archives holding one, two, three and seven articles: 54 page/width
  combinations with no horizontal overflow, one `h1` per page, no heading-level
  skips, zero axe violations (WCAG 2.2 A/AA) and no unexpected failed
  requests. Route statuses confirmed: unknown article and unknown
  category 404, empty category 200.

No SRS business-rule change was introduced.
