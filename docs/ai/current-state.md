# Current state (AI handoff) — updated 2026-09-07 (all phases complete; home page redesigned; launch gates with the client)

Overwrite this file at every phase gate; keep it factual and short. History lives in `docs/setup-progress.md` (and `docs/history/`), requirement status in `docs/traceability.md`.

## Phase
- **Active:** post-implementation. Every planned phase (1–27) is complete, including the UAT journeys, the NFR 003 capacity run and a rehearsed restore drill. The remaining work is the launch-gate list in `docs/pre-audit-report.md` §4 — mostly client decisions, plus a manual screen-reader pass and a production-shaped restore drill.
- **Last completed:** Phase 27 — contact page and form, blog and listing-detail redesign, published rating distribution, 2026-09-07 (Phase 26 was the home page redesign).
- **Client feedback in force:** the interface must read as a premium, industry-standard product. The home page has been fully recomposed (Phase 26) on a light-first token system with deliberate dark bands; the admin shell and editorial screens were reworked earlier. The home page, information pages, blog (index, article, category, tag), directory list/category/area and listing detail have all been recomposed on the same system. The admin screens are the remaining visual surface if further polish is asked for. Reuse `packages/ui/src/styles.css` tokens, `components/page-shell.tsx` (`Band`, `SectionHeading`, `gridColumns`), `components/collection-header.tsx`, `components/information-page.tsx` and the card patterns rather than inventing new ones.
- **Public theme decision:** the public site is light-first with designed dark bands and **no OS dark scheme**. `apps/web/src/lib/palette.test.ts` fails if a `prefers-color-scheme` block reappears in the public tokens; changing that is a deliberate design decision, not a token edit.

## Implementation status
- **apps/api:** operations signals (`/admin/operations/status`), read cache with publication-namespaced keys and transactional purge events, information pages, featured placements, health/readiness, config validation, site settings (`site_settings`, public `/home`), search suggestions with a public rate ceiling, reviews and abuse reports, enquiries with a transactional outbox and dispatcher, the blog (editorial core, public reads and comments) with Markdown sanitisation and scheduled publishing, the media pipeline (signed uploads, validation, usage records, retention), all public POSTs idempotent and rate-limited behind Turnstile and honeypots, auth (Argon2id, opaque cookie sessions, CSRF origin guard, Redis throttling, optional TOTP, reset/setup tokens), admins lifecycle, audit, taxonomy (categories 2-level, services+synonyms, local areas), directory (listings, publication gates, duplicates, hours, links, public search/detail, and the approved-review `ratingBreakdown` on listing detail). OpenAPI at `/api/v1/openapi.json` when `OPENAPI_ENABLED=true`.
- **apps/admin:** grouped-navigation shell (Overview/Directory/Editorial/Community/Configuration) with an account menu, shared design-system primitives in `src/components/ui/*` (PageHeader, SectionCard, StatCard, StatusTag, EmptyState, StickyActions), a real dashboard (`GET /admin/dashboard`), login/TOTP, administrators, account security, audit log, taxonomy screens, Businesses list/editor (hours editor, links, gallery), Reviews, Comments, Abuse reports and Enquiries queues, Media library, Articles (TipTap rich-text editor, cover picker, SEO snippet, slug change with redirect), Authors (list + full profile editor), Blog categories/tags, Site settings, SEO redirects, information pages and featured listings. Heavy screens and the editor are code-split (entry 755 kB; `pnpm budget` enforces the cap). axe-core checks run over representative screens.
- **apps/web:** public shell (full-width navy header with a native `<details>` mobile menu, structured dark footer, skip link), a fully recomposed home page (photographic hero → light categories → soft listings → dark Melbourne areas → light stories → dark CTA, each band loading independently with populated/empty/failure states), `/directory` (route group `(list)`), `/directory/category|area/[slug]`, `/business/[slug]`, blog (index, category, tag, article with byline, author card and comments), not-found and error boundaries, hero with rotating phrases and suggestion combobox, approved reviews, review and enquiry forms; hero banner slider with admin-managed photography and licensed CC BY defaults (`lib/hero-assets.ts`, `public/hero/`, `docs/content/hero-photography.md`), category-derived branded card fallbacks (`lib/category-visuals.ts`), information pages at `/{slug}` and a `/contact` route that always resolves (published copy, else a factual explanation plus the contact form posting to `POST /api/v1/contact`), `robots.txt`, `/sitemap.xml` + `/sitemaps/[section]`, JSON-LD (`lib/structured-data.ts`), redirect `middleware.ts` (301/410), `POST /api/revalidate` purge endpoint, shared `.ms-prose` editorial styling; server-only API client with explicit revalidate/tags. Policy pages (about, privacy, terms, review guidelines) await approved copy and stay unlinked until published.
- **apps/worker:** BullMQ consumer for `cache.invalidate` (web-tier purge with retries), `enquiry.email` (mailer port, console transport only — no provider adapter, D03) and `media.process` (sharp variants, EXIF stripped).
- **packages/database:** 19 migrations (last `static_pages_and_featured`), applied to dev and test DBs. New since Phase 20: `redirects`, author profile columns + `author_links`, `posts.bodyFormat`. **packages/contracts:** generated from the API. **packages/ui:** tokens + primitives. **packages/domain:** enquiry mail composition and queue policy shared by the API and worker.

