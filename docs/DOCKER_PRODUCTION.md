# Docker Production Deployment

SIDPRO menyediakan deployment container production untuk stack lengkap: `nginx`, `web`, `api`, `worker`, `postgres`, `redis`, dan `minio`.

## File utama

- `apps/api/Dockerfile` — build dan runtime NestJS API.
- `apps/web/Dockerfile` — build dan runtime Next.js web.
- `apps/worker/Dockerfile` — build dan runtime worker BullMQ.
- `docker-compose.prod.yml` — orkestrasi production container.
- `docker/nginx/default.conf` — reverse proxy untuk `/` ke web dan `/api` ke API.
- `.env.production.example` — template env production tanpa secret nyata.
- `.env.staging.example` — template staging untuk dry-run.

## Validasi compose production

```bash
cp .env.production.example .env
# Edit semua placeholder dan gunakan secret kuat sebelum menjalankan stack.
docker compose -f docker-compose.prod.yml config
```

## Build dan start production

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Healthcheck container wajib hijau sebelum smoke test:

```bash
docker compose -f docker-compose.prod.yml ps
```

## Smoke test staging setelah deploy

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
