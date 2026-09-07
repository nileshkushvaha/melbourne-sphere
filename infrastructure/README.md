# Local infrastructure (MySQL + Redis)

Docker Compose definition for the local development database and Redis. Nothing here is used in production; production uses managed/private services per the SRS (ARC 004, OPS 003).

## Prerequisites

- Docker CLI and Docker Compose v2 (verified: Docker 29.7.2, Compose 5.4.0).
- A running Docker daemon. On this machine Docker is provided by **Colima**; start it with `colima start` (the `colima` Docker context is already selected). Docker Desktop, OrbStack or Rancher Desktop work equally well.
- Apple Silicon: both images are multi-arch (arm64 + amd64); no emulation needed.

## Files

| File | Tracked | Purpose |
| --- | --- | --- |
| `docker-compose.yml` | yes | services, volumes, network, health checks |
| `mysql-init/10-shadow-database.sh` | yes | first-start-only: creates `<MYSQL_DATABASE>_shadow` (Prisma Migrate shadow database) and `<name>_test` (integration tests) and grants the app user on those two only |
| `.env.example` | yes | placeholder template |
| `.env` | **no** (git-ignored, mode 600) | real local credentials; create by copying the example and replacing every placeholder |

## What runs

| Service | Image | Container | Host port (loopback only) | Volume |
| --- | --- | --- | --- | --- |
| MySQL | `mysql:8.4.11` (8.4 LTS) | `melbourne-sphere-mysql` | `127.0.0.1:3307` (`MYSQL_HOST_PORT`) | `melbourne-sphere_mysql-data` |
| Redis | `redis:8.4.6` | `melbourne-sphere-redis` | `127.0.0.1:6379` (`REDIS_HOST_PORT`) | `melbourne-sphere_redis-data` |

- Compose project name: `melbourne-sphere`; internal network `melbourne-sphere_local`.
- MySQL runs with `utf8mb4` / `utf8mb4_unicode_ci` server defaults (project collation policy, see `packages/database/README.md`), creates `MYSQL_DATABASE` and a non-root `MYSQL_USER` with privileges on that database only. Root is restricted to `localhost` inside the container.
- Redis runs with AUTH (`REDIS_PASSWORD`), AOF persistence (`appendfsync everysec`) plus RDB snapshots, and `maxmemory-policy noeviction` as BullMQ requires. One instance serves both cache and queue locally; separating them in production is a later decision (SRS CACHE 003).
- Host port 3307 is the default for MySQL because a Homebrew MySQL already listens on 3306 on the original development machine. Change `MYSQL_HOST_PORT` in `.env` if 3307 is taken; nothing else needs editing.

## Commands (run from the repository root)

| Command | Effect |
| --- | --- |
| `pnpm infra:validate` | validates the Compose file and `.env` without printing resolved values |
| `pnpm infra:up` | starts both services in the background and waits for their health checks |
| `pnpm infra:status` | shows containers, health and published ports |
| `pnpm infra:logs` | follows the last 100 log lines of both services |
| `pnpm infra:down` | stops and removes the containers and network. **Volumes (data) are kept.** |

Restarting with `pnpm infra:down && pnpm infra:up` preserves all data.

## Browsing the database (Adminer)

1. `pnpm infra:up`
2. Open http://127.0.0.1:8082
3. Log in: System **MySQL**, Server **mysql** (prefilled; this is the container's name on the internal network, not 127.0.0.1), Username **the `MYSQL_USER` from `.env`**, Password **the `MYSQL_PASSWORD` from `.env`**, Database **the `MYSQL_DATABASE` from `.env`**.

Adminer is a development convenience only; it is never deployed.

## Connecting

- MySQL: host `127.0.0.1`, port `3307`, database/user/password from `.env`. Example: `mysql -h 127.0.0.1 -P 3307 -u <MYSQL_USER> -p`.
- Redis: `redis-cli -h 127.0.0.1 -p 6379` then `AUTH <REDIS_PASSWORD>` (or set `REDISCLI_AUTH`).
- From inside the Compose network (future containerised API/worker) use hostnames `mysql:3306` and `redis:6379`.

## Important: first-start-only initialisation

The `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER` and `MYSQL_PASSWORD` variables are consumed by the MySQL image **only when the data volume is empty**. Editing them in `.env` later does not alter existing accounts. To change a password on an existing volume, do it in MySQL (`ALTER USER ...`) and then update `.env` to match.

## Shadow and test databases

`prisma migrate dev` needs a scratch database and the integration tests need an isolated one. `mysql-init/10-shadow-database.sh` runs automatically on a **fresh** volume and creates `<MYSQL_DATABASE>_shadow` and `<name>_test` (e.g. `melbourne_sphere_test`) with `GRANT ALL PRIVILEGES ON <that db>.*` to the application user; no global privileges are granted and the app user still cannot create other databases. For a volume initialised before this script existed, apply the same statements once as root (values come from `.env`, never type them inline):

```bash
set -a; . ./infrastructure/.env; set +a
docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env \
  exec -T -e MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql mysql -uroot -e \
  "CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE}_shadow\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE DATABASE IF NOT EXISTS \`${MYSQL_DATABASE%_dev}_test\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}_shadow\`.* TO '${MYSQL_USER}'@'%'; GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE%_dev}_test\`.* TO '${MYSQL_USER}'@'%'; FLUSH PRIVILEGES;"
```

This was done on 2026-09-06 for the existing local volume (shadow in Phase 6, test database and the collation defaults in Phase 8).

## Destructive operations (never part of routine setup)

Deleting data is a separate, deliberate action. None of the `infra:*` scripts do it.

- `docker compose -f infrastructure/docker-compose.yml --env-file infrastructure/.env down --volumes` removes the containers **and both data volumes**; the next `infra:up` starts from an empty database and re-runs MySQL initialisation from `.env`.
- Do not run `docker system prune` on a machine with other projects' containers/volumes unless you have checked what it will remove.

## Troubleshooting

- `Cannot connect to the Docker daemon` → start Colima/Docker Desktop first.
- `Bind for 127.0.0.1:3307 failed: port is already allocated` → change `MYSQL_HOST_PORT` (or `REDIS_HOST_PORT`) in `.env`.
- MySQL unhealthy for >60 s on first start → check `pnpm infra:logs`; first initialisation on a slow disk can exceed the start period, Compose keeps retrying.
- `Access denied` for the app user after changing `.env` → see the first-start-only note above.