## Versions (selected, pinned in lockfile)
Node 24.19.0 · pnpm 12.3.4 · Next 16.3.4 · React 19.2.8 · TypeScript 6.0.3 (api, admin, database) / 5.9.3 (contracts, ui) / ^5 (web, forced by eslint-config-next) · NestJS 12.0.1 · @nestjs/swagger 12.0.1 · Prisma 7.10.0 + @prisma/adapter-mariadb 7.10.0 · ioredis 5.11.1 · @node-rs/argon2 2.2.0 · otpauth 9.5.2 · Vitest 4.1.11 · Vite 8.2.2 · Refine core 5.0.12 / antd 6.0.3 / react-router 2.0.4 · antd 5.29.3 · react-router 7.18.3 · Tailwind 4.3.3 · openapi-typescript 7.13.0 · class-variance-authority 0.7.1 · tailwind-merge 3.6.0 · @radix-ui/react-slot 1.3.3 · lucide-react 1.41.0 · MySQL 8.4.11 · Redis 8.4.6 · Adminer 5.5.1.

## Dependency decisions (do not re-research unless adding/upgrading/broken)
| Dependency | Decision | Why / constraint | Reconsider when |
| --- | --- | --- | --- |
| Prisma 7.10 (not 8 RC) | hold on 7 | 8 is pre-release; adapter-mariadb pairs with 7 | Prisma 8 GA |
| ioredis 5 (not 6) | hold | BullMQ/Nest ecosystem peers target 5 | BullMQ declares ioredis 6 support |
| antd 5 + react-router 7 | required by Refine 5 peers | `@refinedev/antd` 6 peers antd 5; `@refinedev/react-router` 2 peers react-router 7 | Refine publishes antd 6 support |
| `@ant-design/v5-patch-for-react-19` | required | antd 5 + React 19 compatibility | antd 6 |
| ESLint 9 in apps/web (EOL) | blocked upstream | `eslint-config-next` 16 plugin peers do not accept ESLint 10 | eslint-config-next supports ESLint 10 |
| TypeScript 5.9 in contracts/ui | pinned | openapi-typescript 7 peer range; web build uses TS 5 | openapi-typescript supports TS 6 |
| `@scarf/scarf` build script | disabled in `pnpm-workspace.yaml` | install-time telemetry | never |
| Node Temporal | not available in Node 24 | hours use an Intl-based converter (`directory/hours/melbourne-time.ts`) | Temporal ships unflagged |
| Search | MySQL LIKE with rank CASE (no FULLTEXT) | DIR 003 allows indexed prefix + bounded fallback; ≤10k listings | search quality complaints or NFR 003 load results |
| sharp 0.35.4 + @aws-sdk/client-s3 3.1127 + file-type 22 | image processing and S3 | re-encoding strips EXIF; the S3 client works against MinIO and providers alike | provider chosen (D03) |
| MinIO RELEASE.2025-09-07 | local S3 on ports 9010/9011 | 9000 is taken by php-fpm on this machine | production uses the real provider |
| marked 18 + sanitize-html 2.17 | both authoring paths | SEC 001 requires an allowlist; Markdown (legacy) and editor HTML pass the same allowlist server-side | — |
| TipTap 3.31.3 (`@tiptap/react`, `pm`, `starter-kit`, `extension-image`, `extension-table`) | admin rich-text editor | ProseMirror-based, React 19 peer support; output is sanitised server-side, so the editor is never the security boundary; lazy-loaded into its own chunk | TipTap 4 |
| Instrument Serif (next/font) | display headings only | one static weight, self-hosted at build time alongside Geist; falls back to Georgia | a brand typeface is supplied |
| BullMQ 6.3.4 | current major | pairs with ioredis 5; queue policy lives in `packages/domain` | BullMQ 7 |
| Turnstile | one real verifier, no dev bypass | a bypass would void SEC 002/003; without the secret, public writes answer 503 | client supplies keys (D03) |

