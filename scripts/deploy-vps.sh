#!/usr/bin/env bash
# Run as deploy on the existing Ubuntu VPS. Optional argument: branch or commit.
set -Eeuo pipefail
umask 027
ROOT=/srv/melbourne-sphere
REF=${1:-master}
[[ $# -le 1 && "$REF" != -* ]] || { echo 'Usage: bash deploy-vps.sh [branch-or-commit]' >&2; exit 2; }
[[ $(id -un) == deploy ]] || { echo 'Run as deploy, not root.' >&2; exit 1; }
for tool in git flock curl sudo gzip; do command -v "$tool" >/dev/null; done
exec 9>"$ROOT/.deploy.lock"
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
[[ -L "$ROOT/current" ]] || { echo 'Expected current to be a release symlink.' >&2; exit 1; }
PREVIOUS=$(readlink -f "$ROOT/current")
[[ "$PREVIOUS" == "$ROOT/releases/"* && -d "$PREVIOUS" ]]
for env in api web worker; do test -r "$ROOT/shared/$env.env"; done
sudo -v
sudo nginx -t
for service in ms-api ms-worker ms-web; do sudo systemctl is-active --quiet "$service"; done

git --git-dir="$ROOT/repo.git" fetch origin
SHA=$(git --git-dir="$ROOT/repo.git" rev-parse --verify "$REF^{commit}")
# Always build in a fresh directory, including when retrying the same commit.
DIR=$(mktemp -d "$ROOT/releases/${SHA:0:12}-XXXXXXXX")
rmdir "$DIR"
git --git-dir="$ROOT/repo.git" worktree add --detach "$DIR" "$SHA"
cd "$DIR"
export NVM_DIR=/home/deploy/.nvm
set +u
. "$NVM_DIR/nvm.sh"
nvm use
set -u
EXPECTED_PNPM=$(node -p 'require("./package.json").packageManager.replace(/^pnpm@/, "")')
[[ $(pnpm --version) == "$EXPECTED_PNPM" ]] || { echo "Install pnpm@$EXPECTED_PNPM for this Node version first." >&2; exit 1; }

api_command() (
  set -a
  . "$ROOT/shared/api.env"
  set +a
  # The application driver uses sslca/sslmode; Prisma CLI uses sslcert/sslaccept.
  # Translate only this subprocess, leaving the shared application URL intact.
  DATABASE_URL=$(node --input-type=module - "$ROOT/shared/mysql-ca.pem" <<'NODE'
import { accessSync, constants } from 'node:fs';
try {
  const url = new URL(process.env.DATABASE_URL);
  const ca = url.searchParams.get('sslca') || url.searchParams.get('sslcert') || process.argv[2];
  accessSync(ca, constants.R_OK);
  url.searchParams.set('sslcert', ca);
  url.searchParams.set('sslaccept', 'strict');
  process.stdout.write(url.toString());
} catch {
  console.error('Cannot prepare Prisma TLS URL. Check DATABASE_URL and the readable MySQL CA file.');
  process.exit(1);
}
NODE
  )
  export DATABASE_URL
  "$@"
)

printf '\nBuilding release %s; current website remains running.\n' "$SHA"
pnpm install --frozen-lockfile
api_command pnpm db:build
pnpm domain:build
pnpm mail:build
pnpm db:migrations:check
# Stop before switching if migrations are pending, failed, or TLS is invalid.
# Schema changes require a separately reviewed migration/backup plan.
api_command pnpm db:migrate:status
pnpm --filter api build
pnpm --filter worker build
(
  set -a
  if [[ -r "$ROOT/shared/admin.env" ]]; then . "$ROOT/shared/admin.env"; fi
  set +a
  pnpm --filter admin build
)
(
  set -a
  . "$ROOT/shared/web.env"
  set +a
  : "${MEDIA_PUBLIC_BASE_URL:?Missing media public URL in web.env}"
  pnpm --filter web build
)
printf '%s\n' "$SHA" > "$DIR/REVISION"
# Only the static admin output needs group read; shared secrets stay untouched.
chgrp www-data "$DIR" "$DIR/apps" "$DIR/apps/admin"
chmod g+rx "$DIR" "$DIR/apps" "$DIR/apps/admin"
chgrp -R www-data "$DIR/apps/admin/dist"
find "$DIR/apps/admin/dist" -type d -exec chmod 750 {} +
find "$DIR/apps/admin/dist" -type f -exec chmod 640 {} +
sudo -u www-data test -r "$DIR/apps/admin/dist/index.html"

sudo -v
BACKUP="$ROOT/backups/before-deploy-$(date +%Y%m%d%H%M%S).sql.gz"
(
  umask 077
  cd "$ROOT/services"
  sudo docker compose --env-file .env exec -T mysql sh -eu -c '
    MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --user="$MYSQL_USER" \
      --single-transaction --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"
  ' | gzip > "$BACKUP"
)
gzip -t "$BACKUP"

wait_url() {
  local url=$1
  for ((attempt=0; attempt<30; attempt++)); do
    if curl --connect-timeout 2 --max-time 5 -fsS -o /dev/null "$url"; then return 0; fi
    sleep 2
  done
  return 1
}
switch_link() {
  ln -s "$1" "$ROOT/.current-deploy-$$"
  mv -Tf "$ROOT/.current-deploy-$$" "$ROOT/current"
}
restart_apps() {
  sudo systemctl restart ms-api
  wait_url http://127.0.0.1:3001/api/v1/health/ready
  sudo systemctl restart ms-worker
  wait_url http://127.0.0.1:9464/health
  sudo systemctl restart ms-web
  wait_url http://127.0.0.1:3000/robots.txt
  wait_url http://127.0.0.1:3000/
  for service in ms-api ms-worker ms-web; do sudo systemctl is-active --quiet "$service"; done
}
rollback() {
  trap - ERR INT TERM
  set +e
  echo 'Deployment failed after switching; restoring previous release.' >&2
  switch_link "$PREVIOUS"
  # Use a fresh strict subprocess so a failed recovery cannot report success.
  ( set -e; restart_apps )
  if [[ $? == 0 ]]; then
    echo "Previous release restored: $PREVIOUS" >&2
  else
    echo 'Recovery needs attention. Check systemctl status ms-api ms-worker ms-web.' >&2
  fi
  exit 1
}
printf '%s\n' "$PREVIOUS" > "$ROOT/previous-release"
trap rollback ERR INT TERM
switch_link "$DIR"
restart_apps
# Verify this VPS directly, even when Cloudflare proxies the public hostname.
for path in / /admin/ /api/v1/health/ready; do
  curl --resolve melbournesphere.com:443:127.0.0.1 \
    --connect-timeout 3 --max-time 15 -fsS -o /dev/null "https://melbournesphere.com$path"
done
trap - ERR INT TERM
printf '\nDeployment successful: %s\nPrevious release: %s\nDatabase backup: %s\n' "$SHA" "$PREVIOUS" "$BACKUP"
