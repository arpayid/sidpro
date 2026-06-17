# SID Premium Enterprise Blueprint

Dokumen ini adalah acuan utama perencanaan produk **SID Premium Enterprise** untuk repositori `sidpro`.

SID = Sistem Informasi Desa. Target produk bukan sekadar website desa, tetapi platform operasional desa modern untuk portal publik, administrasi warga, pelayanan surat, data penduduk, pengaduan, bantuan sosial, pembangunan, aset, transparansi, pelaporan, dan dashboard pimpinan.

---

## 1. Visi Produk

Nama produk kerja: **SID Premium Enterprise**.

Tujuan utama:

1. Menjadi pusat data dan layanan digital pemerintahan desa.
2. Mengelola data penduduk, keluarga, wilayah, surat, pengaduan, bantuan, pembangunan, aset, dokumen, dan laporan.
3. Memberikan portal publik desa yang modern, informatif, dan mobile-friendly.
4. Menyediakan dashboard pimpinan untuk kepala desa, sekretaris desa, perangkat desa, dan admin kabupaten apabila multi-desa diaktifkan.
5. Menjadi produk enterprise yang siap dikembangkan sebagai single-desa, multi-tenant, atau platform kabupaten.
6. Aman untuk data pribadi warga seperti NIK, KK, alamat, data keluarga, status bantuan, dan dokumen administratif.

Prinsip produk:

- Modern.
- Aman.
- Modular.
- Audit-ready.
- Multi-role.
- Multi-tenant-ready.
- Mudah dipakai operator desa.
- Siap CI/CD dan dikerjakan oleh AI CLI secara bertahap.

---

## 2. Model Arsitektur

Gunakan pendekatan:

```txt
Modular Monolith Enterprise-Ready
```

Alasan:

- Lebih cepat dibangun daripada microservices.
- Lebih mudah diaudit dan dites.
- Cocok untuk deploy awal di VPS.
- Cocok untuk tim kecil sampai menengah.
- Tetap dapat dipecah menjadi service terpisah nanti jika skala sudah besar.

Varian produk:

| Varian | Target |
|---|---|
| SID Single Desa | Satu instalasi untuk satu desa |
| SID Multi-Tenant | Satu aplikasi untuk banyak desa |
| SID Enterprise Kabupaten | Dashboard kabupaten untuk memantau banyak desa |

Implementasi awal boleh single desa, tetapi struktur data dan authorization harus `tenant_id`-ready sejak awal.

---

## 3. Rekomendasi Tech Stack

### Frontend

| Kebutuhan | Teknologi |
|---|---|
| Web app | Next.js 15 App Router |
| UI runtime | React 19 |
| Bahasa | TypeScript |
| Styling | TailwindCSS |
| Component system | shadcn/ui |
| Icon | Lucide React |
| Form | React Hook Form + Zod |
| Table | TanStack Table |
| Data fetching | TanStack Query |
| State ringan | Zustand |
| Chart | Recharts / Tremor |
| Map/GIS | Leaflet / MapLibre |
| PWA | Next PWA |

### Backend

| Kebutuhan | Teknologi |
|---|---|
| API | NestJS 11 |
| Bahasa | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 17 |
| Cache | Redis |
| Queue | BullMQ |
| Auth | JWT access token + refresh token rotation |
| Authorization | RBAC + permission |
| File storage | MinIO / S3-compatible |
| API docs | OpenAPI / Swagger |
| Realtime | WebSocket / SSE bila dibutuhkan |

### Infrastruktur

| Kebutuhan | Teknologi |
|---|---|
| Container | Docker Compose |
| Reverse proxy | Nginx / Traefik |
| Database | PostgreSQL |
| Cache/queue | Redis |
| Object storage | MinIO |
| Monitoring | Prometheus + Grafana |
| Logging | Loki / OpenTelemetry |
| CI/CD | GitHub Actions |
| Backup | pg_dump/pgBackRest + encrypted object storage |

---

## 4. Struktur Monorepo

Target struktur:

