# Staging Deployment Guide

SIDPRO staging deployment — **not production**.

## Prerequisites

- VPS with Docker & Docker Compose
- Domain or subdomain (e.g. `staging.desa.example.id`)
- PostgreSQL, Redis, MinIO via Docker Compose
- Node.js 20+ for build (or build in CI)

## Environment

Copy `.env.example` to `.env` and set:

| Variable | Staging note |
|----------|--------------|
| `JWT_SECRET` | Long random string — **never use default** |
| `DATABASE_URL` | PostgreSQL connection string |
| `CORS_ORIGIN` | Staging web URL |
| `NEXT_PUBLIC_API_URL` | Staging API URL |
| `MINIO_*` | MinIO credentials |
| `NODE_ENV` | `production` for staging |

**Do not use seed password `Admin123!` in staging.** Create new admin after deploy.

## Steps

```bash
# 1. Clone & install
git clone <repo> && cd sidpro
pnpm install

# 2. Infrastructure
docker compose up -d postgres redis minio

# 3. Database
pnpm prisma:generate
pnpm prisma migrate deploy
pnpm prisma:seed  # optional demo data — change passwords after

# 4. Build
pnpm build

# 5. Start services
pnpm --filter @sidpro/api start:prod &
pnpm --filter @sidpro/web start &

# 6. Healthcheck
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

1. `git checkout <previous-tag>`
2. `pnpm install && pnpm build`
3. `pnpm prisma migrate deploy` (review migration notes)
4. Restore DB from backup if needed: `./scripts/restore.sh backups/db_*.sql.gz`

## Health Endpoints

- API: `GET /api/v1/health`
- Web: `GET /`

See `docs/MONITORING.md` for monitoring setup.
