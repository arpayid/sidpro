# SIDPRO Audit Master Register

Dokumen ini mencatat status audit berdasarkan bukti yang ada di repository. Dokumen ini tidak menafsirkan ketiadaan dokumen sebagai bukti bahwa suatu audit belum pernah dikerjakan atau bahwa tidak ada risiko pada area tersebut.

## Aturan Bukti

Sebuah klaim di register ini hanya boleh memakai salah satu bukti berikut:

1. dokumen repository yang menjelaskan scope, temuan, atau kriteria validasi;
2. pull request yang sudah merged dengan perubahan dan validasi yang jelas;
3. workflow CI yang tercatat sebagai gate atau pengujian;
4. hasil validasi staging/production yang disimpan di repository;
5. keputusan risiko yang disetujui dan ditautkan.

Ketiadaan bukti berarti status harus tetap `Not Formally Assessed`, `Evidence Partial`, atau `Validation Pending`; bukan `Closed`.

## Aturan Closure

Audit hanya boleh ditandai `Closed` bila seluruh kondisi berikut terpenuhi:

- scope audit terdokumentasi;
- setiap temuan memiliki status dan tindakan;
- setiap perbaikan memiliki bukti validasi yang sesuai;
- pekerjaan tersisa, batasan, dan risk acceptance dicatat;
- validasi environment nyata dicatat jika scope membutuhkannya;
- perubahan terakhir telah memperbarui roadmap dan register.

## Ringkasan Bukti Lintas-Audit

| Bukti | Relevansi |
| --- | --- |
| [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) | Deskripsi modular monolith, stack, struktur, batas modul, dan aturan desain. |
| [`docs/CI_MERGE_GATE.md`](../CI_MERGE_GATE.md) | Gate merge CI, production smoke, Security Audit, dan Tenant Link Integrity bersyarat. |
| [`docs/SECURITY_AUDIT.md`](../SECURITY_AUDIT.md) | Dependency audit, Gitleaks secret scan, dan Dependabot. |
| [`docs/PRODUCTION_READINESS.md`](../PRODUCTION_READINESS.md) | Checklist readiness dengan status Done/In Progress dan go-live gate. |
| [AUDIT-5 Database & Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md) | Temuan, guard database, integration gate, dan validasi environment tersisa AUDIT-5. |
| [AUDIT-5 Report & Export Tenant Isolation](AUDIT-5-REPORT-EXPORT-ISOLATION.md) | Scope report/export, kontrol tenant, validator query, dan query-plan evidence. |
| [AUDIT-5 Composite FK Evaluation](AUDIT-5-COMPOSITE-FK-EVALUATION.md) | Keputusan konservatif mengenai trigger guard dan kandidat pilot composite foreign key. |
| [AUDIT-5 Storage Cleanup Observability](AUDIT-5-STORAGE-CLEANUP-OBSERVABILITY.md) | Kontrak retry, retention, log kesehatan queue, dan kebutuhan runtime validation. |
| PR #68, #69, #77 | Bukti hardening refresh endpoint, refresh-token replay handling, dan Security Audit gate. |
| PR #71, #74, #75, #81–#90 | Bukti tenant guard, PostgreSQL runtime test, data lifecycle, storage cleanup, finance ledger, dan release gate. |

---

## AUDIT-0 — Evidence Baseline dan Tata Kelola

**Status baseline:** `In Progress`

### Scope program

Menetapkan bagaimana audit diberi status, bagaimana bukti ditautkan, dan kapan roadmap wajib diperbarui.

### Bukti yang ada

- `docs/ROADMAP.md` menjadi ringkasan status audit.
- Dokumen ini menjadi register bukti dan closure criteria.
- `docs/audits/ROADMAP_UPDATE_POLICY.md` menetapkan proses pembaruan.

### Yang belum dapat diklaim

