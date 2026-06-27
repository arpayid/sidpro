# AI MVP Stabilization Repair Plan

Dokumen ini adalah brief kerja terperinci untuk AI/coding agent berikutnya yang akan menutup gap release SIDPRO sebelum client handover. Gunakan dokumen ini bersama:

- `AGENTS.md`
- `docs/SID_ENTERPRISE_BLUEPRINT.md`
- `.ai/README.md`
- `.ai/skills/00-master-orchestrator.md`
- `docs/BACKEND_ENTERPRISE_HARDENING_MATRIX.md`
- `docs/UI_ENTERPRISE_HARDENING_CHECKLIST.md`
- `docs/PRODUCTION_READINESS.md`
- `docs/CLIENT_HANDOVER_READINESS.md`
- `docs/OPERATIONS.md`
- `docs/DOCKER_PRODUCTION.md`

## 1. Tujuan

Menyiapkan SIDPRO agar layak menjadi release candidate untuk staging/client handover dengan menutup gap MVP stabilization berikut:

1. Backend endpoint MVP tidak lagi memiliki gap kontrol kritis seperti validasi, tenant scope, permission, audit log, dan endpoint-level tests.
2. Halaman admin prioritas MVP memenuhi standar `Premium Ready`.
3. Production readiness gate memiliki bukti validasi, bukan klaim manual.
4. Staging smoke, Docker Compose validation, backup/restore drill, dan rollback plan siap dieksekusi oleh operator.
5. Tidak ada P0/P1 terbuka sebelum client release.

## 2. Aturan Kerja untuk AI Berikutnya

### 2.1 Workflow wajib

Ikuti workflow repo:

```txt
AUDIT
→ PLAN
→ IMPLEMENT
→ VALIDATE
→ TEST
→ PR
→ CI HIJAU
→ CODEX REVIEW
→ MERGE
→ DEPLOY
```

### 2.2 Skill yang disarankan

Pilih skill sesuai issue:

| Area | Skill |
|---|---|
| Audit gap dan matrix | `.ai/skills/01-audit-skill.md` |
| Perencanaan batch PR | `.ai/skills/02-planning-skill.md` |
| UI Premium Ready | `.ai/skills/03-frontend-ui-skill.md` |
| Backend endpoint hardening | `.ai/skills/04-backend-api-skill.md` |
| Prisma/database validation | `.ai/skills/05-database-prisma-skill.md` |
| Auth/RBAC/tenant/audit | `.ai/skills/06-security-rbac-skill.md` |
| Lint/typecheck/test/build | `.ai/skills/07-testing-validation-skill.md` |
| Docker/staging/ops | `.ai/skills/08-devops-ci-skill.md` |
| Docs/handover/runbook | `.ai/skills/09-documentation-skill.md` |
| Final PR/release review | `.ai/skills/10-pr-review-skill.md` |

### 2.3 Hard rules

- Jangan menambah fitur baru di luar MVP stabilization.
- Jangan melewati TypeScript/lint/test/build error.
- Jangan menghapus guard, permission, tenant scope, atau audit log demi membuat test hijau.
- Jangan commit secret, token, password, dump database, atau `.env` nyata.
- Semua endpoint admin harus tetap memakai auth guard dan permission yang eksplisit bila endpoint bersifat admin-wide.
- Semua data tenant harus difilter dengan tenant scope.
- Semua mutation/export/download sensitif harus dicatat di audit log.
- Semua input body/query/param harus divalidasi dengan DTO/schema.
- Semua perubahan status checklist docs harus didukung bukti test/validasi.

## 3. Baseline Validasi Saat Dokumen Ini Dibuat

Validasi lokal terakhir menunjukkan:

