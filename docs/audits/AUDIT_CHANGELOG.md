# SIDPRO Audit Change Ledger

Ledger ini adalah riwayat append-only untuk perubahan audit yang material. Gunakan sebagai sumber handoff sebelum agent/provider memulai kerja. Ia tidak menggantikan Git history, PR, atau workflow CI; setiap entry harus menunjuk bukti tersebut.

## Aturan Penggunaan

1. Tambahkan entry pada PR yang sama untuk setiap completion, mitigation, status change, blocker environment, rollout, rollback, atau validasi staging/production.
2. Jangan hapus entry lama. Koreksi dengan entry baru yang menyebut ID entry sebelumnya.
3. Status `Closed` hanya boleh dipakai setelah closure evidence dapat ditautkan.
4. Nama provider/agent adalah metadata provenance, bukan bukti kebenaran. Selalu verifikasi terhadap commit, PR, workflow, dan evidence.
5. Jangan menulis secret, URL bercredential, cookie, access token, refresh token, data penduduk, atau PII.

## Status Vocabulary

| Status | Arti |
| --- | --- |
| `Planned` | Scope sudah disetujui, pekerjaan belum dimulai. |
| `In Progress` | Ada perubahan aktif yang belum tervalidasi/merged. |
| `Validation Pending` | Implementasi merged, tetapi evidence yang disyaratkan belum tersedia. |
| `Blocked by Environment` | Tidak dapat dilanjutkan tanpa environment, data fixture, akses, atau keputusan eksternal yang disebutkan. |
| `Resolved in Source` | Temuan telah dimitigasi oleh code/test/CI, tetapi tidak mengklaim staging/production. |
| `Closed` | Scope dan closure evidence lengkap serta direkonsiliasi. |
| `Deferred` | Bukan blocker saat ini; entry harus menyebut kriteria kapan dibuka kembali. |

## Entry Template

```md
### YYYY-MM-DD — <TRACE-ID> — <judul singkat>

- Status: `<status sebelum>` → `<status sesudah>`
- Scope: <audit/module/issue>
- Change: <apa yang diubah atau diputuskan>
- Evidence: <PR, commit, workflow, test, artifact, runbook>
- Remaining / next action: <aksi terverifikasi berikutnya>
- Execution mode: `REPO_DOCS` | `REPO_CI_READY` | `VPS_REQUIRED` | `HUMAN_UAT_REQUIRED`
- Provider / operator: <opsional; hanya provenance>
- Secrets/PII: `None recorded`
```

## Entries

### 2026-06-29 — AUDIT-4-SESSION-BOUNDARY — Browser refresh credential boundary

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-4; issue #105 closed; issue #112 open.
- Change: Browser-persisted refresh token dan JavaScript-readable route cookie diganti dengan rotating host-only `HttpOnly` refresh session cookie. Access token dan profile tetap hanya di memori tab; refresh/logout tidak lagi memakai body refresh token.
- Evidence: PR #115 merge `474901eb92e8094b2f1b51bd7c0f4068c728d8a0`; security/session controller/cookie/browser policy regression tests; `AUDIT-4-SESSION-BOUNDARY.md`.
- Remaining / next action: Jalankan issue #112 pada persistent HTTPS staging di balik reverse proxy/CDN target; simpan evidence yang telah disanitasi.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-2-MAINTAINABILITY-TRIAGE — Email fallback dan triage hotspot

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-2; issue #107 closed; issue #111 deferred/non-blocking.
- Change: Hotspot maintainability dan console signal diklasifikasikan; worker production tanpa SMTP memakai no-delivery adapter dan hanya menulis event tersanitasi, bukan penerima/subjek/isi email.
- Evidence: PR #116 merge `ee9d13e41bdd6a2f0623ad5c58808b120eca2e9a`; AUDIT-2 baseline workflow, Security Audit, CI, dan `apps/worker/test/email-factory.test.ts`.
- Remaining / next action: Bandingkan artifact maintainability schema-v2 dengan satu trend berikutnya. Buka #111 hanya untuk refactor yang sempit, test-backed, dan tidak mengganggu staging gates.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-6-STAGING-EVIDENCE — Sanitasi artifact network probe