```txt
sidpro/
├── apps/
│   ├── api/                 # NestJS backend
│   ├── web/                 # Next.js frontend
│   └── worker/              # BullMQ worker/background jobs
│
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── config/              # ESLint, TypeScript, Tailwind config
│   ├── types/               # Shared TypeScript types
│   ├── validators/          # Shared Zod schemas
│   └── sdk/                 # Typed API client SDK
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│
├── docker/
│   ├── nginx/
│   ├── postgres/
│   └── redis/
│
├── docs/
│   ├── SID_ENTERPRISE_BLUEPRINT.md
│   ├── ARCHITECTURE.md
│   ├── MODULES.md
│   ├── DATABASE.md
│   ├── API_CONTRACT.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
│
├── scripts/
│   ├── backup.sh
│   ├── restore.sh
│   └── healthcheck.sh
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
├── AGENTS.md
└── README.md
```

---

## 5. Struktur Backend NestJS

```txt
apps/api/src/
├── main.ts
├── app.module.ts
├── config/
│   ├── env.validation.ts
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── storage.config.ts
│
├── common/
│   ├── decorators/
│   ├── guards/
│   ├── filters/
│   ├── interceptors/
│   ├── pipes/
│   ├── dto/
│   └── utils/
│
├── core/
│   ├── auth/
│   ├── users/
│   ├── roles/
│   ├── permissions/
│   ├── tenants/
│   ├── audit-logs/
│   ├── notifications/
│   ├── files/
│   └── settings/
│
├── modules/
│   ├── village-profile/
│   ├── population/
│   ├── family-card/
│   ├── civil-events/
│   ├── letters/
│   ├── public-services/
│   ├── social-assistance/
│   ├── development-planning/
│   ├── finance/
│   ├── assets/
│   ├── inventory/
│   ├── bumdes/
│   ├── complaints/
│   ├── news/
│   ├── agenda/
│   ├── gallery/
│   ├── documents/
│   ├── maps/
│   └── reports/
│
├── jobs/
│   ├── queues/
│   ├── processors/
│   └── schedulers/
│
└── database/
    ├── prisma.service.ts
    └── transaction.service.ts
```

Backend rules:

- Controller harus tipis.
- Business logic berada di service.
- Query kompleks boleh dipisah ke repository/query service.
- Semua mutation penting wajib mencatat audit log.
- Semua endpoint wajib memiliki authorization guard.
- Semua data tenant wajib difilter berdasarkan `tenant_id`.
- Delete data penting gunakan soft delete dan approval bila perlu.
- Semua file upload wajib validasi MIME, size, dan permission.

---

## 6. Struktur Frontend Next.js

```txt
apps/web/src/
├── app/
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── profil-desa/
│   │   ├── berita/
│   │   ├── agenda/
│   │   ├── layanan/
│   │   ├── pengaduan/
│   │   └── transparansi/
│   │
│   ├── (auth)/
│   │   ├── login/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   │
│   ├── (admin)/
│   │   ├── dashboard/
│   │   ├── penduduk/
│   │   ├── keluarga/
│   │   ├── surat/
│   │   ├── layanan/
│   │   ├── keuangan/
│   │   ├── aset/
│   │   ├── bantuan-sosial/
│   │   ├── pembangunan/
│   │   ├── pengaduan/
│   │   ├── laporan/
│   │   └── pengaturan/
│   │
│   └── api/
│
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── forms/
│   ├── tables/
│   ├── charts/
│   ├── maps/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── population/
│   ├── letters/
│   ├── finance/
│   ├── assets/
│   └── reports/
│
├── lib/
│   ├── api.ts
│   ├── auth.ts
│   ├── permissions.ts
│   └── utils.ts
│
└── hooks/
```

Frontend rules:

- Semua halaman admin wajib responsive.
- Data table wajib mendukung search, filter, pagination, sorting, export, dan bulk action bila relevan.
- Form wajib memakai schema validation.
- Komponen reusable diletakkan di `components/` atau `packages/ui`.
- Feature-specific logic diletakkan di `features/`.
- Jangan campur business logic berat di komponen presentasional.

---

## 7. Modul Produk

### 7.1 Portal Publik Desa

Fitur:

