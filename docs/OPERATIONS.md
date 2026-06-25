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
- **Systemd templates:** `scripts/systemd/sidpro-api.service.example`, `scripts/systemd/sidpro-web.service.example`, `scripts/systemd/sidpro-worker.service.example`

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
- **worker** — BullMQ background jobs (email notifications, PDF placeholder)
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
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
./scripts/healthcheck.sh
STAGING_ADMIN_PASSWORD='...' ./scripts/smoke-test.sh
```

**Credential staging wajib non-default:** `JWT_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_*`, `SEED_ADMIN_PASSWORD`.

## Systemd (staging/production VPS)

Environment file: `/etc/sidpro/sidpro.env` (mode `600`, di luar repo).

```bash
sudo systemctl status sidpro-api sidpro-web sidpro-worker
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
sudo journalctl -u sidpro-api -f
sudo journalctl -u sidpro-web -f
sudo journalctl -u sidpro-worker -f
```

### Background worker (email notifications)

Complaint status emails are queued via BullMQ (`REDIS_URL` required). The API enqueues jobs; **worker must be running** to deliver them.

| Env | Purpose |
|-----|---------|
| `REDIS_URL` | BullMQ connection (API + worker) |
| `SMTP_HOST` | Optional — use SMTP adapter; default is console log |
| `APP_URL` | Tracking link in email body |

Local dev:

```bash
docker compose up -d redis
pnpm --filter @sidpro/worker build
pnpm --filter @sidpro/worker dev
```

Staging: enable `sidpro-worker.service` from `scripts/systemd/sidpro-worker.service.example` after `pnpm build`.

Detail instalasi: [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md#systemd-deployment).

### Web process anti-OOM (Next.js)

Next.js production dapat memakai memori tinggi pada VPS kecil. Mitigasi:

| Langkah | Contoh |
|---------|--------|
| `NODE_OPTIONS` | `NODE_OPTIONS=--max-old-space-size=512` di `/etc/sidpro/sidpro.env` |
| systemd `MemoryMax` | `MemoryMax=768M` di unit `sidpro-web.service` |
| `Restart=on-failure` | Restart otomatis bila proses crash/OOM-killed |
| Monitor | `journalctl -u sidpro-web` — cari `JavaScript heap out of memory` |

Template systemd: `scripts/systemd/sidpro-web.service.example` — tambahkan `Environment=NODE_OPTIONS=--max-old-space-size=512` bila RAM VPS ≤ 2 GB.

PM2 alternatif (non-systemd):

```bash
pm2 start pnpm --name sidpro-web -- start --filter @sidpro/web --max-memory-restart 600M
```

## Release pipeline

1. Pull code / checkout tag di `/opt/sidpro`
2. Verifikasi `/etc/sidpro/sidpro.env` (tanpa secret di repo)
3. `pnpm install`
4. Validasi: lint, typecheck, test, build, `prisma validate`
5. `prisma migrate deploy`
6. `sudo systemctl restart sidpro-api sidpro-web sidpro-worker`
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

Output: `backups/db_YYYYMMDD_HHMMSS.sql.gz` + `db_*.sql.gz.sha256` (+ optional `uploads_*.tar.gz` if `UPLOAD_DIR` exists).

Verify backup integrity:

```bash
sha256sum -c backups/db_YYYYMMDD_HHMMSS.sql.gz.sha256
```

Restore (dev only — guarded):

```bash
export DATABASE_URL="postgresql://sidpro:sidpro@localhost:5432/sidpro"
RESTORE_CONFIRM=YES ./scripts/restore-db.sh ./backups/db_YYYYMMDD_HHMMSS.sql.gz
```

`restore-db.sh` uses `psql -v ON_ERROR_STOP=1 --single-transaction` and refuses to run when `NODE_ENV=production`. Use `scripts/restore.sh` for interactive staging restore.

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

## Production Hardening Defaults

The first production-readiness tranche enforces safer runtime defaults before SIDPRO is used with real citizen data:

- `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, and `MINIO_BUCKET` are required when `NODE_ENV=production`.
- Production startup rejects known demo/default values such as `change-me`, `sidpro_secret`, and short JWT secrets.
- Swagger is disabled in production unless `ENABLE_SWAGGER=true` is explicitly configured. If enabled for staging/internal use, protect it with authentication, IP allowlisting, or reverse-proxy rules.
- Public portal demo fallback is disabled in production unless `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=true` is explicitly configured. Production API failures should surface empty/error states instead of demo village content.
- The worker no longer marks PDF jobs as completed while the real PDF queue processor is not wired. Keep `ENABLE_PDF_WORKER=false` until the worker is connected to a production PDF generator and persistence flow.