## Ports and service ownership
- 3000 web (`pnpm dev:web`; not running). Interactive web checks must use `next build && next start` (dev-mode hydration is blocked in the sandboxed browser pane because its HMR socket cannot connect). 3001 API and 3002 admin: **dev servers started for the client's own browser testing — leave them running unless asked**. 3307 MySQL, 6380 Redis, 8082 Adminer, 9010/9011 MinIO (Compose, running). 3306 Homebrew MySQL: off-limits.
- After a schema or permission change, run `pnpm --filter api admin:seed-rbac` so new permission rows exist (it is idempotent); `redirects.manage` was added this way.
- Dev admin account: `dev.admin@melbournesphere.local`; its password lives only in the session scratchpad (`bootstrap.env`) and was rotated after each browser login. Reset-link flow: POST `forgot-password`, read the link from the API process stdout (`MAIL_TRANSPORT=console`) — only possible for an API instance you started (e.g. `PORT=3011 node apps/api/dist/main`).
- Dev data: published listings `runtime-check-cafe`, `carlton-corner-bakery`, `docklands-mobile-mechanics`; seeded taxonomy (`pnpm --filter api taxonomy:seed`).

## Security posture (implemented)
Argon2id passwords; opaque sessions (`ms_admin_session`, HttpOnly, SameSite=Strict, Path=/api/v1/admin, 30 min idle/12 h absolute); CSRF Origin guard; login/reset throttling (fail-safe 503); default-deny permissions guard; audit log; AES-256-GCM field encryption (`FIELD_ENCRYPTION_KEY`) for TOTP secrets and private enquiry emails; helmet strict CSP on the API; 64 KB body cap; env validation refuses insecure production values. Not yet: Turnstile/public form limits (16), retention jobs, web-tier TLS/CSP/headers (23–24).

## Database and migrations
Compose MySQL: databases `melbourne_sphere_dev`, `<dev>_shadow`, `melbourne_sphere_test` (integration harness truncates `APPLICATION_TABLES` in `apps/api/test/integration/harness.ts` — add new tables there). Policy: `utf8mb4_unicode_ci`, plural snake_case `@@map`, `scripts/check-migrations.mjs`. All 8 migrations applied to dev; test DB gets `migrate deploy` in the integration global setup.