- Belum ada histori audit terstruktur sebelum baseline ini yang dapat membuktikan urutan atau closure AUDIT-1 sampai AUDIT-4.
- Register ini tidak mengubah hasil audit lama yang tidak terdokumentasi menjadi status `Closed`.

### Kriteria closure yang diusulkan

- Semua audit dalam program memiliki scope, owner/penggerak, status, dan bukti.
- Setiap PR terkait audit memuat Roadmap Impact.
- Tidak ada klaim closure tanpa evidence link.

---

## AUDIT-1 — Repository dan Arsitektur

**Status baseline:** `Not Formally Assessed`

### Scope program

Menilai struktur monorepo, batas modul, arah dependensi, pemisahan concern, konfigurasi shared package, serta keputusan arsitektur yang dapat memengaruhi maintainability dan scale.

### Bukti yang ada

- `docs/ARCHITECTURE.md` menyatakan SIDPRO sebagai modular monolith dengan `apps/web`, `apps/api`, `apps/worker`, `packages/*`, dan `prisma`.
- Dokumen tersebut menetapkan batas modul core/domain serta aturan isolasi modul, validasi API, permission, tenant filtering, audit log, dan background job.

### Yang belum dapat diklaim

- Belum ada laporan audit yang memetakan seluruh dependency antar-module.
- Belum ada keputusan formal bahwa semua module boundary atau import direction telah lulus review.
- Belum ada closure record untuk architecture debt atau exception yang diterima.

### Kriteria closure yang diusulkan

- Buat inventory module dan dependency graph aktual.
- Audit import boundary lintas `apps` dan `packages`.
- Dokumentasikan keputusan arsitektur penting dan exception.
- Tetapkan regression checks untuk boundary yang kritis.

---

## AUDIT-2 — Dependency dan Code Quality

**Status baseline:** `Evidence Partial`

### Scope program

Menilai dependency hygiene, lint/type/build/test quality gate, code duplication, dead code, error handling, test depth, serta perubahan dependency yang berisiko.

### Bukti yang ada

- `CI / validate` menjalankan Prisma validation, lint, typecheck, test, build, migrasi, seed, smoke test, dependency audit, dan validasi Compose production.
- `Security Audit` menjalankan dependency audit untuk temuan high/critical serta Gitleaks secret scan.
- Dependabot dijelaskan sebagai mekanisme pembaruan mingguan dependency dan GitHub Actions.

### Yang belum dapat diklaim

- Belum ada laporan audit code quality menyeluruh yang mengukur coverage, duplication, dead code, atau hotspot kompleksitas.
- Tidak ada closure record bahwa seluruh dependency telah direview untuk licensing, deprecation, atau transitive risk di luar gate yang ada.

### Kriteria closure yang diusulkan

- Catat baseline lint/type/test/build dan temuan kualitas kode.
- Audit dependency deprecated/unused dan dependency production vs development.
- Tentukan kebijakan coverage atau risk-based test matrix.
- Tautkan semua exception dependency ke issue/risk register.

---

## AUDIT-3 — API dan Domain Logic

**Status baseline:** `Evidence Partial`

### Scope program

Menilai kontrak API, input validation, authorization boundary, domain invariant, idempotency, pagination/filter, error mapping, serta regression test atas workflow bisnis utama.

### Bukti yang ada

- PR #82 dan #83 menambahkan regression coverage report/export tenant scope dan validasi range parameter report.
- PR #85–#89 menambahkan atau memperkuat domain invariant untuk BUMDes, surat, resident lifecycle, storage cleanup, dan finance ledger.
- `docs/ARCHITECTURE.md` mewajibkan validasi input API dan permission check pada admin route.

### Yang belum dapat diklaim

- Belum ada inventaris seluruh controller dan endpoint dengan status audit per endpoint.
- Belum ada closure record untuk seluruh workflow domain, error semantics, dan API compatibility.
- Perbaikan pada beberapa modul tidak membuktikan seluruh API telah diaudit.

### Kriteria closure yang diusulkan

