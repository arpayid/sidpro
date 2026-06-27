# SIDPRO Operations

Target awal: VPS dan Docker Compose.

## Release baseline

Checkpoint staging & client deployment baseline:

| Tag                      | Commit    | Notes                                                       |
| ------------------------ | --------- | ----------------------------------------------------------- |
| `mvp-staging-ops-v1.3`   | latest    | Finalized `/opt/sidpro` deploy + DB & MinIO backup          |
| `mvp-staging-ops-v1.2`   | `cbdb8d7` | Systemd + staging DB backup cron docs                       |
| `mvp-stabilization-v1.1` | `f1f5b4e` | Staging reliability hardening (seed env, MinIO auto-bucket) |
| `mvp-stabilization-v1`   | `b845269` | MVP + Enterprise UI                                         |

**Client deployment baseline:** `mvp-staging-ops-v1.2` — systemd services + daily DB backup via `scripts/staging-backup-cron.sh`.

**Current staging baseline:** `mvp-staging-ops-v1.3` — deploy path `/opt/sidpro`, systemd, DB + MinIO/uploads backup.

- **Staging guide:** [`docs/STAGING_DEPLOY.md`](./STAGING_DEPLOY.md)
- **Systemd templates:** `scripts/systemd/sidpro-api.service.example`, `scripts/systemd/sidpro-web.service.example`, `scripts/systemd/sidpro-worker.service.example`

## Staging directory layout

| Path                         | Purpose                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| `/opt/sidpro`                | Application root (git clone, build, systemd WorkingDirectory) |
| `/etc/sidpro/sidpro.env`     | Environment file (`chmod 600`, outside repo)                  |
| `/var/backups/sidpro`        | Database + object storage backups                             |
| `/var/log/sidpro-backup.log` | Backup cron log                                               |
| `/var/log/sidpro/`           | Optional additional app logs                                  |

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

| Env         | Purpose                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REDIS_URL` | Required BullMQ connection for API producer and worker consumer, for example `redis://redis:6379` in Docker Compose or `redis://localhost:6379` locally. |
| `SMTP_HOST` | SMTP server host. If unset, worker intentionally falls back to the console email adapter and logs the rendered email to stdout.                          |
| `SMTP_PORT` | SMTP server port. Defaults to `587` when `SMTP_HOST` is set.                                                                                             |
| `SMTP_FROM` | Sender address used by the SMTP adapter. Defaults to `noreply@sidpro.local` if omitted.                                                                  |
| `APP_URL`   | Tracking link base URL in the email body.                                                                                                                |

Queue contract:

- Queue name: `notifications`.
- Complaint status email job name/type: `complaint-status-email`.
- API producer: `NotificationQueueService.enqueueComplaintStatusEmail(...)`.
- Worker consumer: `apps/worker` processes the job with the SMTP adapter when `SMTP_HOST` exists, otherwise with the console adapter.

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

| Langkah              | Contoh                                                              |
| -------------------- | ------------------------------------------------------------------- |
| `NODE_OPTIONS`       | `NODE_OPTIONS=--max-old-space-size=512` di `/etc/sidpro/sidpro.env` |
| systemd `MemoryMax`  | `MemoryMax=768M` di unit `sidpro-web.service`                       |
| `Restart=on-failure` | Restart otomatis bila proses crash/OOM-killed                       |
| Monitor              | `journalctl -u sidpro-web` — cari `JavaScript heap out of memory`   |

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

## Operator Runbook

Runbook ini mengikuti kondisi repo saat ini: staging VPS menjalankan `api`, `web`, dan `worker` via systemd dari `/opt/sidpro`, sedangkan `postgres`, `redis`, dan `minio` via `docker compose`; production container penuh memakai `docker-compose.prod.yml`. Semua command dijalankan dari root repo `/opt/sidpro` kecuali disebutkan lain.

> **Keamanan:** jangan commit `.env` atau secret. File operasional server berada di `/etc/sidpro/sidpro.env` dengan mode `600`. Untuk production Compose, `.env` server harus berisi secret kuat dan tidak disalin ke repo.

### 1. Deploy

#### Staging systemd + infra Compose