| Command | Status | Catatan |
|---|---|---|
| `pnpm install` | PASS | Lockfile up to date; pnpm memperingatkan ignored build scripts untuk `@scarf/scarf` dan `sharp`. |
| `pnpm lint` | PASS | Turborepo tasks sukses. |
| `pnpm typecheck` | PASS | Turborepo tasks sukses. |
| `pnpm test` | PASS | Integration smoke notification queue di-skip jika `REDIS_URL` tidak ada. |
| `pnpm build` | PASS | Next.js build sukses dengan warning ESLint plugin Next.js. |
| `pnpm prisma validate` | BLOCKED without env | Perlu `DATABASE_URL`. |
| `DATABASE_URL='postgresql://sidpro:sidpro@localhost:5432/sidpro?schema=public' pnpm prisma validate` | PASS | Schema valid. |
| `docker compose config` | BLOCKED | Docker tidak tersedia di environment audit terakhir. |
| `pnpm smoke` | BLOCKED | Perlu `STAGING_ADMIN_PASSWORD` non-default dan target staging/production yang berjalan. |

## 4. Severity dan Release Gate

### 4.1 P0 — Blocker absolut

Jangan release jika ada salah satu:

- Auth bypass.
- Cross-tenant data leak.
- Admin endpoint mutasi tanpa guard/permission.
- Secret/default credential di production.
- Build/typecheck/test utama gagal.
- Migration berisiko data loss tanpa rencana rollback.
- Smoke test core gagal di staging candidate.
- Backup/restore tidak bisa dilakukan untuk data production.

### 4.2 P1 — Wajib selesai sebelum data warga asli

- Tenant leakage test belum ada untuk modul core.
- Audit log export/download/mutation sensitif belum terbukti.
- File upload/download belum tervalidasi MIME/size/tenant/private access.
- Refresh token rotation/reuse detection belum teruji.
- Rate limit login/public endpoint belum final.
- Docker Compose production config belum tervalidasi di staging/server.
- Smoke test staging belum lulus.

### 4.3 P2 — Dapat ditunda dengan risk acceptance

- Bulk action UX.
- Saved filters.
- Advanced SLA visualization.
- Accessibility enhancement lanjutan.
- Monitoring dashboard advanced.

## 5. Roadmap Eksekusi Ringkas

| Phase | Fokus | Target PR |
|---|---|---|
| Phase 1 | Backend MVP DTO/test/security hardening | 2-4 PR kecil per modul |
| Phase 2 | UI Premium Ready completion | 1-3 PR halaman prioritas |
| Phase 3 | Production readiness and staging validation | 1-2 PR docs/ops/CI |
| Phase 4 | Security hardening final | 1-3 PR auth/rate limit/files |
| Phase 5 | Release evidence and handover | 1 PR docs release candidate |

Rekomendasi: jangan menggabungkan semua issue dalam satu PR besar. Buat PR kecil, mudah direview, dan masing-masing punya validasi jelas.

---

# Phase 1 — Backend MVP Hardening

## Issue 1.1 — Tutup gap DTO/schema endpoint population

### Problem

`population` masih memiliki endpoint dengan `Needs DTO` dan `Needs Test` pada backend matrix. Modul ini mengelola data penduduk, sehingga validasi dan tenant scope adalah P1 untuk go-live.

### Scope file utama

- `apps/api/src/modules/population/population.controller.ts`
- `apps/api/src/modules/population/population.service.ts`
- `apps/api/src/modules/population/**`
- `apps/api/test/**population**.test.ts`
- `packages/validators/src/**` bila schema bersama diperlukan
- `docs/BACKEND_ENTERPRISE_HARDENING_MATRIX.md`

### Implementasi yang diharapkan

1. Tambahkan schema/DTO untuk:
   - list query: `page`, `limit`, `search`, status/filter lain yang tersedia,
   - UUID param `id`,
   - create resident body,
   - update resident body,
   - mutate resident body,
   - import metadata/query bila ada,
   - export query bila ada.
2. Gunakan helper validasi konsisten seperti `parseWithZod` jika sudah menjadi pola API.
3. Pastikan create/update/mutate/delete tetap:
   - memakai permission `population.*`,
   - memanggil `requireTenant(user)` atau pola tenant scope setara,
   - mencatat audit log untuk mutation/import/export.
4. Hindari menyimpan NIK mentah di audit metadata; mask/sanitize metadata.

