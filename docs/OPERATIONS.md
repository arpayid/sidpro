# SIDPRO Operations

Target awal: VPS dan Docker Compose.

## Release baseline

Checkpoint staging & client deployment baseline:

| Tag | Commit | Notes |
|-----|--------|-------|
| `mvp-staging-ops-v1.3` | latest | Finalized `/opt/sidpro` deploy + DB & MinIO backup |
| `mvp-staging-ops-v1.2` | `cbdb8d7` | Systemd + staging DB backup cron docs |
| `mvp-stabilization-v1.1` | `f1f5b4e` | Staging reliability hardening (seed env, MinIO auto-bucket) |
| `mvp-stabilization-v1` | `b845269` | MVP + Enterprise UI |

**Client deployment baseline:** `mvp-staging-ops-v1.2` — systemd services + daily DB backup via `scripts/staging-backup-cron.sh`.

**Current staging baseline:** `mvp-staging-ops-v1.3` — deploy path `/opt/sidpro`, systemd, DB + MinIO/uploads backup.

- **Staging guide:** [`docs/STAGING_DEPLOY.md`](./STAGING_DEPLOY.md)
- **Systemd templates:** `scripts/systemd/sidpro-api.service.example`, `scripts/systemd/sidpro-web.service.example`

## Staging directory layout

| Path | Purpose |
|------|---------|
| `/opt/sidpro` | Application root (git clone, build, systemd WorkingDirectory) |
| `/etc/sidpro/sidpro.env` | Environment file (`chmod 600`, outside repo) |
| `/var/backups/sidpro` | Database + object storage backups |
| `/var/log/sidpro-backup.log` | Backup cron log |
| `/var/log/sidpro/` | Optional additional app logs |

## Service utama

- **web** — Next.js admin + portal (`:3000`)
- **api** — NestJS REST API (`:4000`)
- **worker** — background jobs (placeholder)
- **postgres** — PostgreSQL 17 (Docker Compose)
- **redis** — cache / queue (Docker Compose)
- **minio** — object storage (Docker Compose)
- **reverse proxy** — Nginx (placeholder until domain ready)

### MinIO public URL (download PDF)

Presigned URL dari API default memakai endpoint internal (`MINIO_ENDPOINT:MINIO_PORT`). Untuk browser client di luar host Docker/VPS, set:

```bash
MINIO_PUBLIC_URL=https://files.example.com   # tanpa trailing slash
```

Jika tidak diset, API tetap mengembalikan URL internal (cocok untuk development lokal).

`docker-compose.yml` hanya menjalankan infra. API dan web via **systemd** di VPS staging (`/opt/sidpro`).