```bash
cd /opt/sidpro
git fetch --tags origin
git checkout <tag-or-branch>
pnpm install
docker compose up -d postgres redis minio
pnpm prisma:generate
pnpm prisma migrate deploy
pnpm build
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
./scripts/healthcheck.sh
STAGING_ADMIN_PASSWORD='<admin-password>' SMOKE_RUN_SEED=0 pnpm smoke
```

Jika permission seed berubah, jalankan seed dengan password kuat lalu smoke test tanpa seed ulang:

```bash
SEED_ADMIN_PASSWORD='<strong-password>' pnpm prisma:seed
STAGING_ADMIN_PASSWORD='<strong-password>' SMOKE_RUN_SEED=0 pnpm smoke
```

#### Production Docker Compose

```bash
cd /opt/sidpro
git fetch --tags origin
git checkout <tag-or-branch>
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/api/v1/health
curl -f http://localhost/
STAGING_ADMIN_EMAIL='<admin-email>' STAGING_ADMIN_PASSWORD='<admin-password>' SMOKE_RUN_SEED=0 pnpm smoke
```

### 2. Rollback

Rollback hanya aman bila migrasi database kompatibel dengan versi sebelumnya. Jika migrasi destruktif sudah berjalan, ambil keputusan dengan owner produk sebelum restore database.

#### Staging systemd

```bash
cd /opt/sidpro
./scripts/staging-backup-cron.sh
git checkout <previous-tag-or-commit>
pnpm install
pnpm prisma:generate
pnpm build
pnpm prisma migrate deploy
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
./scripts/healthcheck.sh
STAGING_ADMIN_PASSWORD='<admin-password>' SMOKE_RUN_SEED=0 pnpm smoke
```

#### Production Compose

```bash
cd /opt/sidpro
docker compose -f docker-compose.prod.yml ps
git checkout <previous-tag-or-commit>
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/api/v1/health
curl -f http://localhost/
```

### 3. Backup

#### Staging VPS DB + MinIO/uploads

```bash
/opt/sidpro/scripts/staging-backup-cron.sh
ls -lah /var/backups/sidpro/
tail -n 100 /var/log/sidpro-backup.log
sha256sum -c /var/backups/sidpro/db_YYYYMMDD_HHMMSS.sql.gz.sha256
```

#### Local/development DB

```bash
export DATABASE_URL='postgresql://sidpro:sidpro@localhost:5432/sidpro'
export BACKUP_DIR='./backups'
pnpm backup
sha256sum -c backups/db_YYYYMMDD_HHMMSS.sql.gz.sha256
```

#### Production Compose DB ad-hoc

```bash
cd /opt/sidpro
mkdir -p /var/backups/sidpro
set -a && source .env && set +a
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > /var/backups/sidpro/db_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 4. Restore

Selalu lakukan restore saat traffic dihentikan atau dalam maintenance window. Simpan backup terbaru sebelum restore.

#### Staging database

```bash
sudo systemctl stop sidpro-api sidpro-web sidpro-worker
set -a && source /etc/sidpro/sidpro.env && set +a
DB_URL="${DATABASE_URL%%\?*}"
gunzip -c /var/backups/sidpro/db_YYYYMMDD_HHMMSS.sql.gz | psql "$DB_URL" -v ON_ERROR_STOP=1
sudo systemctl start sidpro-api sidpro-web sidpro-worker
/opt/sidpro/scripts/healthcheck.sh
```

#### Staging MinIO/uploads

```bash
set -a && source /etc/sidpro/sidpro.env && set +a
mkdir -p /tmp/sidpro-restore
tar -xzf /var/backups/sidpro/uploads_YYYYMMDD_HHMMSS.tar.gz -C /tmp/sidpro-restore
docker run --rm --network container:sidpro-minio \
  -v /tmp/sidpro-restore:/restore-data:ro \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD -e MINIO_BUCKET \
  --entrypoint /bin/sh minio/mc -c \
  'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc mirror --overwrite /restore-data local/${MINIO_BUCKET:-sidpro-files}'