- Status: `Resolved in Source` → `Validation Pending`
- Scope: AUDIT-6 staging probe; issues #108 dan #110 tetap open.
- Change: Artifact probe hanya menyimpan `content-type` serta security-header allowlist. URL dengan user/password ditolak. Self-test CI memastikan `Set-Cookie`, `Authorization`, `Proxy-Authorization`, dan secret contoh tidak masuk evidence.
- Evidence: PR #118 merge `6bc907bc45182049b60d290527b817a5723531d9`; AUDIT-6 Staging Probe, Security Audit, dan CI hijau.
- Remaining / next action: Jalankan probe terhadap persistent staging. Hasil probe tidak menutup #108, #110, atau #112 tanpa browser/staging evidence yang diwajibkan.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-0-ROADMAP-RECONCILIATION — Konsistensi handoff lintas provider

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-0; semua roadmap/register/handoff yang terdampak oleh PR #115/#116/#118.
- Change: Status lama yang masih merujuk #105/#107 direkonsiliasi; ditambahkan ledger, protocol lintas provider, dan trace requirement pada PR.
- Evidence: PR ini; `ROADMAP.md`, `AUDIT_MASTER_REGISTER.md`, `AUDIT_CLI_HANDOFF.*`, dan `ROADMAP_UPDATE_POLICY.md`.
- Remaining / next action: Setiap PR material berikutnya harus menambah entry ledger dan menyinkronkan register/roadmap/handoff bila status atau next action berubah.
- Execution mode: `REPO_DOCS`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

## Historical Backfill — AUDIT-1 sampai AUDIT-5

Entry berikut menutup celah dokumentasi historis. Urutan evidence tetap Git history; entry ini tidak mengubah klaim closure audit mana pun.

### 2026-06-29 — AUDIT-1-ARCHITECTURE-BASELINE — Executable modular-monolith boundary

- Status: `Not Formally Assessed` → `In Progress`
- Scope: AUDIT-1 repository architecture.
- Change: Menetapkan inventory monorepo, ownership, dependency direction, ADR, exception register, dan executable architecture-boundary policy yang melarang core→domain, domain→domain, application-source cross-import, serta application dependency dari shared package.
- Evidence: PR #93 (merged); `AUDIT-1-REPOSITORY-ARCHITECTURE.md`; `architecture-boundaries.test.ts`; focused architecture workflow.
- Remaining / next action: Pertahankan gate pada perubahan source/evidence dan lanjutkan remediasi dependency yang ditemukan.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-1-ADDRESSING-CORE — Shared address ownership

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-1 issue #94; population/family address workflow.
- Change: Menghapus legacy address resolver dari `PopulationService` dan mendelegasikan create/update resident ke `AddressResolutionService` dalam `core/addressing`, sehingga tidak ada lagi ketergantungan domain population/family untuk kemampuan alamat bersama.
- Evidence: PR #95 merge `df36623615148124b7e52972712496b1f9bb0786`; regression tests family/population address resolver.
- Remaining / next action: Pastikan semua dependency map dan runtime staging topology tetap sesuai ownership core addressing.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-1-DEPENDENCY-MAP — Architecture evidence reconciliation

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-1 dependency-map review.
- Change: Mereview composition root, static import scanner, core/addressing exception, report read-model exception, serta menyinkronkan status register/roadmap dari repository evidence ke `Validation Pending`.
- Evidence: PR #96 (merged); dependency-map review against PR #95 merge; AUDIT-1 architecture documentation and workflow trigger coverage.
- Remaining / next action: Validasi topology web/API/worker, queue/storage contract, health/readiness, dan runtime configuration pada persistent staging.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-2-QUALITY-BASELINE — Dependency and code-quality evidence