### Test wajib

- Invalid UUID param menghasilkan `VALIDATION_ERROR`.
- Query pagination invalid ditolak.
- Body create/update invalid ditolak.
- User tanpa permission ditolak.
- User tenant A tidak bisa membaca/mengubah resident tenant B.
- Export mencatat audit log.
- Delete/mutation mencatat audit log.

### Definition of Done

- Semua endpoint population di matrix dapat berpindah ke `OK` atau hanya menyisakan `Needs Test` jika ada alasan tertulis.
- `pnpm test` hijau.
- `pnpm lint`, `pnpm typecheck`, dan `pnpm build` hijau.

## Issue 1.2 — Tutup gap DTO/schema endpoint families

### Problem

`families` masih memiliki `Needs DTO` dan `Needs Test`. Modul ini menyimpan KK dan relasi anggota keluarga, sehingga termasuk protected data.

### Scope file utama

- `apps/api/src/modules/families/families.controller.ts`
- `apps/api/src/modules/families/families.service.ts`
- `apps/api/src/modules/families/**`
- `apps/api/test/**famil**.test.ts`
- `packages/validators/src/**` bila schema bersama diperlukan
- `docs/BACKEND_ENTERPRISE_HARDENING_MATRIX.md`

### Implementasi yang diharapkan

1. Tambahkan schema/DTO untuk:
   - list query,
   - UUID param family/member,
   - create family body,
   - update family body,
   - add member body,
   - remove member params,
   - export query.
2. Validasi nomor KK sesuai format yang dipakai validator existing.
3. Pastikan relasi member tidak bisa mengambil resident dari tenant lain.
4. Pastikan mutation dan export memiliki audit log.

### Test wajib

- Invalid KK ditolak.
- Invalid UUID family/member ditolak.
- Cross-tenant resident tidak bisa ditambahkan ke keluarga.
- Tenant A tidak bisa membaca/mengubah family tenant B.
- Export family mencatat audit log.
- Add/remove member mencatat audit log.

### Definition of Done

- Matrix families diperbarui sesuai hasil.
- Test tenant isolation families tersedia.
- Full validation hijau.

## Issue 1.3 — Tutup gap DTO/schema endpoint letters

### Problem

`letters` adalah core MVP untuk layanan surat, QR validation, tracking publik, dan generate PDF. Banyak endpoint masih `Needs DTO` / `Needs Test`.

### Scope file utama

- `apps/api/src/modules/letters/letters.controller.ts`
- `apps/api/src/modules/letters/letters.service.ts`
- `apps/api/src/modules/letters/**`
- `apps/api/test/**letter**.test.ts`
- `docs/BACKEND_ENTERPRISE_HARDENING_MATRIX.md`

### Implementasi yang diharapkan

1. Tambahkan schema/DTO untuk:
   - letter settings body,
   - letter type query/body,
   - letter template query/body/params,
   - letter request query/body/params,
   - verify/approve/reject body,
   - generate PDF params,
   - download params,
   - public QR param,
   - public tracking body/query.
2. Pastikan workflow status transition tidak bisa lompat invalid.
3. Pastikan public tracking tidak membocorkan tenant/internal fields.
4. Pastikan download/generate/approve/reject mencatat audit log.
5. Pastikan `ENABLE_PDF_WORKER=false` default tetap aman jika mode synchronous masih dipakai.

### Test wajib

- Invalid transition ditolak.
- Invalid QR code format ditolak sebelum query berat.
- Public tracking invalid ditolak.
- Tenant A tidak bisa membaca/generate/download surat tenant B.
- Approve/reject/verify/generate/download mencatat audit log.
- Generated PDF path/output tercatat sesuai desain saat storage tersedia atau dimock.

### Definition of Done

- Matrix letters diperbarui.
- Test public safety dan tenant isolation letters tersedia.
- Tidak ada regresi build.

## Issue 1.4 — Tutup gap DTO/schema endpoint complaints

### Problem