## Development commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma:validate
```

## Staging deploy (ringkas)

Lihat [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md).

```bash
git checkout mvp-staging-ops-v1.3   # atau main
cd /opt/sidpro
cp .env.example .env                  # lalu copy ke /etc/sidpro/sidpro.env
docker compose up -d postgres redis minio
pnpm prisma:generate
pnpm prisma migrate deploy
SEED_ADMIN_PASSWORD='<strong-password>' pnpm prisma:seed
pnpm build
sudo systemctl restart sidpro-api sidpro-web
./scripts/healthcheck.sh
STAGING_ADMIN_PASSWORD='...' ./scripts/smoke-test.sh
```

**Credential staging wajib non-default:** `JWT_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_*`, `SEED_ADMIN_PASSWORD`.

## Systemd (staging/production VPS)

Environment file: `/etc/sidpro/sidpro.env` (mode `600`, di luar repo).

```bash
sudo systemctl status sidpro-api sidpro-web
sudo systemctl restart sidpro-api sidpro-web
sudo journalctl -u sidpro-api -f
sudo journalctl -u sidpro-web -f
```

Detail instalasi: [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md#systemd-deployment).

## Release pipeline

1. Pull code / checkout tag di `/opt/sidpro`
2. Verifikasi `/etc/sidpro/sidpro.env` (tanpa secret di repo)
3. `pnpm install`
4. Validasi: lint, typecheck, test, build, `prisma validate`
5. `prisma migrate deploy`
6. `sudo systemctl restart sidpro-api sidpro-web`
7. Healthcheck + smoke test

## Backup

### Development (local / Docker Compose)

```bash
# Requires DATABASE_URL in .env (loaded by shell or docker compose)
export DATABASE_URL="postgresql://sidpro:sidpro@localhost:5432/sidpro"
export BACKUP_DIR="./backups"
pnpm backup
# or: ./scripts/backup-db.sh
```

Output: `backups/db_YYYYMMDD_HHMMSS.sql.gz` (+ optional `uploads_*.tar.gz` if `UPLOAD_DIR` exists).

Restore (dev only — guarded):

```bash
export DATABASE_URL="postgresql://sidpro:sidpro@localhost:5432/sidpro"
RESTORE_CONFIRM=YES ./scripts/restore-db.sh ./backups/db_YYYYMMDD_HHMMSS.sql.gz
```

`restore-db.sh` refuses to run when `NODE_ENV=production`. Use `scripts/restore.sh` for interactive staging restore.

### Staging VPS

Staging VPS:

```bash
/opt/sidpro/scripts/staging-backup-cron.sh   # manual: DB + MinIO/uploads
cat /etc/cron.d/sidpro-backup
ls -la /var/backups/sidpro/
tail /var/log/sidpro-backup.log
```

Output: `db_*.sql.gz` + `uploads_*.tar.gz` di `/var/backups/sidpro/`.

Cron expression: `0 2 * * *` (daily 02:00 UTC).

Restore singkat — lihat [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md#backup).

## Rollback

1. `git checkout <previous-tag>` di `/opt/sidpro`
2. `pnpm install && pnpm build`
3. `pnpm prisma migrate deploy` — review catatan migrasi
4. Restore DB/uploads bila perlu (lihat STAGING_DEPLOY)
5. `sudo systemctl restart sidpro-api sidpro-web`
6. `./scripts/healthcheck.sh`

## Monitoring & security

- Health: `GET /api/v1/health`, web `GET /`
- Audit log viewer (admin): `/admin/audit-logs` — requires `audit.read`; default filter last 7 days
- Smoke test: `STAGING_ADMIN_PASSWORD=... ./scripts/smoke-test.sh` (or `pnpm smoke`) — set `SMOKE_RUN_SEED=0` to skip seed; optional `SMOKE_TEST_USER_PASSWORD` for RBAC user; **re-login required** after `prisma:seed` or permission changes (JWT does not auto-refresh permissions)

### Local development smoke test

Prerequisites: PostgreSQL/Redis/MinIO running (`docker compose up -d`), API on `:4000`, web on `:3000`.

```bash
# 1. Seed admin (once, or after permission changes)
SEED_ADMIN_PASSWORD='your-dev-password' pnpm prisma:seed

# 2. Build & run API (must match latest code — stale build fails preflight)
pnpm --filter @sidpro/api build
node apps/api/dist/main.js &

# 3. Build & run web (for admin redirect check)
pnpm --filter @sidpro/web build
cd apps/web && PORT=3000 pnpm start &

# 4. Run smoke (dev fallback uses SEED_ADMIN_PASSWORD when STAGING unset)
SMOKE_RUN_SEED=0 SEED_ADMIN_PASSWORD='your-dev-password' pnpm smoke
```

**Stale API detection:** smoke test exits early if `PATCH /complaints/:id/status` returns 404 (rebuild API).

**API-only mode:** `SMOKE_SKIP_WEB=1` skips the admin redirect check when web is not running.
- Monitoring: [`docs/MONITORING.md`](./MONITORING.md)
- Security: [`docs/SECURITY.md`](./SECURITY.md), [`docs/SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md)
