# SIDPRO Production Readiness Checklist

Checklist ini adalah pintu kontrol sebelum SIDPRO dipakai untuk data warga asli. Status harus diperbarui setiap PR hardening atau sebelum cutover staging/production.

| Area                               | Status      | Bukti / command                                                                                                                                                  |
| ---------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment production tervalidasi | In Progress | `NODE_ENV=production` wajib menolak secret kosong/default melalui API env validation.                                                                            |
| Secret tidak default               | In Progress | `JWT_SECRET`, password DB, password MinIO, dan seed admin harus dirotasi di server.                                                                              |
| Swagger disabled/protected         | Done        | `ENABLE_SWAGGER=false` default production.                                                                                                                       |
| Demo fallback portal disabled      | Done        | `NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false` default production.                                                                                                     |
| Dockerfile production tersedia     | Done        | `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/worker/Dockerfile`.                                                                                          |
| Docker Compose production tersedia | Done        | `docker-compose.prod.yml` berisi web, api, worker, postgres, redis, minio, nginx.                                                                                |
| Reverse proxy tersedia             | Done        | `docker/nginx/default.conf` untuk route web dan `/api`.                                                                                                          |
| CI container validation            | In Progress | CI memvalidasi compose production dan build image aplikasi.                                                                                                      |
| Backup/restore tersedia            | In Progress | `scripts/backup-db.sh`, `scripts/restore-db.sh`, dan runbook perlu diuji berkala.                                                                                |
| Rate limit endpoint publik         | In Progress | Login dan endpoint publik harus diaudit per controller sebelum go-live.                                                                                          |
| Auth refresh token rotation        | In Progress | Perlu test reuse detection/login-refresh-logout lengkap.                                                                                                         |
| Guard + permission endpoint admin  | In Progress | Audit semua `*.controller.ts` sebelum data asli.                                                                                                                 |
| Tenant scope modul core            | In Progress | Tambahkan tenant leakage test untuk penduduk, keluarga, surat, pengaduan.                                                                                        |
| Audit log mutation penting         | In Progress | Pastikan create/update/delete/export dan status workflow tercatat.                                                                                               |
| File upload validation             | In Progress | MIME, size limit, signed URL private file, dan audit download sensitif.                                                                                          |
| Generate PDF surat                 | Done        | API masih memproses PDF secara synchronous dan menyimpan hasil ke MinIO/`LetterOutput`; worker `pdf-generation` tidak diregister saat `ENABLE_PDF_WORKER=false`. |
| Smoke test staging MVP             | In Progress | `scripts/smoke-test.sh` ada; wajib dijalankan setelah deploy staging.                                                                                            |
| Monitoring healthcheck             | In Progress | API `/api/v1/health`, Docker healthcheck, dan docs monitoring tersedia.                                                                                          |

## Related readiness docs

- Client handover module status and client-side go-live checklist: [`CLIENT_HANDOVER_READINESS.md`](CLIENT_HANDOVER_READINESS.md).

## Go-live gate

Go-live hanya boleh dilakukan jika:

1. Semua item keamanan berstatus `Done` atau memiliki risk acceptance tertulis.
2. `docker compose -f docker-compose.prod.yml config` lulus dengan env production nyata.
3. Image `api`, `web`, dan `worker` berhasil dibuild dari commit release.
4. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, dan `pnpm prisma:validate` hijau.
5. Backup database dan storage berhasil dibuat serta restore pernah diuji di staging.
6. Smoke test staging lulus menggunakan akun non-default.
7. Untuk mode default synchronous, `ENABLE_PDF_WORKER=false` dan endpoint `POST /letter-requests/:id/generate-pdf` sudah diuji menyimpan file MinIO dan `LetterOutput`.
8. Jika mode async diaktifkan kemudian, producer API, worker processor, MinIO output, dan update `LetterOutput` harus diuji end-to-end sebelum `ENABLE_PDF_WORKER=true`.
9. Codex review P1/P2 sudah ditangani dan CI hijau.