`complaints` berisi pengaduan publik/admin, upload bukti, tracking publik, assignment, response, close. Ini rentan abuse dan data leak jika validasi/rate limit/audit kurang kuat.

### Scope file utama

- `apps/api/src/modules/complaints/complaints.controller.ts`
- `apps/api/src/modules/complaints/complaints.service.ts`
- `apps/api/src/modules/complaints/**`
- `apps/api/test/**complaint**.test.ts`
- `docs/BACKEND_ENTERPRISE_HARDENING_MATRIX.md`

### Implementasi yang diharapkan

1. Tambahkan schema/DTO untuk:
   - public upload query/body metadata,
   - public track body,
   - admin list/export query,
   - create complaint body,
   - status body,
   - assign body,
   - response/respond body,
   - close body,
   - UUID params.
2. Pastikan public tracking menyembunyikan keberadaan data bila phone/ticket tidak cocok.
3. Pastikan upload bukti tenant-scoped via `tenantCode` dan file validation.
4. Pastikan status/assign/respond/close mencatat audit log.
5. Pastikan notification enqueue tidak membuat transaksi utama gagal jika worker/Redis unavailable, sesuai desain existing.

### Test wajib

- Invalid public track ticket ditolak.
- Public track tidak membocorkan internal reporter/assignee/tenant fields.
- Public upload dengan tenantCode invalid ditolak.
- Cross-tenant file ID ditolak.
- Tenant A tidak bisa membaca/mengubah complaint tenant B.
- Status/assign/respond/close audit log tercatat.

### Definition of Done

- Matrix complaints diperbarui.
- Test public safety dan tenant isolation lulus.
- Full validation hijau.

## Issue 1.5 — Hardening files dan audit logs

### Problem

Files dan audit logs adalah modul pendukung keamanan. Files harus menjaga akses dokumen sensitif; audit logs harus aman untuk query/detail dan tidak bocor antar tenant.

### Scope file utama

- `apps/api/src/core/files/files.controller.ts`
- `apps/api/src/core/files/files.service.ts`
- `apps/api/src/core/audit-logs/audit-logs.controller.ts`
- `apps/api/src/core/audit-logs/audit-logs.service.ts`
- `apps/api/src/core/audit-logs/audit-metadata.util.ts`
- `apps/api/test/**file**.test.ts`
- `apps/api/test/**audit**.test.ts`
- `docs/BACKEND_ENTERPRISE_HARDENING_MATRIX.md`

### Implementasi yang diharapkan

1. Tambahkan schema/DTO untuk file list, metadata create/update, UUID params, download params.
2. Pastikan upload memvalidasi MIME whitelist, magic bytes bila tersedia, size limit, owner ID, tenant scope.
3. Pastikan signed URL tidak membocorkan internal endpoint bila public base dikonfigurasi.
4. Pastikan audit logs list/detail tenant-scoped.
5. Pastikan audit metadata sanitizer menutup password/token/NIK/KK/data sensitif lain.

### Test wajib

- Invalid MIME/size/owner UUID ditolak.
- Tenant A tidak bisa download file tenant B.
- Download sensitif mencatat audit log.
- Audit log detail tenant B tidak bisa dibaca tenant A.
- Metadata sanitizer memask password/token/NIK/KK.

### Definition of Done

- Matrix files dan audit logs diperbarui.
- File tests dan audit tests lulus.

---

# Phase 2 — UI Premium Ready Completion

## Issue 2.1 — Dashboard admin menjadi `Premium Ready`

### Problem

Dashboard masih tercatat `Needs Empty/Error State`. Dashboard adalah landing page admin dan harus terasa enterprise-ready.

### Scope file utama

- `apps/web/src/app/(admin)/admin/dashboard/page.tsx`
- `apps/web/src/components/enterprise/**`
- `apps/web/src/features/**dashboard**` bila ada
- `docs/UI_ENTERPRISE_HARDENING_CHECKLIST.md`

### Implementasi yang diharapkan

