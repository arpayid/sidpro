# AI CLI Working Guide for SIDPRO

Repositori ini adalah basis pengembangan **SID Premium Enterprise**.

Dokumen acuan utama:

```txt
docs/SID_ENTERPRISE_BLUEPRINT.md
```

AI CLI, coding agent, atau automation agent yang bekerja di repositori ini wajib membaca dan mengikuti dokumen tersebut sebelum melakukan implementasi besar.

---

## Product Direction

SIDPRO adalah Sistem Informasi Desa premium enterprise. Targetnya bukan hanya website desa, tetapi platform pemerintahan desa modern untuk:

- Portal publik desa.
- Dashboard admin desa.
- Data penduduk.
- Data keluarga / KK.
- Layanan surat online.
- Pengaduan masyarakat.
- Bantuan sosial.
- Pembangunan desa.
- Aset desa.
- Keuangan dan transparansi.
- Arsip dokumen.
- CMS berita, agenda, galeri.
- GIS/peta desa.
- Multi-role, audit log, dan multi-tenant-ready architecture.

---

## Preferred Architecture

Gunakan pendekatan:

```txt
Modular Monolith Enterprise-Ready
```

Stack target:

```txt
Frontend     : Next.js 15 + React 19 + TypeScript + TailwindCSS + shadcn/ui
Backend      : NestJS 11 + TypeScript + Prisma
Database     : PostgreSQL 17
Cache/Queue  : Redis + BullMQ
Storage      : MinIO / S3-compatible
Deployment   : Docker Compose + Nginx
CI/CD        : GitHub Actions
```

---

## Required Work Protocol

Setiap pekerjaan harus mengikuti alur:

```txt
AUDIT
→ PLAN
→ IMPLEMENT
→ VALIDATE
→ TEST
→ PR
→ CI HIJAU
→ MERGE
→ DEPLOY
```

Penjelasan:

1. **AUDIT**  
   Pahami struktur repo, dokumen, dependency, modul terkait, dan potensi dampak perubahan.

2. **PLAN**  
   Buat rencana implementasi singkat sebelum mengubah kode. Pecah tugas menjadi langkah kecil.

3. **IMPLEMENT**  
   Implementasi harus modular, typed, dan mengikuti struktur proyek.

4. **VALIDATE**  
   Pastikan validasi input, permission, tenant scope, dan audit log diterapkan sesuai kebutuhan.

5. **TEST**  
   Jalankan lint, typecheck, test, build, dan validasi Prisma sesuai kondisi repo.

6. **PR**  
   Buat PR dengan deskripsi jelas: tujuan, perubahan, validasi, risiko.

7. **CI HIJAU**  
   Jangan merge jika CI gagal.

8. **MERGE**  
   Merge hanya setelah validasi selesai.

9. **DEPLOY**  
   Deploy setelah branch utama stabil.

---

## Implementation Rules

- Jangan membuat fitur baru tanpa mengaitkan ke roadmap di `docs/SID_ENTERPRISE_BLUEPRINT.md`.
- Prioritaskan MVP: Auth, RBAC, profil desa, portal publik, penduduk, keluarga, surat, QR validation, pengaduan, dashboard, audit log, backup.
- Semua modul harus modular dan mudah diuji.
- Semua endpoint admin wajib memakai authorization guard.
- Semua data tenant wajib difilter berdasarkan `tenant_id` bila multi-tenant aktif.
- Semua mutation penting wajib mencatat audit log.
- Semua input wajib divalidasi dengan DTO/schema.
- Jangan menyimpan secret/API key di repo.
- Jangan bypass TypeScript error.
- Jangan mengabaikan error build.
- Jangan membuat integrasi eksternal resmi tanpa adapter dan konfigurasi yang eksplisit.

---

## Security Rules

Data warga adalah data sensitif. Perlakukan NIK, KK, alamat, dokumen, status keluarga, dan status bantuan sebagai protected data.

Wajib diperhatikan:

- RBAC + permission.
- Audit log.
- Data masking untuk NIK/KK bila ditampilkan di UI tertentu.
- Rate limit untuk login dan endpoint publik penting.
- Refresh token rotation.
- 2FA untuk admin pada fase enterprise hardening.
- File upload validation.
- Export data sensitif harus tercatat.
- Soft delete untuk data penting.

---

## UI/UX Rules

Arah UI:

```txt
Modern SaaS dashboard
Clean enterprise
Mobile-first
Operator-friendly
Tidak seperti template pemerintah lama
```

Komponen utama:

- Sidebar admin.
- Topbar.
- Breadcrumb.
- Global search.
- Stat card.
- Data table enterprise.
- Advanced filter.
- Bulk action.
- Export action.
- Drawer detail.
- Modal form.
- Timeline activity.
- Approval stepper.
- Empty/loading/error state.

Tema warna yang direkomendasikan:

```txt
Emerald Government
Blue Civic Enterprise
Nusantara Premium
```

---

## Validation Commands

Gunakan command yang tersedia di repo. Target minimal:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma validate
```

Jika Docker tersedia:

```bash
docker compose up -d --build
docker compose ps
```

Jika command belum tersedia karena project masih kosong, agent harus membuat foundation terlebih dahulu dan menjelaskan command validasi baru di README/PR.

---

## Definition of Done

Fitur dianggap selesai jika:

- API tersedia bila diperlukan.
- UI tersedia bila diperlukan.
- Validasi input ada.
- Permission diterapkan.
- Audit log diterapkan untuk mutation penting.
- Tenant scope diterapkan bila relevan.
- Build/typecheck/lint tidak gagal.
- Test atau validasi manual terdokumentasi.
- Dokumentasi singkat ditambahkan bila fitur besar.

---

## First Development Priority

Urutan kerja awal:

1. Setup monorepo.
2. Setup Next.js web app.
3. Setup NestJS API.
4. Setup PostgreSQL, Redis, Prisma, Docker Compose.
5. Setup auth foundation.
6. Setup RBAC/permission.
7. Setup tenant/village profile.
8. Setup dashboard shell.
9. Setup portal publik.
10. Setup modul penduduk dan keluarga.
11. Setup modul layanan surat.
12. Setup pengaduan.
13. Setup audit log dan backup.

Jangan lompat ke fitur AI, GIS kompleks, atau integrasi eksternal sebelum core MVP stabil.