- Homepage desa modern.
- Profil desa.
- Visi misi.
- Struktur pemerintahan desa.
- Perangkat desa.
- Wilayah dusun/RT/RW.
- Berita desa.
- Agenda desa.
- Galeri foto/video.
- Potensi desa.
- Produk UMKM.
- BUMDes.
- Transparansi APBDes.
- Statistik penduduk publik.
- Layanan surat online.
- Form pengaduan.
- Download dokumen publik.

### 7.2 Dashboard Admin Enterprise

Fitur:

- Total penduduk.
- Total KK.
- Statistik gender.
- Statistik usia.
- Statistik wilayah.
- Surat masuk/proses/selesai.
- Bantuan sosial aktif.
- Pengaduan aktif.
- Ringkasan APBDes.
- Agenda pembangunan.
- Aktivitas terbaru.
- Notifikasi tugas.
- Dashboard pimpinan untuk KPI pelayanan.

### 7.3 Manajemen Penduduk

Fitur:

- Data penduduk.
- Data keluarga.
- Kartu keluarga.
- Riwayat alamat.
- Status kawin.
- Agama.
- Pendidikan.
- Pekerjaan.
- Golongan darah.
- Disabilitas.
- Status domisili.
- Penduduk datang.
- Penduduk pindah.
- Kelahiran.
- Kematian.
- Penduduk sementara.
- Import Excel.
- Export Excel/PDF.
- Validasi NIK/KK lokal.
- Deteksi data duplikat.

### 7.4 Manajemen Keluarga / KK

Fitur:

- Data kepala keluarga.
- Anggota keluarga.
- Hubungan keluarga.
- Alamat keluarga.
- Status ekonomi keluarga.
- Kategori miskin/rentan.
- Kepemilikan rumah.
- Sumber air.
- Sanitasi.
- Listrik.
- Aset keluarga.
- Riwayat perubahan KK.

### 7.5 Layanan Surat Online

Jenis surat awal:

- Surat keterangan domisili.
- Surat keterangan usaha.
- Surat pengantar SKCK.
- Surat keterangan tidak mampu.
- Surat keterangan kelahiran.
- Surat keterangan kematian.
- Surat pindah.
- Surat datang.
- Surat keterangan belum menikah.
- Surat keterangan ahli waris.
- Surat pengantar nikah.
- Surat izin keramaian.
- Surat keterangan penghasilan.
- Surat custom berbasis template dinamis.

Fitur enterprise:

- Template surat dinamis.
- Nomor surat otomatis.
- Workflow verifikasi.
- Tanda tangan pejabat.
- QR Code validasi dokumen.
- Arsip surat.
- Riwayat revisi.
- Cetak PDF.
- Tracking status oleh warga.
- SLA pelayanan.
- Notifikasi WhatsApp/email.
- Permission per jenis surat.

Workflow:

```txt
Warga ajukan surat
→ Operator cek berkas
→ Kasi/Kaur verifikasi
→ Sekdes validasi
→ Kepala Desa tanda tangan
→ Surat terbit PDF + QR Code
→ Warga download atau ambil di kantor desa
```

### 7.6 Modul Keuangan Desa

Fitur:

- APBDes.
- Pendapatan.
- Belanja.
- Pembiayaan.
- Rencana anggaran.
- Realisasi anggaran.
- Buku kas umum.
- Buku pembantu bank.
- Buku pembantu pajak.
- Laporan realisasi.
- Transparansi APBDes publik.
- Upload dokumen pertanggungjawaban.
- Export laporan.
- Dashboard realisasi.

Catatan implementasi:

- Modul ini diposisikan sebagai monitoring, arsip, transparansi, dan pelaporan internal.
- Jangan klaim sebagai pengganti sistem resmi apabila desa diwajibkan memakai sistem pemerintah tertentu.
- Sediakan import/export untuk interoperabilitas.

### 7.7 Perencanaan & Pembangunan

Fitur:

- RPJMDes.
- RKPDes.
- Musrenbangdes.
- Usulan warga.
- Prioritas pembangunan.
- Kegiatan pembangunan.
- Lokasi pembangunan.
- Nilai anggaran.
- Sumber dana.
- Dokumentasi progress.
- Progress fisik.
- Progress keuangan.
- Peta pembangunan.
- Laporan kegiatan.