1. Pastikan `PageHeader` dan breadcrumb tersedia.
2. Tambahkan loading skeleton untuk semua widget async.
3. Tambahkan error state dengan retry action.
4. Tambahkan empty state untuk data statistik/aktivitas kosong.
5. Pastikan responsive mobile-first.
6. Hindari fallback demo di production kecuali dikontrol env eksplisit.

### Test/validasi wajib

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Manual review visual atau screenshot bila environment web tersedia.

### Definition of Done

- Dashboard di `docs/UI_ENTERPRISE_HARDENING_CHECKLIST.md` berpindah ke `Premium Ready` dengan catatan evidence.

## Issue 2.2 — Roles page menjadi `Premium Ready`

### Problem

Roles masih `Needs Form UX`. Permission editor perlu grouping/search agar operator tidak salah memberi akses.

### Scope file utama

- `apps/web/src/app/(admin)/admin/roles/page.tsx`
- `apps/web/src/features/roles/**` bila ada
- `apps/web/src/components/enterprise/**`
- `docs/UI_ENTERPRISE_HARDENING_CHECKLIST.md`

### Implementasi yang diharapkan

1. Tambahkan search permission.
2. Group permission berdasarkan domain/module.
3. Tambahkan select-all per group.
4. Tambahkan empty/error/loading state untuk permission list.
5. Tambahkan disabled/pending state saat save.
6. Gunakan confirmation untuk destructive action.
7. Tampilkan jumlah permission terpilih.

### Test/validasi wajib

- Form create/edit role tetap type-safe.
- Permission assignment tidak mengirim payload kosong/invalid.
- UI tetap usable pada mobile.
- Full validation hijau.

### Definition of Done

- Roles page menjadi `Premium Ready` di UI checklist.

## Issue 2.3 — Pengaturan Surat menjadi `Premium Ready`

### Problem

Pengaturan Surat masih `Needs Data Table`. Modul surat adalah core MVP, sehingga settings/template management harus rapi.

### Scope file utama

- `apps/web/src/app/(admin)/admin/surat/pengaturan/page.tsx`
- `apps/web/src/features/letters/**`
- `apps/web/src/components/enterprise/data-table.tsx`
- `docs/UI_ENTERPRISE_HARDENING_CHECKLIST.md`

### Implementasi yang diharapkan

1. Tambahkan `PageHeader` dan breadcrumb `Admin → Surat → Pengaturan`.
2. Gunakan enterprise `DataTable` untuk template/type/settings list.
3. Tambahkan row action edit/detail.
4. Gunakan drawer/modal untuk form settings/template.
5. Tambahkan loading/error/empty state.
6. Tambahkan filter/search jika data list cukup banyak.

### Test/validasi wajib

- `pnpm build` menghasilkan route `/admin/surat/pengaturan` tanpa error.
- Form settings/template tidak mengirim data invalid.
- UI checklist diperbarui.

## Issue 2.4 — Masking NIK/KK dan UX export data warga

### Problem

NIK/KK adalah protected data. UI data warga harus memastikan masking default dan export disertai konfirmasi/audit-safe copy.

### Scope file utama

- `apps/web/src/app/(admin)/admin/penduduk/page.tsx`
- `apps/web/src/app/(admin)/admin/keluarga/page.tsx`
- `apps/web/src/features/residents/**`
- `apps/web/src/features/families/**`
- `docs/UI_ENTERPRISE_HARDENING_CHECKLIST.md`
- `docs/SECURITY.md`

### Implementasi yang diharapkan

1. Mask NIK/KK pada table default.
2. Full NIK/KK hanya muncul di detail drawer jika permission/policy mengizinkan.
3. Export action memakai confirmation yang menjelaskan audit log dan sensitivitas data.
4. Tambahkan label/copy bahwa data warga dilindungi.
5. Pastikan search tidak menampilkan full identifier secara tidak sengaja.

### Test/validasi wajib

- Snapshot/manual check table tidak menampilkan NIK/KK mentah.
- Build hijau.
- Dokumentasi security diperbarui.

---

# Phase 3 — Production Readiness dan Staging Validation