```

#### Production Compose database

```bash
cd /opt/sidpro
docker compose -f docker-compose.prod.yml stop api web worker
set -a && source .env && set +a
gunzip -c /var/backups/sidpro/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1
docker compose -f docker-compose.prod.yml up -d api web worker nginx
docker compose -f docker-compose.prod.yml ps
```

### 5. Rotate secret

Rotasi secret harus direncanakan karena `JWT_SECRET` menginvalidasi sesi JWT aktif, `POSTGRES_PASSWORD` perlu update database user + connection string, dan `MINIO_ROOT_PASSWORD` perlu restart service yang mengakses object storage.

#### Staging systemd

```bash
sudoedit /etc/sidpro/sidpro.env
sudo chmod 600 /etc/sidpro/sidpro.env
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
sudo systemctl status sidpro-api sidpro-web sidpro-worker --no-pager
/opt/sidpro/scripts/healthcheck.sh
```

#### Production Compose

```bash
cd /opt/sidpro
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
$EDITOR .env
chmod 600 .env
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --force-recreate
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/api/v1/health
```

### 6. Check logs

#### Staging systemd

```bash
sudo journalctl -u sidpro-api -n 200 --no-pager
sudo journalctl -u sidpro-web -n 200 --no-pager
sudo journalctl -u sidpro-worker -n 200 --no-pager
sudo journalctl -u sidpro-api -f
```

#### Production Compose

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 api
docker compose -f docker-compose.prod.yml logs --tail=200 web
docker compose -f docker-compose.prod.yml logs --tail=200 worker
docker compose -f docker-compose.prod.yml logs -f api web worker nginx
```

### 7. Check worker

```bash
sudo systemctl status sidpro-worker --no-pager
sudo journalctl -u sidpro-worker -n 200 --no-pager
```

Production Compose:

```bash
docker compose -f docker-compose.prod.yml ps worker
docker compose -f docker-compose.prod.yml logs --tail=200 worker
```

Worker harus memakai `REDIS_URL` yang sama dengan API. Jika `SMTP_HOST` belum diset, worker memakai console email adapter dan email notifikasi hanya muncul di log.

### 8. Check queue

Queue utama saat ini adalah BullMQ `notifications` untuk email status pengaduan. Pemeriksaan dasar Redis:

```bash
redis-cli -u "$REDIS_URL" ping
redis-cli -u "$REDIS_URL" keys 'bull:notifications*'
redis-cli -u "$REDIS_URL" llen bull:notifications:wait
redis-cli -u "$REDIS_URL" llen bull:notifications:failed
```

Jika Redis berjalan sebagai container development/staging dengan nama `sidpro-redis`:

```bash
docker exec sidpro-redis redis-cli ping
docker exec sidpro-redis redis-cli keys 'bull:notifications*'
```

Production Compose:

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
docker compose -f docker-compose.prod.yml exec redis redis-cli keys 'bull:notifications*'
```

### 9. Check storage

#### Staging container `sidpro-minio`

```bash
docker ps --filter name=sidpro-minio
docker logs --tail=100 sidpro-minio
set -a && source /etc/sidpro/sidpro.env && set +a
docker run --rm --network container:sidpro-minio \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD -e MINIO_BUCKET \
  --entrypoint /bin/sh minio/mc -c \
  'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" && mc ls local/${MINIO_BUCKET:-sidpro-files}'
```

#### Production Compose

```bash
docker compose -f docker-compose.prod.yml ps minio
docker compose -f docker-compose.prod.yml logs --tail=100 minio
docker compose -f docker-compose.prod.yml exec minio mc ready local
```

### 10. Run smoke test

Smoke test memvalidasi health, login admin, dashboard/RBAC, dan alur MVP. Jalankan setelah deploy, rollback, restore, atau rotasi secret.

```bash
STAGING_ADMIN_EMAIL='<admin-email>' \
STAGING_ADMIN_PASSWORD='<admin-password>' \
SMOKE_RUN_SEED=0 \
pnpm smoke
```

Mode API-only bila web belum tersedia:

```bash
STAGING_ADMIN_PASSWORD='<admin-password>' SMOKE_RUN_SEED=0 SMOKE_SKIP_WEB=1 pnpm smoke
```

## Incident Checklist

Checklist berikut dipakai untuk triage cepat. Catat waktu kejadian, versi/tag aktif, command yang dijalankan, hasil healthcheck, dan keputusan rollback/restore.

### API down

1. Cek status service/container: `sudo systemctl status sidpro-api --no-pager` atau `docker compose -f docker-compose.prod.yml ps api`.
2. Cek log error: `sudo journalctl -u sidpro-api -n 200 --no-pager` atau `docker compose -f docker-compose.prod.yml logs --tail=200 api`.
3. Cek dependency API: PostgreSQL, Redis, MinIO, dan env wajib (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `MINIO_*`).
4. Jalankan health endpoint: `curl -v http://localhost:4000/api/v1/health` untuk systemd atau `curl -v http://localhost/api/v1/health` untuk Compose/nginx.
5. Restart API bila dependency sehat: `sudo systemctl restart sidpro-api` atau `docker compose -f docker-compose.prod.yml restart api`.
6. Jika gagal setelah deploy terbaru, rollback ke tag/commit sebelumnya dan jalankan smoke test.