- Buat inventory endpoint beserta auth, permission, tenant scope, validation, dan audit-log expectation.
- Uji workflow domain berisiko tinggi dengan integration tests.
- Dokumentasikan API contract breaks dan compatibility policy.
- Buat daftar endpoint yang dikecualikan serta alasan.

---

## AUDIT-4 — Security

**Status baseline:** `Evidence Partial`

### Scope program

Menilai authentication, authorization, session lifecycle, secret management, rate limiting, dependency/secret scanning, file security, logging, dan secure deployment configuration.

### Bukti yang ada

- PR #68 menambahkan rate limit refresh endpoint dan membuat permission claim malformed fail closed.
- PR #69 menambahkan hashed refresh-token storage, rotation transaction, dan replay handling.
- PR #77 menambahkan Security Audit merge gate, dependency audit, Gitleaks, dan Dependabot.
- `docs/SECURITY_AUDIT.md` mendokumentasikan Security Audit dan status checks.
- `docs/PRODUCTION_READINESS.md` tetap mencatat sejumlah security area sebagai `In Progress`, termasuk environment production, secret non-default, endpoint rate limit, guard/permission, upload validation, dan tenant scope modul core.

### Yang belum dapat diklaim

- Belum ada security assessment menyeluruh dengan threat model, inventory public endpoint, atau closure record.
- Lolos Security Audit tidak membuktikan seluruh application security issue telah selesai.
- Belum ada bukti validasi security setting pada environment production nyata.

### Kriteria closure yang diusulkan

- Threat model untuk auth, multi-tenant access, file upload, dan admin workflow.
- Inventory controller/public endpoint beserta rate limit dan authorization assertion.
- Review secret/configuration management dan deployment hardening.
- Bukti dynamic testing untuk temuan P1/P2 yang relevan.

---

## AUDIT-5 — Database dan Tenant Integrity

**Status current:** `Validation Pending`

### Scope program

Menilai tenant isolation di database, relasi lintas tenant, referential integrity, lifecycle soft delete, retention financial record, consistency storage metadata, auditability transaksi keuangan, serta query plan untuk report/export tenant-scoped.

### Bukti yang ada

- `AUDIT-5-DATABASE-TENANT-INTEGRITY.md` mendokumentasikan temuan P1/P2, migration guards, PostgreSQL integration gate, preflight deployment, dan daftar validasi environment yang masih terbuka.
- PR #71, #74, #75, #81, #85, #86, #87, dan #89 menangani tenant link guard, PostgreSQL runtime verification, BUMDes retention, surat, resident lifecycle, dan append-only finance ledger.
- PR #82 dan #83 menambahkan report/export tenant isolation serta query range validation.
- PR #84 dan #88 menambahkan durable cleanup dan letter PDF orphan cleanup.
- PR #90 menambahkan guarded production release gate yang membuat backup PostgreSQL/MinIO, restore verification, preflight, migration, dan post-deploy validation pada CI.
- Migration `20260628001100_add_audit_5_report_export_indexes` dan workflow `AUDIT-5 Query Plan Evidence` membuktikan executed PostgreSQL 17 plans memakai index tenant-scoped untuk resident XLSX export, population civil-event export, letter XLSX export, audit report, dan complaint CSV export pada tenant-selective fixture.
- `AUDIT-5-COMPOSITE-FK-EVALUATION.md` mencatat bahwa trigger tetap dipertahankan karena beberapa invariant tidak dapat diwakili oleh composite foreign key; kandidat pilot tetap terdokumentasi.
- `AUDIT-5-STORAGE-CLEANUP-OBSERVABILITY.md` mencatat retained failure evidence, structured worker health/failure logs, dan alert contract yang dapat dipakai lingkungan deployment.

### Repository-level completion