## Issue 3.1 — Validasi Docker Compose production di staging/server

### Problem

Audit terakhir tidak bisa menjalankan Docker karena binary `docker` tidak tersedia. Validasi ini wajib dilakukan di staging/server.

### Scope file utama

- `docker-compose.prod.yml`
- `docker-compose.yml`
- `docker/nginx/default.conf`
- `.env.production.example`
- `docs/DOCKER_PRODUCTION.md`
- `docs/OPERATIONS.md`
- `docs/PRODUCTION_READINESS.md`

### Langkah validasi

1. Siapkan `.env.production` atau `.env.staging` dengan secret kuat.
2. Jalankan:

```bash
docker compose -f docker-compose.prod.yml config
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

3. Verifikasi routing:

```bash
curl -f http://localhost/api/v1/health
curl -f http://localhost/
```

4. Cek log:

```bash
docker compose -f docker-compose.prod.yml logs --tail=200 api
docker compose -f docker-compose.prod.yml logs --tail=200 web
docker compose -f docker-compose.prod.yml logs --tail=200 worker
```

### Definition of Done

- Compose config lulus.
- Semua service utama healthy/running.
- Healthcheck API dan web lulus.
- Hasil dicatat di docs release evidence.

## Issue 3.2 — Smoke test staging candidate

### Problem

Smoke test membutuhkan credential admin non-default dan target aplikasi berjalan. Ini gate go-live.

### Scope file utama

- `scripts/smoke-test.sh`
- `docs/OPERATIONS.md`
- `docs/DOCKER_PRODUCTION.md`
- `docs/PRODUCTION_READINESS.md`
- `docs/CLIENT_HANDOVER_READINESS.md`

### Langkah validasi

1. Pastikan staging stack berjalan.
2. Pastikan admin non-default tersedia.
3. Jalankan:

```bash
STAGING_ADMIN_EMAIL='<admin-email>' \
STAGING_ADMIN_PASSWORD='<admin-password>' \
SMOKE_RUN_SEED=0 \
pnpm smoke
```

4. Jika web belum tersedia:

```bash
STAGING_ADMIN_PASSWORD='<admin-password>' SMOKE_RUN_SEED=0 SMOKE_SKIP_WEB=1 pnpm smoke
```

### Definition of Done

- Smoke test full lulus.
- Jika gagal, bugfix dibuat sebelum release.
- Hasil smoke dicatat dengan tanggal, commit, env, dan ringkasan output.

## Issue 3.3 — Backup/restore drill

### Problem

Backup/restore masih `In Progress`. Sebelum data warga asli, restore harus terbukti.

### Scope file utama

- `scripts/backup-db.sh`
- `scripts/restore-db.sh`
- `scripts/restore.sh`
- `docs/OPERATIONS.md`
- `docs/PRODUCTION_READINESS.md`

### Langkah validasi

1. Jalankan backup database staging.
2. Simpan checksum.
3. Restore ke environment restore-test atau database staging baru.
4. Jalankan healthcheck dan smoke test setelah restore.
5. Catat durasi backup/restore dan hasil verifikasi.

### Definition of Done

- Backup berhasil.
- Restore berhasil.
- Smoke setelah restore lulus.
- Runbook diperbarui bila ada langkah yang berubah.

## Issue 3.4 — Monitoring dan healthcheck baseline

### Problem

Monitoring healthcheck masih `In Progress`.

### Scope file utama

- `docs/MONITORING.md`
- `docs/OPERATIONS.md`
- `docker-compose.prod.yml`
- `docker/nginx/default.conf`

### Implementasi/validasi yang diharapkan

1. Pastikan healthcheck untuk:
   - API,
   - web,
   - worker,
   - PostgreSQL,
   - Redis,
   - MinIO.
2. Tambahkan instruksi log review.
3. Tambahkan alert baseline:
   - API down,
   - DB down,
   - Redis down,
   - disk usage tinggi,
   - backup gagal,
   - queue error.
4. Dokumentasikan command verifikasi.

### Definition of Done

- Operator bisa mendeteksi layanan down tanpa membaca source code.
- Docs monitoring/runbook cukup untuk first responder.

---

# Phase 4 — Security Hardening Final

## Issue 4.1 — Rate limit endpoint publik dan login

### Problem

Rate limit endpoint publik masih `In Progress`. Endpoint publik harus tahan abuse.

### Scope file utama

- `apps/api/src/core/auth/auth.controller.ts`
- `apps/api/src/modules/complaints/complaints.controller.ts`
- `apps/api/src/modules/letters/letters.controller.ts`
- `apps/api/src/modules/assistant/**` bila endpoint publik aktif
- `docs/SECURITY.md`
- `docs/PRODUCTION_READINESS.md`

### Implementasi yang diharapkan

1. Pastikan throttle/rate limit aktif untuk:
   - login,
   - public complaint submit/upload/track,
   - public letter tracking,
   - QR verification,
   - assistant public ask jika aktif.
2. Gunakan konfigurasi env bila limit harus berbeda antara dev/staging/prod.
3. Tambahkan test atau minimal config validation untuk rate limit.
4. Dokumentasikan policy di `docs/SECURITY.md`.

### Definition of Done

- Rate limit terpasang di endpoint publik penting.
- Docs menjelaskan threshold dan override config.

## Issue 4.2 — Refresh token rotation dan reuse detection

### Problem

Refresh token rotation masih perlu test end-to-end login-refresh-logout dan reuse detection.

### Scope file utama

- `apps/api/src/core/auth/**`
- `apps/api/test/**auth**.test.ts`
- `docs/SECURITY.md`
- `docs/PRODUCTION_READINESS.md`

### Test wajib

1. Login menghasilkan access token dan refresh token.
2. Refresh valid menghasilkan refresh token baru.
3. Refresh token lama tidak bisa dipakai ulang.
4. Logout mencabut refresh token aktif.
5. Reuse token lama menghasilkan error aman dan/atau security event.
6. Response tidak membocorkan detail internal.

### Definition of Done

- Test refresh token rotation lulus.
- Production readiness dapat dipindahkan ke `Done` untuk item ini bila implementasi sudah sesuai.

## Issue 4.3 — File upload/download security final

### Problem

File upload validation masih `In Progress`. Upload bukti pengaduan/dokumen surat dapat berisi data sensitif.

### Scope file utama

- `apps/api/src/core/files/**`
- `apps/api/src/modules/complaints/**`
- `apps/api/src/modules/letters/**`
- `apps/api/test/**file**.test.ts`
- `docs/SECURITY.md`

### Implementasi yang diharapkan

1. MIME whitelist.
2. Magic byte validation untuk tipe file utama.
3. Max size per kategori file.
4. Tenant-bound file ownership.
5. Signed URL private access.
6. Audit log download/upload file sensitif.
7. Cross-tenant file ID ditolak pada complaint/letter/resident.

### Definition of Done

- Test cross-tenant file access lulus.
- Upload invalid ditolak.
- Download sensitif tercatat.

---

# Phase 5 — Release Evidence dan Client Handover

## Issue 5.1 — Buat release candidate evidence pack

### Problem

Client handover membutuhkan bukti validasi yang dapat direview, bukan hanya status docs.

### Scope file yang disarankan

- `docs/RELEASE_CANDIDATE_CHECKLIST.md` atau `docs/RELEASE_EVIDENCE.md`
- `docs/CLIENT_HANDOVER_READINESS.md`
- `docs/PRODUCTION_READINESS.md`

### Isi minimum evidence pack

1. Commit/tag release candidate.
2. Tanggal validasi.
3. Environment validasi.
4. Command dan hasil:
   - `pnpm install`,
   - `pnpm lint`,
   - `pnpm typecheck`,
   - `pnpm test`,
   - `pnpm build`,
   - `pnpm prisma validate`,
   - `docker compose -f docker-compose.prod.yml config`,
   - `docker compose -f docker-compose.prod.yml up -d --build`,
   - `pnpm smoke`.
5. Hasil backup/restore drill.
6. Hasil security review P0/P1/P2.
7. Known limitations.
8. Client configuration required.
9. Rollback plan.
10. Risk acceptance bila ada.

### Definition of Done

- Evidence pack tidak berisi secret/data warga asli.
- Semua hasil validasi memiliki tanggal dan commit.
- Client handover docs link ke evidence pack.

## Issue 5.2 — Final release review dan no-go/go decision

### Problem

Release hanya boleh dilakukan jika P0/P1 tertutup atau mendapat risk acceptance yang valid dan tidak menyangkut data leak/auth bypass.

### Checklist final

1. Backend matrix MVP tidak punya gap P0/P1.
2. UI checklist halaman prioritas MVP `Premium Ready`.
3. Production readiness critical items `Done` atau risk accepted.
4. Docker Compose validation lulus.
5. Smoke test staging lulus.
6. Backup/restore drill lulus.
7. Security checklist tidak punya P1 terbuka.
8. Codex review P1/P2 ditangani.
9. CI hijau.
10. Rollback plan siap.

### Definition of Done

- Keputusan final tertulis:
  - `GO`, atau
  - `NO-GO` dengan daftar blocker.

---

# 6. Saran Urutan PR

## PR 1 — Backend validation foundation for MVP modules

- Population DTO/schema.
- Families DTO/schema.
- Shared param/query schema bila perlu.
- Tests validasi dasar.

## PR 2 — Backend tenant isolation and audit tests

- Population/families tenant leakage tests.
- Letters/complaints tenant leakage tests.
- Audit log test mutation/export/download.

## PR 3 — Letters and complaints workflow hardening

- Letters workflow validation.
- Complaints status/assign/respond validation.
- Public tracking safety tests.

## PR 4 — Files/security hardening

- Upload/download validation.
- Cross-tenant file access tests.
- Signed URL/audit log verification.

## PR 5 — UI Premium Ready completion

- Dashboard.
- Roles.
- Pengaturan Surat.
- Masking/export UX data warga.

## PR 6 — Production/staging ops validation docs

- Evidence pack template.
- Docker validation result placeholder.
- Smoke test result section.
- Backup/restore drill section.

## PR 7 — Final release candidate update

- Update all checklist statuses backed by evidence.
- Record final known limitations.
- Record go/no-go decision.

---

# 7. Command Validasi Standar

Jalankan setelah setiap PR code:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
DATABASE_URL='postgresql://sidpro:sidpro@localhost:5432/sidpro?schema=public' pnpm prisma validate
```

Jika Docker tersedia:

```bash
docker compose config
docker compose -f docker-compose.prod.yml config
```

Untuk staging candidate:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
curl -f http://localhost/api/v1/health
curl -f http://localhost/
STAGING_ADMIN_EMAIL='<admin-email>' STAGING_ADMIN_PASSWORD='<admin-password>' SMOKE_RUN_SEED=0 pnpm smoke
```

---

# 8. Template Laporan PR untuk AI Berikutnya

Gunakan format berikut pada setiap PR:

```md
## Summary

## Changes

## Validation

## Security Notes

## Tenant Scope Notes

## Audit Log Notes

## Risk

## Rollback Plan

## Follow-up
```

## 9. Release Recommendation Saat Ini

Status saat dokumen ini dibuat: **NO-GO untuk production/client data asli**.

Alasan:

- Backend matrix masih memiliki banyak `Needs DTO` / `Needs Test` untuk modul MVP.
- UI checklist masih memiliki Dashboard, Roles, dan Pengaturan Surat yang belum `Premium Ready`.
- Docker Compose production validation belum dijalankan di environment yang memiliki Docker.
- Smoke test staging/production candidate belum lulus karena belum ada environment dan credential admin non-default.
- Backup/restore drill belum dibuktikan.
- Production readiness masih memiliki beberapa item `In Progress`.

Release dapat dipertimbangkan ulang setelah Phase 1 sampai Phase 5 selesai dan semua evidence tercatat.
