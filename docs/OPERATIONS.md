# SIDPRO Operations

Target awal: VPS dan Docker Compose.

## Release baseline

Checkpoint MVP Stabilization & Enterprise UI:

- **Tag:** `mvp-stabilization-v1` (`b845269`)
- **Staging guide:** [`docs/STAGING_DEPLOY.md`](./STAGING_DEPLOY.md)

Gunakan tag ini untuk rollback staging dan sebagai referensi rilis sebelum production.

## Service utama

- **web** — Next.js admin + portal (`:3000`)
- **api** — NestJS REST API (`:4000`)
- **worker** — background jobs (placeholder)
- **postgres** — PostgreSQL 17 (Docker Compose)
- **redis** — cache / queue (Docker Compose)
- **minio** — object storage (Docker Compose)
- **reverse proxy** — Nginx (recommended untuk staging/production)

`docker-compose.yml` saat ini hanya menjalankan infra (postgres, redis, minio). API dan web dijalankan via `pnpm` — lihat [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md).

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

Lihat langkah lengkap di [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md).

```bash
git checkout mvp-stabilization-v1   # atau main setelah tag
cp .env.example .env                # set credential non-default
docker compose up -d postgres redis minio
pnpm prisma:generate
pnpm prisma migrate deploy
pnpm prisma:seed                    # ganti password admin setelah seed
pnpm build
pnpm --filter @sidpro/api start:prod &
pnpm --filter @sidpro/web start &
./scripts/healthcheck.sh
```

**Credential staging wajib non-default:** `JWT_SECRET`, `POSTGRES_PASSWORD`, `MINIO_ROOT_*`, password admin (bukan `Admin123!`).

## Release pipeline

1. Pull code / checkout tag
2. Verifikasi `.env` (tanpa secret di repo)
3. `pnpm install`
4. Validasi: lint, typecheck, test, build, `prisma validate`
5. `prisma migrate deploy`
6. Start infra + aplikasi
7. Healthcheck: `./scripts/healthcheck.sh`, `GET /api/v1/health`

## Backup

```bash
DATABASE_URL=... ./scripts/backup.sh
```

Database (`pg_dump`) dan folder uploads (opsional). Jadwalkan harian via cron.

## Rollback

1. `git checkout <previous-tag>` (mis. sebelum `mvp-stabilization-v1`)
2. `pnpm install && pnpm build`
3. `pnpm prisma migrate deploy` — review catatan migrasi
4. Restore DB bila perlu: `./scripts/restore.sh backups/db_*.sql.gz`
5. `./scripts/healthcheck.sh`

## Monitoring & security

- Health: `GET /api/v1/health`, web `GET /`
- Monitoring: [`docs/MONITORING.md`](./MONITORING.md)
- Security: [`docs/SECURITY.md`](./SECURITY.md), [`docs/SECURITY_CHECKLIST.md`](./SECURITY_CHECKLIST.md)