### 7.8 Bantuan Sosial

Fitur:

- Data penerima bantuan.
- Kategori bantuan.
- Riwayat bantuan.
- Status ekonomi.
- Validasi kelayakan.
- Deteksi duplikasi penerima.
- Bantuan BLT, PKH, BPNT, bantuan desa, bantuan bencana.
- Berita acara penyaluran.
- Foto dokumentasi.
- Export laporan.
- Audit penerima.
- Scoring keluarga rentan.
- Approval berlapis.

### 7.9 Aset Desa

Fitur:

- Tanah kas desa.
- Bangunan.
- Kendaraan.
- Peralatan.
- Inventaris kantor.
- Aset BUMDes.
- Kondisi aset.
- Lokasi aset.
- Foto aset.
- QR Code aset.
- Riwayat pemeliharaan.
- Laporan aset.

### 7.10 Pengaduan Masyarakat

Fitur:

- Pengaduan online.
- Kategori pengaduan.
- Prioritas.
- Lampiran foto.
- Lokasi kejadian.
- Status pengaduan.
- Disposisi ke perangkat desa.
- Balasan admin.
- SLA penyelesaian.
- Rating kepuasan.
- Dashboard pengaduan.

Status:

```txt
Diajukan → Diverifikasi → Diproses → Selesai → Ditutup
```

### 7.11 Arsip & Dokumen

Fitur:

- Arsip surat masuk.
- Arsip surat keluar.
- Arsip peraturan desa.
- Arsip keputusan kepala desa.
- Arsip APBDes.
- Arsip laporan kegiatan.
- Arsip dokumen warga.
- Klasifikasi dokumen.
- Retensi arsip.
- Pencarian dokumen.
- Hak akses dokumen.

### 7.12 CMS Desa

Fitur:

- Berita desa.
- Agenda kegiatan.
- Halaman statis.
- Galeri foto.
- Video.
- Kategori.
- Tag.
- SEO.
- Slug otomatis.
- Draft/publish.
- Approval konten.
- Jadwal publish.

### 7.13 Peta Desa / GIS

Fitur:

- Peta batas wilayah.
- Dusun.
- RT/RW.
- Lokasi fasilitas umum.
- Lokasi aset.
- Lokasi pembangunan.
- Lokasi UMKM.
- Lokasi potensi desa.
- Layer peta.
- Upload GeoJSON.
- Koordinat per data penting.

### 7.14 UMKM & Potensi Desa

Fitur:

- Direktori UMKM.
- Produk desa.
- Kategori usaha.
- Kontak pelaku usaha.
- Foto produk.
- Status verifikasi.
- Lokasi usaha.
- Marketplace sederhana.
- Promosi di portal publik.

### 7.15 BUMDes

Fitur:

- Profil BUMDes.
- Unit usaha.
- Pendapatan.
- Pengeluaran.
- Laporan usaha.
- Produk/layanan.
- Aset BUMDes.
- Dashboard performa.

### 7.16 Notifikasi

Channel:

- In-app notification.
- Email.
- WhatsApp gateway.
- SMS gateway.
- Push notification PWA.

Event:

- Surat diajukan.
- Surat disetujui.
- Surat ditolak.
- Pengaduan dibalas.
- Bantuan disalurkan.
- Agenda desa.
- Dokumen perlu diverifikasi.
- Password reset.
- Login mencurigakan.

---

## 8. Role dan Permission

Role utama:

| Role | Fungsi |
|---|---|
| Superadmin Sistem | Mengelola seluruh tenant/desa |
| Admin Desa | Mengelola konfigurasi desa |
| Kepala Desa | Approval final dan dashboard pimpinan |
| Sekretaris Desa | Validasi administrasi |
| Kaur Umum | Surat, arsip, layanan |
| Kaur Keuangan | Keuangan, APBDes, laporan |
| Kasi Pemerintahan | Penduduk, wilayah, administrasi |
| Kasi Kesejahteraan | Bantuan sosial dan pembangunan |
| Operator Desa | Input data operasional |
| Ketua RT/RW | Verifikasi warga wilayah |
| Warga | Mengajukan layanan |
| Auditor/Inspektorat | Akses baca laporan tertentu |
| Admin Kabupaten | Monitoring multi-desa |

