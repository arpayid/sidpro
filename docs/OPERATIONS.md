# SIDPRO Operations

Target awal: VPS dan Docker Compose.

## Release baseline

Checkpoint MVP Stabilization & Enterprise UI:

| Tag | Commit | Notes |
|-----|--------|-------|
| `mvp-stabilization-v1.1` | latest | Staging reliability hardening (systemd, seed env, MinIO auto-bucket) |
| `mvp-stabilization-v1` | `b845269` | MVP + Enterprise UI |

- **Staging guide:** [`docs/STAGING_DEPLOY.md`](./STAGING_DEPLOY.md)
- **Systemd templates:** `scripts/systemd/sidpro-api.service.example`, `scripts/systemd/sidpro-web.service.example`

Gunakan tag untuk rollback staging sebelum production.

## Service utama

- **web** — Next.js admin + portal (`:3000`)
- **api** — NestJS REST API (`:4000`)
- **worker** — background jobs (placeholder)
- **postgres** — PostgreSQL 17 (Docker Compose)
- **redis** — cache / queue (Docker Compose)
- **minio** — object storage (Docker Compose)
- **reverse proxy** — Nginx (recommended untuk staging/production)

`docker-compose.yml` hanya menjalankan infra. API dan web via `pnpm`, `staging-start.sh`, atau **systemd** (disarankan di VPS).

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
git checkout mvp-stabilization-v1.1
cp .env.example .env                # set credential non-default
docker compose up -d postgres redis minio
pnpm prisma:generate
pnpm prisma migrate deploy
SEED_ADMIN_PASSWORD='<strong-password>' pnpm prisma:seed
pnpm build
./scripts/staging-start.sh          # atau systemd (lihat STAGING_DEPLOY)
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

1. Pull code / checkout tag
2. Verifikasi `.env` atau `/etc/sidpro/sidpro.env` (tanpa secret di repo)
3. `pnpm install`
4. Validasi: lint, typecheck, test, build, `prisma validate`
5. `prisma migrate deploy`
6. Start infra + aplikasi (systemd atau staging-start)
7. Healthcheck + smoke test

## Backup

Staging VPS (systemd):

```bash
./scripts/staging-backup-cron.sh          # manual
cat /etc/cron.d/sidpro-backup             # daily 02:00 UTC
ls -la /var/backups/sidpro/
tail /var/log/sidpro-backup.log
```

Cron expression: `0 2 * * *` (daily 02:00 UTC).

Restore singkat: gunzip backup → `psql`, lalu `systemctl restart sidpro-api sidpro-web`. Detail: [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md#backup).

Manual dev:

```bash
DATABASE_URL=... ./scripts/backup.sh
```

## Rollback

1. `git checkout <previous-tag>` (mis. `mvp-stabilization-v1`)
2. `pnpm install && pnpm build`
3. `pnpm prisma migrate deploy` — review catatan migrasi
4. Restore DB bila perlu: `./scripts/restore.sh backups/db_*.sql.gz`
5. `sudo systemctl restart sidpro-api sidpro-web` atau `./scripts/staging-start.sh`
6. `./scripts/healthcheck.sh`

## Monitoring & security

- Health: `GET /api/v1/health`, web `GET /`
- Monitoring: [`docs/MONITORING.md`](./MONITORING.md)
- Security: [`docs/SECURITY.md`](./SECURITY.md), [`docs/SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md)