- Status: `Not Formally Assessed` → `In Progress`
- Scope: AUDIT-2 dependency hygiene, coverage, lint, dan code-quality baseline.
- Change: Menetapkan dokumen scope/finding/closure, menjalankan coverage graph, dan memulai evidence dependency/code-quality yang dapat direproduksi.
- Evidence: PR #97 (merged); `AUDIT-2-DEPENDENCY-CODE-QUALITY.md`; coverage command and CI evidence.
- Remaining / next action: Terapkan governance exception/lint dan remediation dependency tanpa mengklaim runtime closure.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-2-GOVERNANCE-BASELINES — Dependency exception and lint policy

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-2 dependency exception governance and lint inventory.
- Change: Menambahkan exception register machine-readable, validasi kesesuaian suppression/registry, audit dependency yang tidak diabaikan, dan inventory lint reproducible.
- Evidence: PR #98 (merged); dependency exception register and lint baseline workflow.
- Remaining / next action: Selesaikan advisory dan declaration drift yang masih tercatat, lalu perluas critical-path evidence.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-2-DEPENDENCY-REMEDIATION — Runtime-critical advisory cleanup

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-2 issue #99 dependency remediation.
- Change: Menyelaraskan Prisma declaration pada `6.19.3`, menghapus duplicate root declaration, dan menerapkan override ter-review untuk jalur `postcss`, `uuid`, dan `js-yaml`; frozen install dan audit dependency bersih direkam sebagai evidence source-level.
- Evidence: PR #100 (merged); CI, Security Audit, Architecture Boundaries, and AUDIT-2 workflow.
- Remaining / next action: Lanjutkan coverage/critical-path/maintainability evidence; tidak mengklaim exploitability atau staging closure.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-2-CRITICAL-PATH-BASELINE — Coverage and maintainability trend controls

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-2 coverage, critical-path, and maintainability baseline.
- Change: Menambahkan baseline coverage kedua, named critical-path suite, dan inventory maintainability agar ratchet masa depan tidak dibuat berdasarkan satu snapshot atau metrik mekanis.
- Evidence: PR #106 (merged); AUDIT-2 Code Quality Baseline workflow and versioned critical-path expectations.
- Remaining / next action: Bandingkan trend artifact schema-v2 berikutnya dan hanya lakukan refactor #111 yang scoped/test-backed.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-3-API-DOMAIN-SOURCE — Route access and domain control baseline

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-3 issue #102 API/domain logic.
- Change: Mendokumentasikan inventory 26 controller, policy access marker, bounded global pagination, service-level tenant authorization exception register, dan API compatibility/idempotency policy.
- Evidence: PR #103 (merged); route-access policy, pagination middleware, tenant authorization tests, and focused AUDIT-3 workflow.
- Remaining / next action: Jalankan authorization-negative, cross-tenant, retry/concurrency, public abuse, dan reverse-proxy client-IP validation pada persistent staging.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-4-PUBLIC-SECURITY-CONTROLS — CORS, headers, and public-route policy

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-4 source-level public API security.
- Change: Menambahkan threat model, public endpoint inventory, strict credentialed CORS validation, API/web response-header baseline, dan policy throttle untuk public mutation route.
- Evidence: PR #104 (merged); focused AUDIT-4 security workflow and documentation.
- Remaining / next action: Session-boundary remediation dilanjutkan oleh PR #115; ingress/TLS/proxy/upload/runtime security tetap menunggu issue #112 staging validation.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-INITIAL-TENANT-GUARDS — First database tenant-link protections

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-5 confirmed cross-tenant references.
- Change: Menambahkan PostgreSQL `BEFORE INSERT OR UPDATE` guards untuk initial P1 tenant-owned links serta foreign-key restrict untuk file metadata reference.
- Evidence: PR #71 (merged); migration `20260628000200_enforce_tenant_link_guards`; AUDIT-5 findings register.
- Remaining / next action: Perluas guard ke population/BUMDes/identity relationships dan verifikasi dengan intentional invalid writes.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-POPULATION-BUMDES-GUARDS — Tenant hierarchy and financial links

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-5 population hierarchy and BUMDes financial integrity.
- Change: Menambahkan database guards untuk neighborhood unit, address, resident, family membership, civil event, RT/RW-to-dusun invariant, dan BUMDes financial record tenant ownership.
- Evidence: PR #74 (merged); migration `20260628000300_enforce_population_tenant_link_guards`.
- Remaining / next action: Tambahkan runtime PostgreSQL invalid-write gate dan identity-scope protections.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-POSTGRES-INTEGRATION-GATE — Trigger runtime proof

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-5 PostgreSQL tenant-link guard execution.
- Change: Menambahkan integration gate yang menerapkan migration pada PostgreSQL, menjalankan preflight, lalu mencoba valid dan invalid cross-tenant writes di rollback-only transactions agar trigger dibuktikan pada runtime database.
- Evidence: PR #75 (merged); `Tenant Link Integrity` workflow and PostgreSQL fixture script.
- Remaining / next action: Tambahkan guard relationship yang tersisa dan lakukan preflight pada dataset historis sebelum deploy persisten.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-IDENTITY-GUARDS — User role, notification, and complaint scope

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-5 identity tenant integrity.
- Change: Menambahkan exact tenant-scope guards untuk user-role grants, notification recipient, complaint reporter/assignee, dan complaint-response responder serta mencegah parent tenant drift yang menginvalidasi dependent links.
- Evidence: PR #81 (merged); migration `20260628000400_enforce_identity_tenant_link_guards`; rollback-only database assertions.
- Remaining / next action: Lengkapi report/export, deletion, ledger, dan operational evidence tanpa melemahkan identity-scope rule.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-REPORT-EXPORT-BOUNDARIES — Tenant reads and query validation

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-5 report/export tenant isolation and input boundaries.
- Change: Menambahkan regression tests untuk tenant-scoped report reads/XLSX/CSV export, memastikan tenant scope berhenti sebelum database bila hilang, dan memvalidasi finance year/audit day-window pada controller boundary.
- Evidence: PR #82 and PR #83 (merged); report/export isolation record and query validation tests.
- Remaining / next action: Buktikan planner dan representative-data behavior, lalu jalankan report/export flows pada persistent staging.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-BUMDES-HISTORY — Accounting retention protection

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-5 BUMDes financial history.
- Change: Mengganti destructive cascade pada BUMDes unit dengan `ON DELETE RESTRICT`, memaksa status inactive untuk unit yang memiliki history, dan memetakan concurrent FK conflict ke safe conflict response.
- Evidence: PR #85 (merged); service regression coverage and PostgreSQL assertion for `SQLSTATE 23503`.
- Remaining / next action: Rekonsiliasi dengan migration/release preflight dan persistent staging migration lock validation.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-SOFT-DELETE-RECONCILIATION — Household link cleanup