### Web down

1. Cek status: `sudo systemctl status sidpro-web --no-pager` atau `docker compose -f docker-compose.prod.yml ps web nginx`.
2. Cek log: `sudo journalctl -u sidpro-web -n 200 --no-pager` atau `docker compose -f docker-compose.prod.yml logs --tail=200 web nginx`.
3. Validasi web lokal: `curl -v http://localhost:3000/` untuk systemd atau `curl -v http://localhost/` untuk Compose.
4. Cek `NEXT_PUBLIC_API_URL`, `APP_URL`, dan OOM (`JavaScript heap out of memory`) pada log.
5. Restart web: `sudo systemctl restart sidpro-web` atau `docker compose -f docker-compose.prod.yml restart web nginx`.
6. Jika web sehat tetapi proxy gagal, cek konfigurasi nginx dan port publik.

### Worker down

1. Cek status worker: `sudo systemctl status sidpro-worker --no-pager` atau `docker compose -f docker-compose.prod.yml ps worker`.
2. Cek log: `sudo journalctl -u sidpro-worker -n 200 --no-pager` atau `docker compose -f docker-compose.prod.yml logs --tail=200 worker`.
3. Cek Redis: `redis-cli -u "$REDIS_URL" ping` atau `docker compose -f docker-compose.prod.yml exec redis redis-cli ping`.
4. Cek env `REDIS_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, dan `ENABLE_PDF_WORKER`.
5. Restart worker: `sudo systemctl restart sidpro-worker` atau `docker compose -f docker-compose.prod.yml restart worker`.
6. Cek queue `bull:notifications:*` untuk backlog/failed jobs.

### Redis down

1. Cek status: `docker compose ps redis` untuk staging/dev atau `docker compose -f docker-compose.prod.yml ps redis` untuk production.
2. Cek log: `docker compose logs --tail=200 redis` atau `docker compose -f docker-compose.prod.yml logs --tail=200 redis`.
3. Tes ping: `docker exec sidpro-redis redis-cli ping` atau `docker compose -f docker-compose.prod.yml exec redis redis-cli ping`.
4. Cek disk host dan volume Redis: `df -h` dan `docker system df`.
5. Restart Redis: `docker compose restart redis` atau `docker compose -f docker-compose.prod.yml restart redis`.
6. Restart API + worker setelah Redis pulih agar koneksi BullMQ kembali bersih.

### PostgreSQL full/down

1. Cek status: `docker compose ps postgres` atau `docker compose -f docker-compose.prod.yml ps postgres`.
2. Cek log database: `docker compose logs --tail=200 postgres` atau `docker compose -f docker-compose.prod.yml logs --tail=200 postgres`.
3. Cek kapasitas disk dan volume: `df -h`, `docker system df`, dan lokasi backup `/var/backups/sidpro`.
4. Tes koneksi: `psql "$DATABASE_URL" -c 'SELECT 1;'` atau `docker compose -f docker-compose.prod.yml exec postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"`.
5. Jika disk penuh, arsipkan/pindahkan backup lama dan lakukan pruning Docker dengan hati-hati setelah memastikan volume data tidak terhapus.
6. Jika database corrupt/down, restore dari backup terakhir yang tervalidasi checksum lalu jalankan healthcheck + smoke test.

### MinIO inaccessible

