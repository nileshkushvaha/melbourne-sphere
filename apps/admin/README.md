# Melbourne Sphere Admin (`apps/admin`)

Independent admin frontend: React 19, TypeScript 6, Vite 8, Refine 5, Ant Design 5, React Router 7. Served under **`/admin/`** and talking to the NestJS API through same-origin **`/api/v1`** paths (SRS ARC 004, ARC 005).

> **Access control** is enforced by the API: every request under `/api/v1/admin` needs the `ms_admin_session` cookie (HttpOnly) and a permission (SRS AUTH 002, RBAC 001). The app mirrors that with Refine's `<Authenticated>` around the shell and an auth provider that asks `GET /admin/auth/me`; nothing about the session is stored in web storage. `/admin` is `noindex`. Public exposure still awaits the remaining hardening phases (TLS, web-tier security headers, monitoring).

## Runtime contract

| Item | Value |
| --- | --- |
| Dev server | `http://127.0.0.1:3002/admin/` (strict port) |
| Vite `base` | `/admin/` |
| Router basename | `/admin` (derived from `import.meta.env.BASE_URL`) |
| API root in the browser | `/api/v1` (relative, same origin) |
| Dev/preview proxy | `/api/v1` → `ADMIN_API_PROXY_TARGET` (default `http://127.0.0.1:3001`), configured server-side in `vite.config.ts` only |
| Production | the reverse proxy serves `/` (web), `/admin/` (these static assets) and `/api/v1` (API); no proxy code ships in the bundle |

Direct navigation and refresh at any `/admin/...` URL work (Vite dev SPA fallback; production hosts must fall back to `/admin/index.html`).

## Commands (repository root)

| Command | Purpose |
| --- | --- |
| `pnpm dev:admin` | dev server on 3002 (needs `pnpm dev:api` for API status) |
| `pnpm build:admin` | production build to `apps/admin/dist` |
| `pnpm --filter admin preview` | serve the production build on 3002 with the same proxy |
| `pnpm lint:admin` / `pnpm typecheck:admin` / `pnpm test:admin` | ESLint 10, `tsc` (app + node configs), Vitest + Testing Library (jsdom) |

The aggregate `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm check` include the admin app.

## Structure

```
src/
  main.tsx              bootstrap (StrictMode, global styles)
  app/                  App (BrowserRouter), AppProviders (theme → antd App → ErrorBoundary → Refine), routes
  config/               app-config (public constants), theme (Ant Design tokens)
  api/                  errors (ApiError, envelope parsing), http-client (typed fetch), health, data-provider (Refine)
  layouts/AdminShell    header, collapsible sider / mobile drawer, skip link, landmarks
  pages/                DashboardPage, NotFoundPage, admins/, account/, taxonomy/, businesses/
  components/           ApiStatus, ErrorBoundary, Brand
  shared/               useDocumentTitle, usePrefersReducedMotion
  styles/global.css     focus ring, skip link, reduced motion
  test/                 Vitest setup (matchMedia/ResizeObserver stubs), render helper, fetch fakes
```

Screens (Phase 10): `pages/admins/AdministratorsPage` (paginated list, search/status filters via URL params, create dialog), `pages/admins/AdminDetailPage` (edit with `expectedVersion`, disable/enable with confirmation, setup-link resend, session revocation), `pages/account/AccountSecurityPage` (change password, sessions, TOTP enrol with `qrcode.react` QR + manual key, recovery codes shown once, disable), `pages/AuditLogPage`, `pages/AcceptSetupPage`; the login page gains the TOTP step (202 challenge → code). Navigation entries are hidden without the matching permission, purely as a courtesy.

Listings (Phase 12): `businesses` is the first entry in `<Refine resources>`; `pages/businesses/BusinessesPage` reads through the data provider (`useList` with the documented sort/filter contract) and `pages/businesses/BusinessEditorPage` loads with `useOne` and mutates through the typed `src/api/businesses.ts` client (create, PATCH with `expectedVersion`, publish/unpublish/archive/restore). Dialog-driven state changes carry an optional reason and, when the API answers `DUPLICATE_SUSPECTED`, a required override reason; `PUBLICATION_BLOCKED` reasons come from `fields.publication`. A 401 during a mutation is passed to Refine's `useOnError`, so the auth provider redirects to sign in. Phase 13 adds `pages/businesses/HoursEditor` (weekly schedule and date exceptions saved through `PUT …/hours` with the business version; native `type="time"`/`type="date"` inputs; the API's `24:00` is shown as `00:00` + "closes next day") and link rows (kind, URL, label) on the editor; nested envelope field paths are mapped with `toNamePath` in `src/api/businesses.ts`.