Recommended production values:

```bash
NODE_ENV=production
ENABLE_SWAGGER=false
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false
ENABLE_PDF_WORKER=false
JWT_SECRET=<long-random-secret-at-least-32-chars>
```

## Docker Production Deployment

SIDPRO menyediakan deployment container production untuk stack lengkap: `nginx`, `web`, `api`, `worker`, `postgres`, `redis`, dan `minio`.

### File utama

- `apps/api/Dockerfile` — build dan runtime NestJS API.
- `apps/web/Dockerfile` — build dan runtime Next.js web.
- `apps/worker/Dockerfile` — build dan runtime worker BullMQ.
- `docker-compose.prod.yml` — orkestrasi production container.
- `docker/nginx/default.conf` — reverse proxy untuk `/` ke web dan `/api` ke API.
- `.env.production.example` — template env production tanpa secret nyata.
- `.env.staging.example` — template staging untuk dry-run.

### Validasi compose production

```bash
cp .env.production.example .env
# Edit semua placeholder dan gunakan secret kuat sebelum menjalankan stack.
docker compose -f docker-compose.prod.yml config
```

### Build dan start production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Healthcheck container wajib hijau sebelum smoke test:

```bash
docker compose -f docker-compose.prod.yml ps
```

### Smoke test staging setelah deploy

```bash
STAGING_ADMIN_EMAIL=admin@desa.example.id \
STAGING_ADMIN_PASSWORD='<strong-password>' \
SMOKE_RUN_SEED=0 \
pnpm smoke
```

> Jangan menjalankan seed default atau password demo di production. Seed staging/production hanya boleh memakai `SEED_ADMIN_PASSWORD` kuat dan sementara.

## Follow-up Hardening TODO

Daftar ini menerjemahkan 13 tugas lanjutan menjadi backlog teknis yang bisa dikerjakan bertahap:

1. **Docker production** — selesai untuk baseline compose, healthcheck, dan nginx; berikutnya tambah TLS termination atau integrasikan reverse proxy eksternal.
2. **Dockerfile app** — selesai untuk API, Web, Worker; berikutnya optimasi image size dengan deploy/prune jika diperlukan.
3. **PDF worker nyata** — masih blocked; desain payload job dan persist output MinIO sebelum `ENABLE_PDF_WORKER=true`.
4. **CI container validation** — CI memvalidasi compose production dan build image; berikutnya smoke test container end-to-end.
5. **Env strategy** — template development/staging/production tersedia; operator wajib mengganti semua placeholder.
6. **Rate limit public endpoint** — audit semua `@Public()` controller dan tetapkan limit per endpoint berat/ringan.
7. **Refresh token rotation** — tambahkan test login/refresh/logout/reuse detection.
8. **Admin guard audit** — review semua `*.controller.ts` agar endpoint admin memiliki auth guard dan permission.
9. **Tenant scope audit** — tambahkan tenant leakage tests untuk modul penduduk, keluarga, surat, dan pengaduan.
10. **Audit log mutation** — pastikan perubahan data sensitif, export, upload/download, dan workflow status tercatat.
11. **Backup/restore** — script tersedia; jadwalkan uji restore staging berkala dan dokumentasikan bukti.
12. **Smoke test MVP** — perlu dijalankan rutin setelah deploy staging, minimal health, login, dashboard, penduduk, surat, pengaduan.
13. **Production readiness checklist** — update `docs/PRODUCTION_READINESS.md` setiap PR sampai semua gate go-live hijau.