Contoh permission:

```txt
population.read
population.create
population.update
population.delete
families.read
families.manage
letters.read
letters.create
letters.verify
letters.approve
letters.sign
finance.read
finance.manage
assets.read
assets.manage
complaints.read
complaints.assign
complaints.respond
reports.read
reports.export
settings.manage
users.manage
roles.manage
audit.read
```

Model authorization:

```txt
User → Role → Permission
User → Tenant/Desa
User → Scope Wilayah
User → Approval Level
```

---

## 9. Database Core

Core system:

```txt
tenants
villages
users
roles
permissions
user_roles
role_permissions
audit_logs
files
notifications
settings
sessions
refresh_tokens
```

Population:

```txt
residents
families
family_members
addresses
hamlets
neighborhood_units
civil_events
resident_documents
```

Letters:

```txt
letter_types
letter_templates
letter_requests
letter_request_files
letter_approvals
letter_outputs
letter_number_sequences
letter_qr_validations
```

Finance:

```txt
budget_years
budget_categories
budget_items
revenues
expenses
realizations
cash_books
finance_documents
```

Aid:

```txt
aid_programs
aid_recipients
aid_distributions
aid_eligibility_scores
aid_documents
```

Development:

```txt
development_plans
development_proposals
development_projects
development_progress
development_documents
```

Assets:

```txt
asset_categories
assets
asset_maintenance_logs
asset_documents
asset_locations
```

CMS:

```txt
posts
pages
categories
tags
media
menus
```

---

## 10. Multi-Tenant Strategy

Semua data penting wajib memiliki `tenant_id`.

Contoh:

```txt
residents
- id
- tenant_id
- nik
- full_name
- gender
- birth_place
- birth_date
- address_id
- created_at
- updated_at
- deleted_at
```

Strategi awal:

```txt
Shared database + tenant_id + row-level authorization at application layer
```

Strategi lanjutan:

```txt
Hybrid tenant: tenant besar dapat dipindah ke database khusus
```

Rules:

- Semua query data tenant wajib memasukkan filter `tenant_id`.
- Jangan expose data antar tenant.
- Admin kabupaten hanya boleh membaca tenant yang menjadi scope-nya.
- Superadmin sistem harus dibedakan dari admin desa.

---

## 11. UI/UX Direction

Karakter desain:

- Modern SaaS dashboard.
- Clean enterprise.
- Mobile-first.
- Tidak seperti template pemerintahan lama.
- Operator-friendly.
- Ringan dan cepat.

Rekomendasi tema:

### Emerald Government

```txt
Primary: Emerald Green
Secondary: Teal
Accent: Lime
Background: Slate/White
```

### Blue Civic Enterprise

```txt
Primary: Blue
Secondary: Indigo
Accent: Cyan
Background: White/Slate
```

### Nusantara Premium

```txt
Primary: Forest Green
Secondary: Gold
Accent: Sky Blue
Background: Warm White
```

Layout admin:

```txt
Sidebar kiri
Topbar
Breadcrumb
Global search
Notification center
User menu
Content area
Right drawer untuk detail cepat
```

Komponen wajib:

- Stat card.
- Data table enterprise.
- Filter advanced.
- Bulk action.
- Export button.
- Timeline activity.
- Stepper approval.
- Empty state.
- Loading skeleton.
- Error state.
- Drawer detail.
- Modal form.
- Command palette.
- Dark mode opsional.

---

## 12. Security Requirements

Wajib ada:

1. HTTPS.
2. Password hashing Argon2 atau bcrypt.
3. JWT access token pendek.
4. Refresh token rotation.
5. RBAC + permission.
6. Audit log untuk aksi penting.
7. Rate limiting login.
8. 2FA untuk admin.
9. Session management.
10. Device/session revoke.
11. Field masking untuk NIK/KK.
12. File upload validation.
13. Backup terenkripsi.
14. Database migration terkontrol.
15. Soft delete untuk data penting.
16. Approval untuk delete data sensitif.
17. Export data wajib tercatat di audit log.
18. Watermark PDF dokumen sensitif.
19. QR validation untuk surat.
20. Least privilege access.