## Known issues / deferred
- Admin bundle: main chunk 973 kB (298 kB gzip) after route/editor code splitting; antd + Refine dominate the remainder (NFR 013 review in Phase 23).
- Public `/directory` streams (loading boundary), so an API failure there renders the error boundary with HTTP 200; curated and detail pages return real 404s.
- Cross-date overlap between a custom exception's overnight interval and the next day is not validated.
- "Open now" filter disabled (DIR 008) pending data review after Phase 14.
- No approved public contact address: `SITE_CONTACT_EMAIL` is a `.local` development value, so `contactChannel()` withholds it and the header's "Add a business" action points at the homepage explanation (`#business-listing`). Set a routable address and the mailto returns everywhere with no code change.
- About and the policy pages are not published, so they are absent from the navigation and footer by design (no link ever points at a 404); the review form still links to `/review-guidelines`, which 404s until that page exists. `/contact` always resolves and carries the contact form, but stays `noindex` until an editor publishes the approved copy.
- Public submissions (reviews, comments, business enquiries and the site contact form) are closed locally on purpose: no `TURNSTILE_SECRET_KEY` (API) or `TURNSTILE_SITE_KEY` (web) is configured, so the API answers 503 and the forms show a closed notice. Client keys are decision D03. For a runtime check, start a private API instance with Cloudflare's published test key and `PUBLIC_SITE_URL=https://example.com` (the hostname check rejects mismatches).
- No email provider adapter exists: the worker's console transport is development-only and it refuses to start in production. Webhook ingestion (ENQ 006) waits for the same decision.
- Admin specs render the page under test (not the whole route tree) except the nav-visibility tests; with `--maxWorkers=2` the suite is stable at about 36 s. Run single files while developing and the full check only at a phase gate.
- Transient integration flake once observed (Redis ping in readiness) — passes on rerun.

## Immediate next actions
1. Manual screen-reader pass (the rest of the accessibility acceptance is automated: keyboard order, skip link, landmarks, headings and 320 px layout).
2. Run the Playwright journeys against staging once it exists (`E2E_WEB_URL`, `E2E_API_URL`, `E2E_ADMIN_URL`, and `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` for the authenticated flows), and assemble the QA 003 evidence pack.
3. Production-shaped restore drill; the backup account needs `RELOAD`/`BINLOG ADMIN` so the binlog position is recorded (BACK 001 RPO).
4. Everything else outstanding is a client decision listed in `docs/pre-audit-report.md` §4.

## Verification tooling added in Phase 25
- `e2e/` — Playwright journeys (`pnpm --filter @melbourne-sphere/e2e test`); needs the stack running, skips authenticated flows without credentials.
- `tools/load/` — `seed-load-data.mjs` (fills an isolated `*_load` database with the NFR 003 volume) and `run-load.mjs` (`--api` for the API mix, `--duration 1800` for the full acceptance run).
- `infrastructure/backup/` — backup and restore-drill scripts; they use `age` or `gpg`, whichever is installed.

## Files most relevant now
`packages/ui/src/styles.css` (all public tokens: colour, type, widths, spacing, radii, shadows, focus, motion), `apps/web/src/app/globals.css` (`.font-display`, `.ms-card-lift`, `.ms-prose`), `apps/web/src/components/page-shell.tsx` (`Band`/`SectionHeading`/`gridColumns`), `apps/web/src/app/**` and `apps/web/src/components/**` (public UI), `apps/admin/src/components/ui/*` (design-system primitives — reuse, do not re-invent per screen), `apps/admin/src/config/theme.ts`, `apps/admin/src/layouts/AdminShell.tsx`.

## Last successful validation (2026-09-07, Phase 27 gate)
`pnpm check` green: database 23, API 153, admin 99, web 64, domain 12, worker 16, e2e 19, all builds, bundle budget (entry 751 kB, total 2.16 MB), contracts regenerated and in sync. `pnpm test:integration` green: database 5, API 116. Playwright: 34 journeys at desktop and 320 px (4 admin journeys skipped without credentials), including the axe-core WCAG 2.2 AA scan of `/`, `/directory`, `/blog`, `/contact` and a listing page — zero violations. Browser review of the home, contact, blog index, article, directory, category, area and listing pages at 1440/1280/390 px with no horizontal overflow. Phase 25 results still stand: the 30-minute NFR 003 capacity profile at 89,850 requests, 0 errors, p50 53 ms, p95 200 ms, p99 244 ms; the restore drill rehearsed and recorded. Trackable-file secret scan clean; env files ignored.