1. Cek status container: `docker ps --filter name=sidpro-minio` atau `docker compose -f docker-compose.prod.yml ps minio`.
2. Cek log: `docker logs --tail=100 sidpro-minio` atau `docker compose -f docker-compose.prod.yml logs --tail=100 minio`.
3. Cek readiness: `docker compose -f docker-compose.prod.yml exec minio mc ready local` atau run `minio/mc` dengan network container staging.
4. Validasi env API/worker: `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, dan `MINIO_PUBLIC_URL`.
5. Cek bucket: `mc ls local/${MINIO_BUCKET:-sidpro-files}` via command pada runbook **Check storage**.
6. Restart MinIO, lalu restart API bila bucket auto-create atau presigned URL masih gagal.

## Production Hardening Defaults

The first production-readiness tranche enforces safer runtime defaults before SIDPRO is used with real citizen data:

- `JWT_SECRET`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGIN`, `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, and `MINIO_BUCKET` are required when `NODE_ENV=production`.
- Production startup rejects known demo/default values such as `change-me`, `sidpro_secret`, and short JWT secrets.
- Swagger is disabled in production unless `ENABLE_SWAGGER=true` is explicitly configured. If enabled for staging/internal use, protect it with authentication, IP allowlisting, or reverse-proxy rules.
- Public portal demo fallback is disabled in production unless `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=true` is explicitly configured. Production API failures should surface empty/error states instead of demo village content.
- Letter PDF generation currently remains synchronous in the API: `POST /letter-requests/:id/generate-pdf` renders the PDF, uploads it to MinIO, creates the file record, updates `LetterOutput`, and completes the request in one guarded API flow.
- Keep `ENABLE_PDF_WORKER=false` in production unless the API is changed to enqueue `pdf-generation` jobs. With the default false value, the worker process does **not** register `Worker('pdf-generation')`, preventing half-wired async processing from consuming or failing jobs.
- If `ENABLE_PDF_WORKER=true` is used in a future async rollout, `MINIO_ENDPOINT`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, and `MINIO_BUCKET` must be explicitly set; startup fails fast when any are missing.

Recommended production values:

```bash
NODE_ENV=production
ENABLE_SWAGGER=false
NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false
ENABLE_PDF_WORKER=false
JWT_SECRET=<long-random-secret-at-least-32-chars>
```

## Production Docker Compose

Production container deployment is available through `docker-compose.prod.yml`. It runs `web`, `api`, `worker`, `postgres`, `redis`, `minio`, and `nginx` with `restart: unless-stopped`, internal service networking, and healthchecks for web/API/database/cache/object storage.

### Production environment file

Create a production `.env` on the server (do **not** commit real values):

```bash
cp .env.example .env
chmod 600 .env
```

Set production-safe values before starting containers:

| Variable                                                 | Production note                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `NODE_ENV`                                               | Must be `production`                                                                             |
| `DATABASE_URL`                                           | Use the Compose hostname, e.g. `postgresql://<user>:<password>@postgres:5432/<db>?schema=public` |
| `REDIS_URL`                                              | Use the Compose hostname, e.g. `redis://redis:6379`                                              |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`      | Required; use non-default credentials                                                            |
| `JWT_SECRET`                                             | Required; long random secret, never default/demo                                                 |
| `MINIO_ENDPOINT`, `MINIO_PORT`                           | Use `minio` and `9000` for internal Compose access                                               |
| `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET` | Required; use non-default credentials                                                            |
| `CORS_ORIGIN`, `APP_URL`, `NEXT_PUBLIC_API_URL`          | Set to the public production domain/proxy route                                                  |
| `ENABLE_SWAGGER`                                         | Defaulted to `false` in Compose                                                                  |
| `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK`                       | Defaulted to `false` in Compose                                                                  |
| `ENABLE_PDF_WORKER`                                      | Defaulted to `false` in Compose                                                                  |

### Validate and start

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
```

After the stack starts, verify status and routing:

```bash
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/api/v1/health
curl -f http://localhost/
```

### Rollback

```bash
docker compose -f docker-compose.prod.yml down
git checkout <previous-tag-or-commit>
docker compose -f docker-compose.prod.yml up -d --build
```

Review database migration compatibility before rolling back code that has already run production migrations.