Masking contoh:

```txt
NIK: 7371********0001
KK : 7371********1234
```

---

## 13. API Design

Gunakan REST API terlebih dahulu.

Endpoint awal:

```txt
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

GET    /residents
POST   /residents
GET    /residents/:id
PATCH  /residents/:id
DELETE /residents/:id

GET    /families
POST   /families
GET    /families/:id
PATCH  /families/:id

GET    /letter-requests
POST   /letter-requests
PATCH  /letter-requests/:id/verify
PATCH  /letter-requests/:id/approve
POST   /letter-requests/:id/generate-pdf

GET    /finance/budget
GET    /finance/realization

GET    /reports/population
GET    /reports/letters
GET    /reports/finance
```

Response standar:

```json
{
  "success": true,
  "message": "Data berhasil dimuat",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100
  }
}
```

---

## 14. Reporting

Laporan wajib:

- Laporan penduduk.
- Laporan KK.
- Laporan mutasi penduduk.
- Laporan kelahiran.
- Laporan kematian.
- Laporan surat.
- Laporan pengaduan.
- Laporan bantuan sosial.
- Laporan aset.
- Laporan APBDes.
- Laporan pembangunan.
- Laporan aktivitas pengguna.
- Laporan audit sistem.

Export:

- PDF.
- Excel.
- CSV.
- JSON untuk integrasi.

---

## 15. AI Feature Optional

AI boleh ditambahkan setelah core stabil.

Fitur AI yang aman:

- Ringkasan pengaduan.
- Klasifikasi pengaduan otomatis.
- Draft balasan pengaduan.
- Deteksi data penduduk duplikat.
- Pencarian dokumen cerdas.
- Tanya data desa berbasis permission.
- Rekomendasi prioritas pembangunan dari usulan warga.
- Analisis tren layanan surat.
- OCR dokumen warga.

Batasan:

- AI tidak boleh langsung memutuskan kelayakan bantuan sosial tanpa validasi manusia.
- AI tidak boleh bypass RBAC/permission.
- AI tidak boleh menampilkan data sensitif tanpa otorisasi.

---

## 16. CI/CD

Pipeline minimal:

```txt
Push ke branch feature
→ lint
→ typecheck
→ unit test
→ build api
→ build web
→ prisma validate
→ prisma migrate check
→ docker build
→ security scan
→ preview deploy
→ PR review
→ merge ke main
→ production deploy
```

