# UI Enterprise Hardening Checklist

## Purpose

Dokumen ini mencatat hasil audit awal hardening UI untuk area admin SIDPRO dan menjadi standar rujukan sebelum halaman ditandai **Premium Ready**. Scope audit mengikuti prioritas MVP pada blueprint: dashboard, penduduk, keluarga, layanan surat, pengaduan, users/roles, dan audit logs, lalu diperluas ke halaman admin lain, hooks feature, serta komponen UI bersama.

## Scope Audit

Area yang diaudit:

- `apps/web/src/app/(admin)/admin/**`
- `apps/web/src/features/**`
- `packages/ui/src/**`
- Komponen enterprise pendukung di `apps/web/src/components/enterprise/**` dan shared table/stat di `apps/web/src/components/shared/**` sebagai dependency langsung halaman admin.

## Status Legend

| Status                    | Arti                                                                                                                              | Exit Criteria                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Premium Ready`           | Halaman sudah memakai pola enterprise utama secara konsisten.                                                                     | Ada page header + breadcrumb, data/stat presentation sesuai konteks, loading/error/empty state, action UX jelas, status badge bila relevan, dan form/detail tidak terasa mentah. |
| `Needs Layout`            | Struktur visual belum konsisten dengan shell enterprise.                                                                          | Tambahkan `PageHeader`, breadcrumb, spacing section, card surface, responsive action bar, dan hierarchy heading.                                                                 |
| `Needs Data Table`        | Daftar data belum memakai table enterprise atau belum ada pagination/filter/action standar.                                       | Gunakan `apps/web/src/components/enterprise/data-table.tsx` dengan toolbar/filter, pagination, row action, empty/error/loading.                                                  |
| `Needs Form UX`           | Form/drawer/modal belum lengkap untuk validasi, label, helper text, disabled state, destructive confirmation, atau action footer. | Standarkan dengan drawer/modal/footer, validasi Zod/RHF, error inline, disabled pending, dan cancel/save affordance.                                                             |
| `Needs Empty/Error State` | Loading, empty, atau error masih berupa teks/pola lokal dan belum konsisten.                                                      | Gunakan `LoadingSkeleton`, `EmptyState`, dan `ErrorState` dengan copy operasional dan retry action.                                                                              |

## Enterprise UI Standards

### Page Header

- Setiap halaman admin wajib memakai `PageHeader` untuk judul, deskripsi operasional, breadcrumb, dan action utama.
- Action utama harus berada di kanan header pada desktop dan tetap mudah dijangkau pada mobile.
- Deskripsi harus menjelaskan outcome operator, bukan hanya nama modul.

### Breadcrumb

- Minimal pola: `Admin` → `Nama Modul` → `Sub Modul` bila ada.
- Breadcrumb item terakhir tidak memakai link.
- Halaman nested seperti pengaturan surat wajib menyertakan parent `Surat`.

### Stat Card

- Dashboard dan overview modul wajib memakai stat card untuk KPI utama.
- Stat card harus menyertakan label jelas, nilai, tren/indikator bila tersedia, dan ikon konsisten.
- Hindari kartu statistik tanpa konteks tanggal/scope tenant bila datanya operasional.

### Data Table

- Daftar enterprise wajib memakai data table standar dengan: kolom typed, row key stabil, empty state, error retry, loading skeleton, row action, dan pagination bila API mendukung.
- Untuk data sensitif, NIK/KK/alamat harus dimasking atau ditampilkan selektif sesuai role.
- Kolom status wajib memakai status badge, bukan teks polos.

### Filter Bar

- Filter bar harus berada di toolbar table, bukan tersebar di header atau card lain.
- Filter minimal: search, status, tanggal/scope bila relevan.
- Perubahan filter harus reset pagination ke halaman pertama.

### Search

- Search harus memakai placeholder spesifik, misalnya `Cari nama atau NIK...`.
- Search data sensitif harus tetap menghormati permission dan tenant scope dari API.
- Untuk dataset besar, gunakan query API dengan debounce pada iterasi berikutnya.

### Bulk Action

- Modul data operasional besar seperti penduduk, keluarga, surat, pengaduan, users, dan audit export perlu desain bulk action.
- Bulk action harus menampilkan jumlah selected, permission gate, confirmation untuk destructive action, dan audit trail untuk export/mutation.
- Jika belum diimplementasikan, halaman tidak boleh dinilai final enterprise untuk operasi massal.

### Empty State

- Empty state harus menjawab: apa yang kosong, kenapa penting, dan action berikutnya.
- Empty state create-first harus menyertakan CTA bila user punya permission.
- Empty karena filter harus menyarankan reset filter/search.

### Loading State

- Loading list menggunakan table skeleton; loading KPI menggunakan KPI skeleton; loading detail menggunakan skeleton blok.
- Hindari teks `Memuat...` saja pada halaman prioritas.
- Loading mutation harus disable tombol dan mengubah label aksi.

### Error State

- Error state harus menampilkan pesan operasional singkat dan tombol retry bila query bisa diulang.
- Jangan menampilkan stack trace/error teknis langsung ke operator.
- Error untuk mutation harus inline dekat form action.

### Modal Form

- Gunakan modal hanya untuk konfirmasi kecil atau form pendek.
- Form panjang, wizard, atau detail record lebih cocok menggunakan drawer.
- Modal destructive wajib punya copy dampak, cancel, confirm, dan loading state.

### Drawer Detail

- Detail/create/edit record operasional memakai drawer dengan title jelas, body scrollable, dan footer sticky/terpisah.
- Drawer detail sebaiknya memuat ringkasan, timeline/audit aktivitas, dan action lanjutan sesuai permission.
- Drawer harus dapat ditutup via tombol close dan overlay tanpa kehilangan mutation aktif.

### Status Badge

- Semua status domain harus dipetakan ke varian semantik: info, warning, primary, success, danger, default.
- Jangan menggunakan badge warna generik yang berbeda-beda antar modul untuk status yang sama.
- Status badge wajib punya label berbahasa operator, bukan raw enum jika raw enum tidak ramah.

## Priority Page Audit

| Prioritas | Halaman    | Status                    | Temuan Utama                                                                                                                                 | Hardening Berikutnya                                                                                      |
| --------- | ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1         | Dashboard  | `Needs Empty/Error State` | Sudah memakai `PageHeader` dan KPI/chart, tetapi state dashboard masih perlu skeleton/empty/error yang lebih granular per widget.            | Tambahkan KPI skeleton konsisten, widget empty per data kosong, dan fallback chart error.                 |
| 2         | Penduduk   | `Premium Ready`           | Sudah memakai `PageHeader`, breadcrumb, enterprise `DataTable`, `FilterBar`, drawer form/import/mutasi, confirm delete, loading/error/empty. | Tambahkan desain bulk action dan audit/export UX untuk fase enterprise berikutnya.                        |
| 3         | Keluarga   | `Premium Ready`           | Sudah memakai pola enterprise mirip penduduk: header, breadcrumb, table, filter, drawer, confirm, loading/error/empty.                       | Tambahkan bulk action, masking KK, dan empty state khusus filter.                                         |
| 4         | Surat      | `Premium Ready`           | Sudah memakai header, table, filter status, drawer create/detail, approval stepper, dan status badge.                                        | Tambahkan search/filter lanjutan dan bulk approval bila kebutuhan operasional sudah valid.                |
| 5         | Pengaduan  | `Premium Ready`           | Sudah memakai header, filter, table, drawer detail, complaint stepper/status badge, confirm action, loading/error.                           | Tambahkan SLA visual lebih kuat, bulk assignment, dan empty state berbeda untuk filter.                   |
| 6         | Users      | `Premium Ready`           | Sudah memakai header, table, filter/search, drawer create/edit/role assignment, status badge, confirm.                                       | Tambahkan bulk deactivate dan 2FA status badge pada fase hardening admin.                                 |
| 7         | Roles      | `Needs Form UX`           | Sudah memakai header, table, drawer, status badge, tetapi permission assignment masih padat dan butuh search/grouping UX.                    | Tambahkan filter permission, select-all per group yang lebih eksplisit, dan empty/error permission state. |
| 8         | Audit Logs | `Premium Ready`           | Sudah memakai header, filter/search, table, status badge action, drawer detail, loading/error.                                               | Tambahkan saved filter/export UX dengan audit-safe copy.                                                  |

## Full Admin Page Inventory

| Area             | File utama                                                                 | Status                    | Notes                                                                                          |
| ---------------- | -------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------- |
| Dashboard        | `apps/web/src/app/(admin)/admin/dashboard/page.tsx`                        | `Needs Empty/Error State` | Header tersedia; hardening state widget perlu dirapikan.                                       |
| Penduduk         | `apps/web/src/app/(admin)/admin/penduduk/page.tsx`                         | `Premium Ready`           | Pola enterprise lengkap untuk MVP.                                                             |
| Keluarga         | `apps/web/src/app/(admin)/admin/keluarga/page.tsx`                         | `Premium Ready`           | Pola enterprise lengkap untuk MVP.                                                             |
| Surat            | `apps/web/src/app/(admin)/admin/surat/page.tsx`                            | `Premium Ready`           | Table, drawer, status, approval stepper tersedia.                                              |
| Pengaturan Surat | `apps/web/src/app/(admin)/admin/surat/pengaturan/page.tsx`                 | `Needs Data Table`        | Header ada, tetapi list settings/template belum memakai data table/action enterprise penuh.    |
| Pengaduan        | `apps/web/src/app/(admin)/admin/pengaduan/page.tsx`                        | `Premium Ready`           | Pola complaint enterprise kuat.                                                                |
| Users            | `apps/web/src/app/(admin)/admin/users/page.tsx`                            | `Premium Ready`           | User lifecycle sudah table/drawer/status.                                                      |
| Roles            | `apps/web/src/app/(admin)/admin/roles/page.tsx`                            | `Needs Form UX`           | Permission editor perlu UX enterprise lanjutan.                                                |
| Audit Logs       | `apps/web/src/app/(admin)/admin/audit-logs/page.tsx`                       | `Premium Ready`           | Audit detail drawer dan status action tersedia.                                                |
| Peristiwa        | `apps/web/src/app/(admin)/admin/peristiwa/peristiwa-content.tsx`           | `Premium Ready`           | Header/table/filter/drawer/confirm tersedia.                                                   |
| BUMDes           | `apps/web/src/app/(admin)/admin/bumdes/bumdes-content.tsx`                 | `Needs Data Table`        | Header ada; masih memakai shared table lama dan belum konsisten dengan enterprise table state. |
| Berita           | `apps/web/src/app/(admin)/admin/berita/berita-content.tsx`                 | `Needs Layout`            | Memakai shared table dan local header/filter; perlu `PageHeader` + enterprise table.           |
| Agenda           | `apps/web/src/app/(admin)/admin/agenda/agenda-content.tsx`                 | `Needs Layout`            | Memakai shared table dan local loading/error; perlu page header/breadcrumb standar.            |
| Galeri           | `apps/web/src/app/(admin)/admin/galeri/galeri-content.tsx`                 | `Needs Data Table`        | Grid/gallery UX perlu empty/error/loading enterprise dan action toolbar.                       |
| Bantuan Sosial   | `apps/web/src/app/(admin)/admin/bantuan-sosial/bantuan-sosial-content.tsx` | `Needs Layout`            | Data table ada tetapi shared; perlu header/filter/stat dan state konsisten.                    |
| Pembangunan      | `apps/web/src/app/(admin)/admin/pembangunan/pembangunan-content.tsx`       | `Needs Layout`            | Data table/drawer ada, tetapi header dan filter enterprise belum lengkap.                      |
| Keuangan         | `apps/web/src/app/(admin)/admin/keuangan/keuangan-content.tsx`             | `Needs Layout`            | Shared table dan local header; perlu stat cards, filters, enterprise states.                   |
| Aset             | `apps/web/src/app/(admin)/admin/aset/aset-content.tsx`                     | `Needs Layout`            | Shared table/drawer ada; perlu page header, filter, status badge, empty/error standard.        |
| Wilayah          | `apps/web/src/app/(admin)/admin/wilayah/wilayah-content.tsx`               | `Needs Empty/Error State` | Data table/drawer ada; error state belum eksplisit dan header belum enterprise.                |
| Pengaturan       | `apps/web/src/app/(admin)/admin/pengaturan/pengaturan-content.tsx`         | `Needs Form UX`           | Banyak form settings; perlu form section, validation copy, skeleton/error section.             |
| Kabupaten        | `apps/web/src/app/(admin)/admin/kabupaten/kabupaten-content.tsx`           | `Needs Layout`            | Stat card ada; perlu `PageHeader`, breadcrumb, enterprise table/detail state.                  |
| Kecamatan        | `apps/web/src/app/(admin)/admin/kecamatan/kecamatan-content.tsx`           | `Needs Layout`            | Stat card ada; perlu table/action and empty/error standard.                                    |
| Laporan          | `apps/web/src/app/(admin)/admin/laporan/laporan-content.tsx`               | `Needs Empty/Error State` | Error state ada sebagian; perlu cards/skeleton/export action consistency.                      |

## Feature Hook Audit

| Area                    | Files                                                                                                          | Status          | Notes                                                                                      |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------ |
| Data warga              | `features/residents`, `features/families`, `features/civil-events`                                             | `Premium Ready` | Hooks sudah mendukung query/mutation dasar; UI perlu memastikan masking dan permission.    |
| Layanan                 | `features/letters`, `features/complaints`                                                                      | `Premium Ready` | Query/detail/mutation cukup lengkap untuk MVP.                                             |
| RBAC                    | `features/users`, `features/roles`, `features/audit-logs`                                                      | `Needs Form UX` | Data layer ada; role permission UX dan export audit flow perlu hardening.                  |
| CMS                     | `features/cms`                                                                                                 | `Needs Layout`  | Hooks tersedia, tetapi halaman CMS belum memakai enterprise table/header konsisten.        |
| Operasional desa        | `features/assets`, `features/development`, `features/social-assistance`, `features/finance`, `features/bumdes` | `Needs Layout`  | Data layer ada; halaman perlu migrasi dari shared table/local state ke enterprise pattern. |
| Tenant/wilayah/settings | `features/tenants`, `features/territories`, `features/settings`, `features/village-profile`                    | `Needs Form UX` | Form/overview perlu standar section, validation, empty/error per card.                     |

## Shared UI Package Audit

| Component            | File                                                                     | Status             | Notes                                                                                             |
| -------------------- | ------------------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------- |
| Button               | `packages/ui/src/button.tsx`                                             | `Premium Ready`    | Variant/size dasar tersedia; lanjutkan dengan loading/icon convention bila diperlukan.            |
| Input                | `packages/ui/src/input.tsx`                                              | `Premium Ready`    | Input dasar konsisten; form complex tetap perlu wrapper label/error.                              |
| Card                 | `packages/ui/src/card.tsx`                                               | `Premium Ready`    | Card primitive cukup untuk surface.                                                               |
| Badge                | `packages/ui/src/badge.tsx`                                              | `Needs Layout`     | Ada overlap dengan enterprise `StatusBadge`; perlu konsolidasi varian status agar tidak divergen. |
| Shared DataTable     | `apps/web/src/components/shared/data-table.tsx`                          | `Needs Data Table` | Legacy/simple table; halaman admin sebaiknya migrasi ke enterprise data table.                    |
| Enterprise DataTable | `apps/web/src/components/enterprise/data-table.tsx`                      | `Premium Ready`    | Sudah mendukung loading/error/empty/pagination/toolbar dasar.                                     |
| PageHeader           | `apps/web/src/components/enterprise/page-header.tsx`                     | `Premium Ready`    | Standar header/breadcrumb sudah tersedia.                                                         |
| DetailDrawer         | `apps/web/src/components/enterprise/detail-drawer.tsx`                   | `Premium Ready`    | Drawer dasar tersedia; perlu focus trap/accessibility enhancement berikutnya.                     |
| Empty/Error/Loading  | `apps/web/src/components/enterprise/*state*.tsx`, `loading-skeleton.tsx` | `Premium Ready`    | Primitive state tersedia dan perlu dipakai konsisten.                                             |
| StatusBadge          | `apps/web/src/components/enterprise/status-badge.tsx`                    | `Premium Ready`    | Varian domain untuk surat, pengaduan, audit, user tersedia.                                       |

## Recommended Fix Order

1. Migrasi halaman prioritas yang belum penuh: `roles` permission editor dan `dashboard` widget states.
2. Migrasi semua halaman yang masih memakai `apps/web/src/components/shared/data-table.tsx` ke enterprise `DataTable`.
3. Tambahkan `PageHeader` + breadcrumb untuk halaman content lama: berita, agenda, aset, bantuan sosial, pembangunan, keuangan, kabupaten, kecamatan, wilayah.
4. Standarkan form settings dan CMS drawer dengan `FormSection`, inline error, disabled pending, dan footer action.
5. Desain bulk action untuk penduduk, keluarga, surat, pengaduan, users, dan export audit logs.
6. Konsolidasikan `Badge` package UI dan `StatusBadge` enterprise agar mapping status domain tidak terpecah.
7. Tambahkan checklist visual regression/manual QA untuk mobile breakpoint admin.

## Validation Checklist for Future UI PRs

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Manual review mobile: 375px, 768px, 1280px.
- Manual review states: loading, empty, API error, validation error, mutation pending, permission denied.
- Data safety review: NIK/KK/address masking where required, tenant scoped API, audit log for export/mutation.

## Known Limitations of This Audit

- Audit ini berbasis inspeksi statis source code dan belum menjalankan aplikasi di browser.
- Tidak ada screenshot karena perubahan yang dibuat adalah dokumentasi, bukan perubahan visual runtime.
- Status halaman dapat berubah setelah halaman dimigrasi; update dokumen ini pada setiap UI hardening PR besar.