Auth (Phase 9): `src/auth/auth-provider.ts` (Refine auth provider on the cookie session: login/logout/check/onError/getIdentity/getPermissions), `src/api/auth.ts` (typed calls using `@melbourne-sphere/contracts`), pages `LoginPage`, `ForgotPasswordPage`, `ResetPasswordPage` (public routes), the shell shows the signed-in admin and a Sign out button. Extension points: `resources={[]}` on `<Refine>` (register a resource when its API contract exists), `NAV_ITEMS` in `AdminShell`, `dataProvider` per-resource sorting/filtering via `LIST_CONTRACTS` (resources without an entry are refused with `ApiContractError` rather than guessed).

## API transport (`src/api`)

- `createHttpClient().request(path, options)`: relative `/api/v1` URLs, JSON in/out, empty-body handling (204 → `undefined`), `Accept`/`Content-Type` headers, `AbortSignal`, per-request timeout (15 s default), `credentials: 'same-origin'`. No auth headers, tokens or storage.
- Failures become `ApiError` with `kind` (`validation | unauthorized | forbidden | not_found | conflict | payload_too_large | rate_limited | server | unavailable | network | timeout | aborted | unexpected`), `status`, `code`, `fields`, `requestId` (from the `x-request-id` header, else the envelope), `retryAfterSeconds`, a user-safe `userMessage` and a `reference` for support. Non-JSON or malformed error bodies are classified by status and never retained.
- `dataProvider` maps Refine calls to `/api/v1/admin/<resource>` with the SRS envelopes (`{data}` / `{data, meta}`), `page`/`pageSize` pagination and REST verbs (`GET/POST/PATCH/DELETE`). Sorting and filtering are per-resource contracts (`LIST_CONTRACTS`; `businesses` maps a single sorter to `sort`/`order` and `eq`/`contains` filters to `q`, `status`, `categoryId`, `localAreaId`) and throw `ApiContractError` otherwise. Nothing is faked.

## Shell and accessibility

Skip link to `#main-content`; `banner`/`navigation`/`main`/`contentinfo` landmarks; one `h1` per page; document title `"<page> · Melbourne Sphere Admin"`; visible focus ring (amber-700, ≥ 3:1 on navy and white, with a white halo); 44 px menu items and 40 px controls; drawer navigation under the `lg` breakpoint with `aria-expanded`/`aria-controls`, Escape to close and focus restored to the toggle; `prefers-reduced-motion` disables Ant Design motion and CSS transitions. Theme tokens live in `src/config/theme.ts`; contrast pairs are asserted by `theme.test.ts`.

The dashboard's **API status** card calls `GET /api/v1/health` once on load and again only on "Check again"; it shows loading / reachable (with request ID) / unavailable (safe message + reference; a dev-proxy 502 when the API is down becomes a generic server message). It does not poll.

## Environment

`apps/admin/.env.example` documents the only variable, `ADMIN_API_PROXY_TARGET`, read server-side by `vite.config.ts` and validated to be a bare http(s) origin. No `VITE_*` variables exist; nothing secret is needed or allowed in this app.

## Known limitations

- Single JS chunk (~1.1 MB raw / ~350 kB gzip, mostly Ant Design + Refine). Code-splitting and the bundle budget are scheduled after the first vertical slice (SRS NFR 013).
- Only `businesses` is a Refine resource; the Administrators, Audit log, Account security and taxonomy screens call the typed clients directly with the `{data, meta}` envelope. Migrating them is optional polish, not a functional gap.
- `eslint-plugin-jsx-a11y` is not enabled because its latest release does not support ESLint 10; accessibility is covered by tests and manual checks until it does.
