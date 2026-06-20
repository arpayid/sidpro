# Stabilisasi Staging SIDPRO

Checklist setelah Waves 20–23 selesai, sebelum Post-MVP penuh.

## Prasyarat

- Tag terbaru: `mvp-staging-v2`, `mvp-tenant-v3`, `mvp-ops-v1`, `mvp-bumdes-v1`, `mvp-gis-v1`, `mvp-ai-v1`
- Branch `main` CI hijau (lint, typecheck, test, build, smoke)

## Checklist deploy staging

1. **Environment** — `/etc/sidpro/sidpro.env` dengan secret non-default (`JWT_SECRET`, `POSTGRES_PASSWORD`, `SEED_ADMIN_PASSWORD`, dll.)
2. **Infra** — `docker compose up -d postgres redis minio`
3. **Migrate & seed** — `pnpm prisma migrate deploy && SEED_ADMIN_PASSWORD='...' pnpm prisma:seed`
4. **Build & restart** — `pnpm build && sudo systemctl restart sidpro-api sidpro-web sidpro-worker`
5. **Health** — `./scripts/healthcheck.sh`
6. **Smoke** — `STAGING_ADMIN_PASSWORD='...' ./scripts/smoke-test.sh`
7. **Backup drill** — `pnpm backup` + verifikasi file di `/var/backups/sidpro`
8. **2FA staging** — aktifkan `security.require_2fa_admin` di Pengaturan; uji enrollment admin (`docs/2FA_ROLLOUT.md`)

## Validasi otomatis lokal

```bash
./scripts/staging-validate.sh
./scripts/staging-readiness.sh
```

## Kriteria stabil (2 minggu)

- Smoke CI hijau setiap merge ke `main`
- Tidak ada incident restore/backup gagal
- Tidak ada temuan P1/P2 security terbuka
- 2FA wajib admin aktif di staging (`docs/STAGING_2WEEK_RUNBOOK.md`)

## Rollback

```bash
git checkout <tag-stabil>
cd /opt/sidpro && pnpm install && pnpm build
sudo systemctl restart sidpro-api sidpro-web sidpro-worker
```

Lihat juga: [`STAGING_DEPLOY.md`](./STAGING_DEPLOY.md), [`OPERATIONS.md`](./OPERATIONS.md), [`STAGING_2WEEK_RUNBOOK.md`](./STAGING_2WEEK_RUNBOOK.md)
