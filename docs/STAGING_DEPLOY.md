# Staging Deployment Guide

SIDPRO staging deployment — **not production**.

**Checkpoint:** `mvp-stabilization-v1.1` (see [`docs/OPERATIONS.md`](./OPERATIONS.md))

## Prerequisites

- VPS with Docker & Docker Compose
- Domain or subdomain (e.g. `staging.desa.example.id`)
- PostgreSQL, Redis, MinIO via Docker Compose
- Node.js 20+ and pnpm 9+ for build (or build in CI)
- systemd (recommended for API/web process management)

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Staging note |
|----------|--------------|
| `JWT_SECRET` | Long random string — **never use default** |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGIN` | Staging web URL |
| `NEXT_PUBLIC_API_URL` | Staging API URL |
| `MINIO_*` | MinIO credentials (non-default) |
| `NODE_ENV` | `production` for staging |
| `SEED_ADMIN_EMAIL` | Admin email for `prisma:seed` (optional) |
| `SEED_ADMIN_PASSWORD` | **Required** for staging seed — non-default password |
| `STAGING_ADMIN_PASSWORD` | Same value for `./scripts/smoke-test.sh` |

**Do not use seed password `Admin123!` in staging.** Set `SEED_ADMIN_PASSWORD` when running seed.

For systemd, copy `.env` to `/etc/sidpro/sidpro.env` with `chmod 600` — **never commit this file**.

## Steps

```bash
# 1. Clone & install
git clone <repo> && cd sidpro
git checkout mvp-stabilization-v1.1   # or main
pnpm install

# 2. Infrastructure
docker compose up -d postgres redis minio

# 3. Database
pnpm prisma:generate
pnpm prisma migrate deploy
SEED_ADMIN_EMAIL=admin@staging.example.id \
SEED_ADMIN_PASSWORD='<strong-random-password>' \
pnpm prisma:seed

# 4. Build
pnpm build

# 5. Start services (choose one)

## Option A — quick start script
./scripts/staging-start.sh

## Option B — manual
pnpm --filter @sidpro/api start:prod &
pnpm --filter @sidpro/web start &

## Option C — systemd (recommended for VPS)
# See "Systemd deployment" below

# 6. Healthcheck & smoke test
./scripts/healthcheck.sh
STAGING_ADMIN_PASSWORD='<same-as-seed>' ./scripts/smoke-test.sh
```

MinIO bucket `MINIO_BUCKET` is auto-created when the API starts (`StorageService.onModuleInit`).

## Systemd deployment

Templates: `scripts/systemd/sidpro-api.service.example`, `scripts/systemd/sidpro-web.service.example`

### 1. Prepare environment file

```bash
sudo mkdir -p /etc/sidpro
sudo cp .env /etc/sidpro/sidpro.env
sudo chmod 600 /etc/sidpro/sidpro.env
sudo chown root:root /etc/sidpro/sidpro.env
```

### 2. Install unit files

```bash
sudo cp scripts/systemd/sidpro-api.service.example /etc/systemd/system/sidpro-api.service
sudo cp scripts/systemd/sidpro-web.service.example /etc/systemd/system/sidpro-web.service
# Edit WorkingDirectory, User, and ExecStart paths if not using /opt/sidpro
sudo systemctl daemon-reload
```

### 3. Enable and start

```bash
sudo systemctl enable sidpro-api sidpro-web
sudo systemctl start sidpro-api sidpro-web
```

### 4. Operations

| Action | Command |
|--------|---------|
| Status | `sudo systemctl status sidpro-api sidpro-web` |
| Restart | `sudo systemctl restart sidpro-api sidpro-web` |
| Stop | `sudo systemctl stop sidpro-api sidpro-web` |
| API logs | `sudo journalctl -u sidpro-api -f` |
| Web logs | `sudo journalctl -u sidpro-web -f` |

After code or env changes:

```bash
git pull && pnpm install && pnpm build
sudo systemctl restart sidpro-api sidpro-web
./scripts/healthcheck.sh
```

## Nginx (recommended)

Reverse proxy:

- `/` → web `:3000`
- `/api` → api `:4000`

Enable HTTPS with Let's Encrypt before exposing publicly.

## Backup

```bash
DATABASE_URL=... ./scripts/backup.sh
```

Schedule via cron (daily recommended).

## Rollback

1. `git checkout mvp-stabilization-v1.1` (or previous tag)
2. `pnpm install && pnpm build`
3. `pnpm prisma migrate deploy` (review migration notes)
4. Restore DB from backup if needed: `./scripts/restore.sh backups/db_*.sql.gz`
5. `sudo systemctl restart sidpro-api sidpro-web` (if using systemd)
6. `./scripts/healthcheck.sh`

## Health Endpoints

- API: `GET /api/v1/health`
- Web: `GET /`

See `docs/MONITORING.md` for monitoring setup.