1. Evaluasi staged replacement trigger guard dengan composite unique key/composite foreign key sudah dilakukan dan keputusan dicatat.
2. Bukti `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` untuk query report/export tenant volume tinggi sudah dijalankan dalam workflow PostgreSQL 17.
3. Retry dan observability cleanup worker sudah diperkuat melalui retention job, structured health logs, final-failure logs, dan unit test.

### Validation pending outside repository

1. Jalankan tenant-link dan identity preflight terhadap setiap dataset staging/production historis sebelum go-live.
2. Simpan `EXPLAIN (ANALYZE, BUFFERS)` pada dataset representatif, termasuk row count, waktu, dan buffer statistics.
3. Verifikasi deployed worker mengaktifkan storage cleanup, meneruskan JSON log ke log collector persisten, serta memberi alert untuk queue degraded dan final failure.
4. Lakukan controlled Redis/MinIO outage-and-recovery drill dan catat perilaku retry.
5. Uji migration lock behavior dan index creation pada persistent staging database sebelum perubahan diterapkan ke database besar.

### Yang belum dapat diklaim

- AUDIT-5 belum `Closed` karena seluruh validasi di atas membutuhkan environment dan/atau data yang belum tersedia.
- CI tidak menggantikan preflight dataset nyata, observability runtime, recovery drill, atau bukti performa pada distribusi data aktual.

### Rujukan

