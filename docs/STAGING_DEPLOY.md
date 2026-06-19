# Staging Deployment Guide

SIDPRO staging deployment — **not production**.

**Checkpoint:** `mvp-staging-ops-v1.3` (see [`docs/OPERATIONS.md`](./OPERATIONS.md))

## Directory layout (VPS staging)

| Path | Purpose |
|------|---------|
| `/opt/sidpro` | Application root — clone, build, `WorkingDirectory` for systemd |
| `/etc/sidpro/sidpro.env` | Secrets & config (`chmod 600`, never in repo) |
| `/var/backups/sidpro` | `db_*.sql.gz` and `uploads_*.tar.gz` backups |
| `/var/log/sidpro-backup.log` | Backup cron output |

## Prerequisites

- VPS with Docker & Docker Compose
- Node.js 20+ and pnpm 9+ for build
- systemd for API/web process management
- Domain optional (Nginx/HTTPS **not required yet**)

## Environment

Copy `.env.example` to `/etc/sidpro/sidpro.env` and set:

| Variable | Staging note |
|----------|--------------|
| `JWT_SECRET` | Long random string — **never use default** |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGIN` | Staging web URL (e.g. `http://<vps-ip>:3000`) |
| `NEXT_PUBLIC_API_URL` | Staging API URL (e.g. `http://<vps-ip>:4000`) |
| `MINIO_*` | MinIO credentials (non-default) |
| `NODE_ENV` | `production` for staging |
| `SEED_ADMIN_EMAIL` | Admin email for `prisma:seed` (optional) |
| `SEED_ADMIN_PASSWORD` | **Required** for staging seed |
| `STAGING_ADMIN_PASSWORD` | Same value for `./scripts/smoke-test.sh` |
| `REDIS_URL` | `redis://localhost:6379` — required for email notifications queue |
| `APP_URL` | Public web URL for links in notification emails |

```bash
sudo mkdir -p /etc/sidpro
sudo cp .env.example /etc/sidpro/sidpro.env
sudo chmod 600 /etc/sidpro/sidpro.env
sudo chown root:root /etc/sidpro/sidpro.env
```

## Steps

```bash
# 1. Clone to /opt/sidpro
sudo mkdir -p /opt
sudo git clone <repo> /opt/sidpro
cd /opt/sidpro
git checkout mvp-staging-ops-v1.3   # or main
sudo chown -R sidpro:sidpro /opt/sidpro

# 2. Infrastructure (from /opt/sidpro)
docker compose up -d postgres redis minio

# 3. Database
pnpm install
pnpm prisma:generate
pnpm prisma migrate deploy
SEED_ADMIN_EMAIL=admin@staging.example.id \
SEED_ADMIN_PASSWORD='<strong-random-password>' \
pnpm prisma:seed

# 4. Build
pnpm build

# 5. Systemd (see below) — API, web, and worker
sudo cp scripts/systemd/sidpro-*.service.example /etc/systemd/system/
# rename .example suffix as needed
sudo systemctl enable sidpro-api sidpro-web sidpro-worker
sudo systemctl start sidpro-api sidpro-web sidpro-worker

# 6. Healthcheck & smoke test
./scripts/healthcheck.sh
STAGING_ADMIN_PASSWORD='<same-as-seed>' ./scripts/smoke-test.sh
```

MinIO bucket `MINIO_BUCKET` is auto-created when the API starts (`StorageService.onModuleInit`).

## Systemd deployment

Templates: `scripts/systemd/sidpro-api.service.example`, `scripts/systemd/sidpro-web.service.example`, `scripts/systemd/sidpro-worker.service.example`

### 1. Install unit files

```bash
sudo useradd -r -s /usr/sbin/nologin -d /var/lib/sidpro sidpro 2>/dev/null || true
sudo cp scripts/systemd/sidpro-api.service.example /etc/systemd/system/sidpro-api.service
sudo cp scripts/systemd/sidpro-web.service.example /etc/systemd/system/sidpro-web.service
sudo cp scripts/systemd/sidpro-worker.service.example /etc/systemd/system/sidpro-worker.service
sudo chown -R sidpro:sidpro /opt/sidpro
sudo mkdir -p /opt/sidpro/.cache/corepack
sudo chown -R sidpro:sidpro /opt/sidpro/.cache
sudo systemctl daemon-reload
```

Deploy path is **`/opt/sidpro`** — no `chmod o+x /root` required.

### 2. Enable and start

```bash
sudo systemctl enable sidpro-api sidpro-web sidpro-worker
sudo systemctl start sidpro-api sidpro-web sidpro-worker
```

### 3. Operations

| Action | Command |
|--------|---------|
| Status | `sudo systemctl status sidpro-api sidpro-web sidpro-worker` |
| Restart | `sudo systemctl restart sidpro-api sidpro-web sidpro-worker sidpro-worker` |
| Stop | `sudo systemctl stop sidpro-api sidpro-web sidpro-worker` |
| API logs | `sudo journalctl -u sidpro-api -f` |
| Web logs | `sudo journalctl -u sidpro-web -f` |
| Worker logs | `sudo journalctl -u sidpro-worker -f` |

After code or env changes:

```bash
cd /opt/sidpro
git pull && pnpm install && pnpm build
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
./scripts/healthcheck.sh
```

## Nginx (placeholder — no domain yet)

When a domain is available:

- `/` → web `:3000`
- `/api` → api `:4000`

Enable HTTPS with Let's Encrypt. **Do not configure until domain is ready.**

## Backup

Manual (DB + MinIO/uploads):

```bash
/opt/sidpro/scripts/staging-backup-cron.sh
```

### Daily cron

`/etc/cron.d/sidpro-backup`:

```cron
# SIDPRO staging daily backup (02:00 UTC) — DB + MinIO
0 2 * * * root /opt/sidpro/scripts/staging-backup-cron.sh >> /var/log/sidpro-backup.log 2>&1
```

Outputs in `/var/backups/sidpro/`:

- `db_YYYYMMDD_HHMMSS.sql.gz` — PostgreSQL dump
- `uploads_YYYYMMDD_HHMMSS.tar.gz` — MinIO bucket mirror

### Restore (singkat)

**Database:**

```bash
set -a && source /etc/sidpro/sidpro.env && set +a
DB_URL="${DATABASE_URL%%\?*}"
gunzip -c /var/backups/sidpro/db_YYYYMMDD_HHMMSS.sql.gz | psql "$DB_URL"
```

**Object storage (MinIO):**

```bash
# Extract to temp dir, then mc cp/mirror back to bucket (requires MinIO running)
mkdir -p /tmp/sidpro-restore && tar -xzf /var/backups/sidpro/uploads_YYYYMMDD_HHMMSS.tar.gz -C /tmp/sidpro-restore
# Use mc mirror /tmp/sidpro-restore local/sidpro-files (see MinIO docs)
```

**After restore:**

```bash
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
./scripts/healthcheck.sh
```

## Rollback

1. `git checkout <previous-tag>` in `/opt/sidpro`
2. `pnpm install && pnpm build`
3. `pnpm prisma migrate deploy` (review migration notes)
4. Restore from `/var/backups/sidpro/` if needed
5. `sudo systemctl restart sidpro-api sidpro-web sidpro-worker sidpro-worker`
6. `./scripts/healthcheck.sh`

## Health Endpoints

- API: `GET /api/v1/health`
- Web: `GET /`

See `docs/MONITORING.md` for monitoring setup.