Command validasi minimal:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm prisma validate
```

Apabila Docker tersedia:

```bash
docker compose up -d --build
docker compose ps
```

---

## 17. Deployment VPS

Target service:

```txt
Nginx
├── sid-web      : Next.js
├── sid-api      : NestJS
├── sid-worker   : BullMQ Worker
├── postgres     : Database
├── redis        : Cache/Queue
├── minio        : File storage
└── backup       : Scheduled backup
```

Port internal:

```txt
web       : 3000
api       : 4000
postgres  : 5432
redis     : 6379
minio     : 9000
nginx     : 80/443
```

Domain contoh:

```txt
desa.id                 → portal publik
admin.desa.id           → admin dashboard
api.desa.id             → backend API
storage.desa.id         → file storage
```

---

## 18. Roadmap Implementasi

### Phase 0 — Product Foundation

Output:

- Dokumen kebutuhan.
- Daftar modul.
- Role permission.
- ERD awal.
- UI style guide.
- Arsitektur repo.
- Docker setup.

### Phase 1 — Core Platform

Fitur:

- Auth login.
- User management.
- Role permission.
- Tenant/desa profile.
- Audit log.
- File upload.
- Setting aplikasi.
- Layout admin.

### Phase 2 — Portal Publik

Fitur:

- Homepage.
- Profil desa.
- Berita.
- Agenda.
- Galeri.
- Transparansi.
- Layanan publik.

### Phase 3 — Penduduk & Keluarga

Fitur:

- Data penduduk.
- Data KK.
- Dusun/RT/RW.
- Import Excel.
- Export.
- Mutasi penduduk.

### Phase 4 — Surat Online

Fitur:

- Template surat.
- Pengajuan surat.
- Approval.
- Nomor otomatis.
- PDF.
- QR validation.
- Tracking warga.

### Phase 5 — Pengaduan & Notifikasi

Fitur:

- Pengaduan warga.
- Disposisi.
- Status tracking.
- Notifikasi.
- SLA.

### Phase 6 — Bansos, Aset, Pembangunan

Fitur:

- Bantuan sosial.
- Aset desa.
- Kegiatan pembangunan.
- Dokumentasi progress.

### Phase 7 — Keuangan & Transparansi

Fitur:

- APBDes.
- Realisasi.
- Laporan.
- Dokumen keuangan.
- Transparansi publik.

### Phase 8 — Enterprise Hardening

Fitur:

- 2FA.
- Advanced audit.
- Backup restore.
- Monitoring.
- Security scan.
- Performance tuning.
- Multi-tenant dashboard.
- Admin kabupaten.

---

## 19. MVP Prioritas

MVP awal wajib fokus ke:

1. Auth + RBAC.
2. Profil desa.
3. Portal publik.
4. Data penduduk.
5. Data KK.
6. Layanan surat.
7. Template surat PDF.
8. QR validasi surat.
9. Pengaduan warga.
10. Dashboard admin.
11. Audit log.
12. Backup.

Setelah MVP stabil:

- Bantuan sosial.
- Aset.
- Pembangunan.
- Keuangan.
- GIS.
- BUMDes.
- AI.

---

## 20. AI CLI Work Protocol

AI CLI wajib bekerja menggunakan alur:

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

Rules untuk AI CLI:

1. Selalu baca `AGENTS.md` dan dokumen ini sebelum membuat perubahan besar.
2. Jangan membuat fitur tanpa mengaitkan ke phase roadmap.
3. Jangan menghapus modul/struktur tanpa alasan teknis yang jelas.
4. Jangan melewati RBAC, audit log, tenant scope, dan validation.
5. Setiap perubahan wajib punya rencana validasi.
6. Setiap PR wajib menjelaskan: tujuan, perubahan, file penting, cara test, risiko.
7. Prioritaskan MVP sebelum fitur enterprise lanjutan.
8. Jangan implementasi integrasi eksternal resmi tanpa adapter dan konfigurasi yang jelas.
9. Data pribadi warga harus diperlakukan sebagai data sensitif.
10. Semua export data sensitif harus tercatat audit log.

---

## 21. Definisi Selesai

Sebuah fitur dianggap selesai jika:

- API berjalan.
- UI tersedia.
- Validasi input ada.
- Permission diterapkan.
- Audit log diterapkan bila mutation penting.
- Tenant scope diterapkan bila multi-tenant.
- Test minimal tersedia atau validasi manual terdokumentasi.
- Build berhasil.
- Tidak ada error TypeScript/lint kritis.
- Dokumentasi singkat tersedia bila fitur besar.

---

## 22. Kesimpulan Teknis

Keputusan utama:

```txt
Architecture : Modular Monolith, multi-tenant-ready
Frontend     : Next.js 15 + React 19 + TailwindCSS + shadcn/ui
Backend      : NestJS 11 + TypeScript + Prisma
Database     : PostgreSQL 17
Cache/Queue  : Redis + BullMQ
Storage      : MinIO / S3-compatible
Deployment   : Docker Compose di VPS
Security     : JWT refresh rotation + RBAC + audit log + 2FA + data masking
UI           : Modern SaaS dashboard, responsive, enterprise clean
Roadmap      : Core → Portal → Penduduk → Surat → Pengaduan → Bansos/Aset/Pembangunan → Keuangan → Enterprise hardening
```

Dokumen ini menjadi baseline. Semua perubahan besar harus menjaga arah produk ini kecuali ada keputusan arsitektur baru yang terdokumentasi.
