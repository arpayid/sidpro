# SIDPRO Client Handover Readiness

Dokumen ini merangkum kesiapan modul SIDPRO untuk serah-terima ke klien sebelum cutover staging/production. Status di bawah adalah status operasional produk, bukan pengganti uji go-live. Gunakan dokumen ini bersama [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md), [`DOCKER_PRODUCTION.md`](DOCKER_PRODUCTION.md), dan runbook operasional terkait.

## Status Legend

| Status                       | Arti                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `Ready`                      | Modul tersedia untuk demo/operasional sesuai scope MVP dan tetap wajib melewati smoke test environment target. |
| `Ready with Notes`           | Modul tersedia, tetapi ada catatan hardening, uji berkala, atau batasan operasional sebelum data warga asli.   |
| `Preview`                    | Modul bisa dipratinjau, tetapi belum menjadi gate utama go-live atau masih butuh validasi end-to-end tambahan. |
| `Disabled`                   | Modul sengaja tidak aktif pada konfigurasi default/production.                                                 |
| `Needs Client Configuration` | Modul bergantung pada data, secret, domain, akun, atau layanan eksternal milik klien.                          |

## Module Readiness Matrix

| Modul               | Status             | Catatan handover                                                                                                                                                                                                                                          |
| ------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth                | `Ready with Notes` | Login, JWT, refresh token, logout, dan 2FA foundation tersedia. Sebelum go-live, rotasi semua secret, gunakan akun non-default, dan validasi refresh token rotation/reuse detection di staging.                                                           |
| RBAC                | `Ready with Notes` | Role, permission, dan guard admin tersedia. Audit endpoint admin tetap wajib dilakukan sebelum memakai data warga asli.                                                                                                                                   |
| tenant              | `Ready with Notes` | Model tenant/village dan scope multi-tenant-ready tersedia. Wajib validasi tenant leakage test untuk modul core di staging.                                                                                                                               |
| dashboard           | `Ready`            | Dashboard admin dan report MVP tersedia untuk operasional awal setelah smoke test staging lulus.                                                                                                                                                          |
| portal publik       | `Ready with Notes` | Portal publik tersedia. Pastikan demo fallback disabled di production dan konten desa diganti dengan data klien.                                                                                                                                          |
| penduduk            | `Ready with Notes` | CRUD penduduk tersedia untuk MVP. Data NIK/alamat adalah data sensitif; validasi masking, export audit, dan tenant scope sebelum go-live.                                                                                                                 |
| keluarga            | `Ready with Notes` | Data keluarga/KK tersedia untuk MVP. Validasi masking KK, tenant scope, dan relasi anggota keluarga sebelum serah-terima produksi.                                                                                                                        |
| surat               | `Ready with Notes` | Workflow surat, tracking publik, QR validation, dan generate PDF synchronous tersedia. Pastikan template, pejabat penanda tangan, nomor surat, dan storage output dikonfigurasi klien.                                                                    |
| pengaduan           | `Ready with Notes` | Pengaduan publik/admin tersedia. Pastikan rate limit, upload bukti, dan notifikasi ditest di staging.                                                                                                                                                     |
| audit log           | `Ready with Notes` | Audit log tersedia untuk aktivitas penting. Sebelum go-live, audit cakupan create/update/delete/export dan workflow status untuk semua modul sensitif.                                                                                                    |
| files               | `Ready with Notes` | Upload, metadata file, signed URL, MIME validation, dan storage MinIO/S3-compatible tersedia. Wajib konfigurasi bucket, credential, limit ukuran file, dan retention sesuai kebijakan klien.                                                              |
| worker notification | `Preview`          | Worker/background job tersedia sebagai fondasi. Jalankan validasi end-to-end notifikasi di staging sebelum diklaim siap operasional penuh.                                                                                                                |
| worker PDF          | `Disabled`         | Mode default production menggunakan generate PDF synchronous; worker `pdf-generation` tidak diaktifkan ketika `ENABLE_PDF_WORKER=false`. Aktifkan hanya setelah producer API, worker processor, MinIO output, dan update `LetterOutput` lulus end-to-end. |
| backup              | `Ready with Notes` | Script backup/restore tersedia. Wajib uji restore di staging, tetapkan jadwal backup, lokasi penyimpanan, checksum, dan prosedur retensi.                                                                                                                 |
| Docker production   | `Ready with Notes` | Dockerfile production, compose production, nginx, healthcheck, dan service utama tersedia. Wajib validasi compose/build dengan `.env.production` nyata milik klien.                                                                                       |

## Client Configuration Required

Sebelum handover operasional, item berikut harus diisi/ditentukan bersama klien:

- Domain/subdomain production dan staging.
- Credential production: database, Redis, MinIO/S3, JWT, cookie/session, SMTP, dan admin pertama.
- Profil desa: nama resmi, kode desa, alamat kantor, kontak, logo, pejabat penanda tangan, dan format kop surat.
- Kebijakan data: retensi backup, akses export, masking NIK/KK, dan daftar role operator.
- Storage policy: bucket, public endpoint, private/signed URL policy, limit upload, MIME whitelist, dan lifecycle.
- Email/SMTP policy: sender name, sender address, credential SMTP, dan template notifikasi.
- Strategi rollback: image/tag rilis, backup sebelum cutover, dan owner approval untuk rollback.

## Pre Go-live Checklist

Gunakan checklist ini sebagai gate praktis sebelum membuka akses ke data warga asli.

- [ ] **env production** — `.env.production` nyata tersedia, tidak memakai secret/default demo, dan lolos validasi aplikasi.
- [ ] **domain** — DNS production/staging mengarah ke server yang benar dan reverse proxy memakai host final.
- [ ] **SSL** — Sertifikat TLS aktif, auto-renew terkonfigurasi, dan HTTP diarahkan ke HTTPS.
- [ ] **backup** — Backup database/storage berhasil dibuat, checksum tersimpan, restore sudah diuji di staging, dan jadwal backup aktif.
- [ ] **admin account** — Akun admin produksi dibuat dengan password kuat, akun seed/demo dinonaktifkan atau dirotasi, dan role admin diverifikasi.
- [ ] **SMTP** — SMTP production terkonfigurasi dan email test terkirim dari server production/staging.
- [ ] **MinIO/S3** — Bucket, credential, public endpoint/signed URL, policy, dan lifecycle/retention tervalidasi.
- [ ] **smoke test** — `scripts/smoke-test.sh` lulus terhadap staging/production candidate menggunakan akun non-default.
- [ ] **rollback** — Rencana rollback tertulis, image/tag sebelumnya tersedia, backup sebelum deploy tersedia, dan PIC rollback ditentukan.

## Handover Notes

- Dokumen ini harus diperbarui setiap kali status modul berubah dari `Preview`/`Disabled` ke `Ready` atau ketika catatan go-live baru ditemukan.
- Status `Ready with Notes` tidak berarti blocker mutlak, tetapi catatan terkait harus diterima secara eksplisit oleh owner project sebelum memproses data warga asli.
- Untuk go-live resmi, ikuti gate lengkap di [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) dan pastikan CI, smoke test, backup/restore, serta review P1/P2 sudah selesai.
