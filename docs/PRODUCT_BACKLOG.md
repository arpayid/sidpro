# SIDPRO Product Backlog

Backlog ini memecah blueprint menjadi epic, user story, dan acceptance criteria.

## Phase 0: Foundation

### Epic: Monorepo Foundation

User story: sebagai developer, saya ingin struktur monorepo agar web, API, worker, shared package, dan docs rapi.

Acceptance criteria:

- Struktur apps dan packages tersedia.
- Package manager dan workspace tersedia.
- Script lint, typecheck, test, build tersedia.
- Dokumentasi setup tersedia.

### Epic: Docker Foundation

Acceptance criteria:

- PostgreSQL service tersedia.
- Redis service tersedia.
- API dan web siap dikonfigurasi.
- File environment example tersedia.

## Phase 1: Core Platform

### Epic: Auth

Acceptance criteria:

- User bisa login.
- Session bisa dibaca.
- Logout tersedia.
- Endpoint protected memakai guard.

### Epic: RBAC

Acceptance criteria:

- Role dan permission tersedia.
- User dapat memiliki role.
- Endpoint protected memeriksa permission.
- Seed permission awal tersedia.

### Epic: Tenant and Village Profile

Acceptance criteria:

- Tenant dapat dibuat.
- Profil desa dapat disimpan.
- Data desa ditampilkan di portal publik.
- Admin hanya mengubah tenant miliknya.

## Phase 2: Public Portal

Acceptance criteria:

- Homepage tersedia.
- Profil desa tersedia.
- Berita dan agenda tersedia.
- Layanan publik tersedia.
- Pengaduan publik tersedia.
- Transparansi publik tersedia.

## Phase 3: Population and Families

### Epic: Residents

Acceptance criteria:

- Operator dapat melihat daftar penduduk.
- Operator dapat membuat penduduk.
- Operator dapat mengubah penduduk.
- Validasi NIK dan data wajib berjalan.
- Perubahan penting tercatat di audit log.

### Epic: Families

Acceptance criteria:

- Operator dapat membuat KK.
- Operator dapat menambah anggota keluarga.
- Kepala keluarga dapat ditentukan.
- Validasi nomor KK berjalan.

## Phase 4: Letters

Acceptance criteria:

- Jenis surat dapat dikelola.
- Template surat dapat dikelola.
- Warga/operator dapat membuat permohonan.
- Verifikasi dan approval tersedia.
- Nomor surat otomatis.
- PDF dapat dibuat.
- QR validation tersedia.

## Phase 5: Complaints

Acceptance criteria:

- Warga dapat membuat pengaduan.
- Admin dapat memverifikasi.
- Admin dapat menugaskan penanganan.
- Admin dapat memberi tanggapan.
- Status pengaduan dapat dilacak.

## Phase 6: Enterprise Modules

- Bantuan sosial.
- Aset desa.
- Pembangunan desa.
- Keuangan dan transparansi.
- GIS.
- BUMDes.
- Advanced reports.

## Phase 7: Hardening

- 2FA.
- Monitoring.
- Backup restore.
- Security scan.
- Performance tuning.
- Multi-tenant dashboard.

## AI CLI Task Rule

Setiap task harus memiliki:

- goal
- affected modules
- database changes
- API changes
- UI changes
- security impact
- validation commands
- definition of done