- [Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [Composite Foreign-Key Evaluation](AUDIT-5-COMPOSITE-FK-EVALUATION.md)
- [Report and Export Tenant Isolation](AUDIT-5-REPORT-EXPORT-ISOLATION.md)
- [Report and Export Query-Plan Evidence](AUDIT-5-REPORT-EXPORT-PERFORMANCE-EVIDENCE.md)
- [Storage Cleanup Observability and Retry](AUDIT-5-STORAGE-CLEANUP-OBSERVABILITY.md)
- [Finance Ledger Audit](AUDIT-FINANCE-LEDGER.md)

---

## AUDIT-6 — Frontend

**Status baseline:** `Not Formally Assessed`

### Scope program

Menilai correctness UI, state/data fetching, role-based presentation, accessibility, responsive behavior, error/empty/loading state, form validation UX, dan security-sensitive rendering.

### Bukti yang ada

- Repository memiliki aplikasi web dan dokumentasi UI, tetapi tidak ada laporan audit frontend formal di register baseline.

### Yang belum dapat diklaim

- Belum ada inventory screen-by-screen, accessibility result, responsive validation, atau closure report.
- Tidak dapat disimpulkan bahwa UI telah lulus audit hanya dari keberadaan aplikasi atau test backend.

### Kriteria closure yang diusulkan

- Screen map dan prioritas journey berdasarkan role.
- Audit loading/error/empty/form states.
- Accessibility baseline dan responsive browser/device coverage.
- Uji tenant/permission presentation pada admin UI.

---

## AUDIT-7 — DevOps dan Delivery

**Status baseline:** `Evidence Partial`

### Scope program

Menilai CI/CD, merge protection, container build, deployment workflow, service health, runtime configuration, observability, rollback decision process, dan operational documentation.

### Bukti yang ada

- `docs/CI_MERGE_GATE.md` mendefinisikan required checks dan pengaturan branch protection yang direkomendasikan.
- CI memiliki `validate` dan `production-smoke`; Security Audit dan Tenant Link Integrity tercatat sebagai gate.
- PR #90 menambahkan guarded production release gate dan workflow CI yang menjalankan backup, restore verification, bootstrap migration, Compose startup, serta post-deploy validation.

### Yang belum dapat diklaim

- Belum ada bukti bahwa branch protection benar-benar diterapkan pada repository settings.
- Belum ada bukti cutover atau operasi service jangka panjang pada staging/production persisten.
- Belum ada closure record observability, alerting, incident response, dan rollback drill.

### Kriteria closure yang diusulkan

- Simpan bukti branch ruleset aktif.
- Jalankan release runbook pada staging persisten dan catat hasilnya.
- Definisikan metrics, logs, alerts, dan escalation path.
- Uji rollback decision/restore recovery secara terkontrol.

---

## AUDIT-8 — Backup dan Recovery

**Status baseline:** `Evidence Partial`

### Scope program

Menilai backup database/object storage, integritas archive, restore verification, retention, recovery objective, ownership akses backup, dan restore drill.

### Bukti yang ada

- `docs/PRODUCTION_READINESS.md` mencatat backup/restore sebagai `In Progress` dan menyatakan restore perlu diuji berkala.
- PR #90 membuat backup PostgreSQL dan MinIO, checksum, restore ke database/bucket temporer, dan manifest release backup sebelum migration.
- Workflow Production Release Gate memvalidasi alur itu pada environment CI ephemeral.

### Yang belum dapat diklaim

- Belum ada bukti backup retention atau lokasi penyimpanan pada environment production.
- Belum ada restore drill pada staging/production persisten.
- Recovery time/recovery point objective belum dicatat sebagai target yang disetujui.

### Kriteria closure yang diusulkan

- Tentukan retention, encryption/access control, RPO, dan RTO.
- Simpan catatan restore drill periodik pada environment persisten.
- Uji recovery database dan object storage sebagai satu workflow.
- Tautkan manifest backup ke release record.

---

## AUDIT-9 — Performance dan Scale

**Status baseline:** `Not Formally Assessed`

### Scope program

Menilai query plan, index, pagination, export scale, queue throughput, storage behavior, API latency, memory/CPU, dan bottleneck production-like.

### Bukti yang ada

- AUDIT-5 sekarang memiliki evidence query plan PostgreSQL 17 untuk beberapa report/export tenant-scoped dengan fixture tenant 5,000 baris dan noise tenant 30,000 baris.

### Yang belum dapat diklaim

- Belum ada report benchmark, dataset representatif persisten, target SLA, export memory profile, atau capacity baseline.
- Tidak dapat disimpulkan bahwa performa aman pada volume data nyata dari CI fungsional atau query-plan fixture.

### Kriteria closure yang diusulkan

- Tentukan dataset, workload, SLA, dan query/API prioritas.
- Simpan plan `EXPLAIN (ANALYZE, BUFFERS)` sebelum/selesai perbaikan index.
- Ukur export memory/time dan queue throughput.
- Dokumentasikan bottleneck, threshold, dan mitigation.

---

## AUDIT-10 — UAT dan Commercial Readiness

**Status baseline:** `Evidence Partial`

### Scope program

Menilai alur pengguna per role, acceptance criteria, data/privacy readiness, admin operation, documentation client, cutover, dan serah-terima.

### Bukti yang ada

- `docs/PRODUCTION_READINESS.md` menyediakan checklist go-live dan `docs/CLIENT_HANDOVER_READINESS.md` dicantumkan sebagai dokumen readiness terkait.
- Production readiness masih memiliki banyak item `In Progress`; dokumen itu sendiri tidak menyatakan go-live sudah layak.

### Yang belum dapat diklaim

- Belum ada hasil UAT yang ditandatangani atau acceptance evidence dari pengguna/client.
- Belum ada bukti cutover data nyata, training, atau handover operasional.

### Kriteria closure yang diusulkan

- UAT scenario berdasarkan role dan modul prioritas.
- Defect triage dan acceptance log.
- Handover checklist, operasi/admin guide, dan escalation contact.
- Go/no-go record sebelum cutover.

---

## Cara Memakai Register Ini

1. Pilih audit yang relevan untuk sebuah perubahan.
2. Perbarui audit record atau dokumen audit spesifik dengan perubahan status/temuan/bukti.
3. Perbarui `docs/ROADMAP.md` bila status summary, prioritas, atau blocker berubah.
4. Isi bagian **Roadmap Impact** pada pull request.
5. Jangan menghapus temuan historis; ubah statusnya dan tautkan PR atau validasi yang menanganinya.
