# Dependency advisory disposition

Every advisory `pnpm audit` reports for this repository, with what it means here.
Reviewed 7 September 2026 as part of the authorization audit closure. Rerun with
`pnpm audit` and update the table when it changes; do not silence an advisory
with an override to make the report green.

Reading the "used?" column: an advisory only matters if the vulnerable code runs
in a path this product actually takes.

| Package | Installed | Path | Severity | Vulnerable path used? | Fixed in | Upgrade impact | Mitigation now | Production action | Revisit when |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `mariadb` | 3.4.5 | `packages/database > @prisma/adapter-mariadb > mariadb` | High | **Yes** — this is the driver every database query uses. The advisory is an auth-plugin downgrade that can expose the account password to an attacker **on the network path** during the handshake | ≥ 3.4.7 | Not reachable: `@prisma/adapter-mariadb@7.10.0` pins `mariadb` to exactly `3.4.5`, and 7.10.0 is the latest release. Only a `pnpm.overrides` entry could change it, which would run the adapter against a driver Prisma has not tested | The attack needs an active attacker between the API and MySQL. Since this closure, **production refuses to start without verified TLS** (`?sslmode=verify-ca` or `verify-identity`), which removes that position. Locally the connection is loopback | Verified TLS to MySQL (enforced by configuration validation) and a private network segment | Prisma publishes an adapter that pins `mariadb ≥ 3.4.7`; then update and drop this row |
| `mysql2` | 3.15.3 | `packages/database > @prisma/client > prisma > mysql2` | High | **No** — `prisma` is a devDependency (migrations and generation). The application connects through the mariadb adapter; `mysql2` is not loaded at run time | ≥ 3.22.0 | Pinned by the Prisma CLI; the fix arrives with Prisma 8, which also changes the adapter contract | Development and CI only; those connections are loopback or a private CI network | None — it does not ship | Prisma 8 GA (already the pending upgrade decision) |
| `path-to-regexp` | 8.2.0 | `apps/admin > @refinedev/antd > @ant-design/pro-layout > path-to-regexp` | High | **No** — the admin uses `@refinedev/react-router`; `pro-layout` is pulled in as a peer of the antd package but its route matcher is not used by any screen. 8.4.2 is also installed and is what the app resolves | ≥ 8.4.0 | Requires Refine to update `pro-layout`; forcing it would replace a version its own code was built against | Denial of service against a *route matcher we do not call*, in an interface that already requires an authenticated session | None | Refine ships an updated `@refinedev/antd`; re-check at the Refine 6 upgrade |
| `deepmerge-ts` | 7.1.5 | `packages/database > @prisma/client > prisma > @prisma/config` | High | **No** — Prisma CLI configuration parsing at development time | ≥ 8.0.0 | Major version, owned by Prisma | Not in the runtime path | None | Prisma 8 GA |
| `uuid` | 8.3.2 | `tools/load > autocannon > hyperid > uuid` | Moderate | **No** — the load-test harness only, never deployed | ≥ 11.1.1 | Owned by `autocannon` | Development tool | None | `autocannon` updates `hyperid` |

Nothing in `@casl/ability` 7.0.1 or the `@ucast/*` packages it depends on has an
advisory; they are the only dependencies added for authorization.

## Database transport security

The `mariadb` advisory above is the reason production now refuses an unprotected
database connection. What the code does:

- `DATABASE_URL` carries the mode: `?sslmode=disabled` (the default when the
  parameter is absent), `required`, `verify-ca` or `verify-identity`. An
  unrecognised value is a startup error rather than a silent downgrade.
- `verify-ca` and `verify-identity` verify the server certificate — against the
  PEM named by `?sslca=` when one is given, otherwise the system trust store.
  The mariadb connector treats an `ssl` object as verifying unless
  `rejectUnauthorized` is explicitly `false`, which only `required` sets.
- **`NODE_ENV=production` refuses to start** unless the mode verifies
  (`apps/api/src/config/env.validation.ts`), and separately refuses
  `DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL=true`. Both rules are covered by
  `env.validation.spec.ts`; the URL parsing and driver mapping by `url.spec.ts`.
- `DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL` exists only because MySQL 8's
  `caching_sha2_password` needs an RSA exchange on an unencrypted connection. It
  is a development convenience for loopback and can never be true in production.

### Production database URL

```
DATABASE_URL=mysql://app_user:<password>@db.internal:3306/melbourne_sphere?sslmode=verify-identity
# or, with a private certificate authority:
DATABASE_URL=mysql://app_user:<password>@db.internal:3306/melbourne_sphere?sslmode=verify-ca&sslca=%2Fetc%2Fssl%2Fcerts%2Fmysql-ca.pem
```

`sslca` is a percent-encoded absolute path readable by the API process. Use
`verify-identity` when the certificate's subject matches the host you connect to
(the managed-database default); use `verify-ca` with an explicit authority when
connecting through a private name that the certificate does not carry.