- Status: `In Progress` → `In Progress`
- Scope: AUDIT-5 resident soft-delete lifecycle.
- Change: Membersihkan historical family links untuk resident yang sudah deleted, menghapus membership/head/family link saat `deleted_at` berubah, dan mewajibkan re-assignment eksplisit saat restore.
- Evidence: PR #87 (merged); migration `20260628000700_clean_soft_deleted_resident_links`; rollback-only PostgreSQL fixture and regression coverage.
- Remaining / next action: Pastikan backup tervalidasi sebelum migration reconciliation dan jalankan preflight terhadap dataset historis.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`

### 2026-06-29 — AUDIT-5-REPOSITORY-GATES — Query plan and storage-cleanup evidence

- Status: `In Progress` → `Validation Pending`
- Scope: AUDIT-5 report/export planner, storage cleanup, and repository-level closure evidence.
- Change: Menambahkan tenant-leading indexes, PostgreSQL 17 executed query-plan workflow, report/export plan checks, storage-cleanup queue health/failure telemetry, retry/retained-failure evidence, dan composite-FK evaluation.
- Evidence: PR #92 (merged); `AUDIT-5 Query Plan Evidence`, `Tenant Link Integrity`, storage cleanup observability record, and AUDIT-5 documentation.
- Remaining / next action: Jalankan historical-data preflight, representative dataset query evidence, worker log/alert verification, outage-and-recovery drill, serta persistent staging migration-lock validation.
- Execution mode: `VPS_REQUIRED`
- Provider / operator: `Historical backfill`
- Secrets/PII: `None recorded`
