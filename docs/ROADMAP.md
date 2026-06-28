# SIDPRO Roadmap dan Audit Program

Dokumen ini adalah ringkasan sumber-kebenaran untuk status audit, pekerjaan hardening, dan kesiapan rilis SIDPRO.

> **Prinsip utama:** tidak ada audit yang boleh diberi status `Closed` hanya karena ada satu atau beberapa pull request yang relevan. Status `Closed` memerlukan scope yang terdokumentasi, temuan yang direkonsiliasi, bukti validasi, dan tidak adanya pekerjaan tersisa yang diketahui dalam scope audit tersebut.

## Snapshot Saat Ini

- **Repository:** `arpayid/sidpro`
- **Source revision reviewed for AUDIT-1:** PR #95 merge commit `df36623615148124b7e52972712496b1f9bb0786`.
- **Source revision reviewed for AUDIT-2 baseline:** PR #96 merge commit `b6a09b6fc574f658b89a6eb7db3ef7693dcd22d8`, plus the current AUDIT-2 evidence PR.
- **Tanggal pembaruan bukti:** 29 Juni 2026.
- **Catatan lingkungan:** belum ada bukti eksekusi pada staging atau production persisten di register ini. Bukti CI Docker/Compose bukan pengganti bukti staging atau production.

## Definisi Status

| Status | Makna |
| --- | --- |
| `Not Formally Assessed` | Belum ada scope audit, temuan, dan bukti closure yang dicatat sebagai satu audit formal. Ini **bukan** klaim bahwa area belum pernah disentuh. |
| `Evidence Partial` | Ada kontrol, tes, dokumen, atau PR relevan; tetapi belum cukup untuk menyatakan audit area tersebut selesai menyeluruh. |
| `In Progress` | Scope audit dan pekerjaan tersisa telah dicatat; perbaikan atau validasi masih berjalan. |
| `Blocked by Environment` | Validasi memerlukan environment, data, atau akses yang belum tersedia. Status ini hanya dipakai jika blocker dicatat secara eksplisit. |
| `Validation Pending` | Implementasi ada, tetapi bukti validasi yang disyaratkan oleh scope audit belum tersedia. |
| `Closed` | Scope, temuan, bukti, dan kriteria closure terdokumentasi; tidak ada pekerjaan tersisa yang diketahui dalam scope tersebut. |

Tidak ada status `Closed` dalam baseline ini.

## Ringkasan Register Audit

| Audit | Fokus Program | Status Tercatat | Bukti yang Tercatat | Rujukan Detail |
| --- | --- | --- | --- | --- |
| AUDIT-0 | Evidence baseline dan tata kelola audit | `In Progress` | Register dan kebijakan pembaruan diperkenalkan oleh dokumen ini. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-0--evidence-baseline-dan-tata-kelola) |
| AUDIT-1 | Repository dan arsitektur | `Validation Pending` | Monorepo inventory, dependency graph, architecture decisions, source/manifest boundary gate, shared core addressing, dan dependency-map review pada source repository telah direkonsiliasi. Focused architecture workflow juga berjalan saat bukti AUDIT-1/roadmap berubah. | [AUDIT-1 Architecture](audits/AUDIT-1-REPOSITORY-ARCHITECTURE.md) |
| AUDIT-2 | Dependency dan code quality | `In Progress` | Formal scope, dependency/code-quality findings, dan reproducible Node test-coverage log artifact telah ditambahkan. Dependency exception governance, coverage threshold, lint-warning inventory, dan maintainability scan masih terbuka. | [AUDIT-2 Dependency and Code Quality](audits/AUDIT-2-DEPENDENCY-CODE-QUALITY.md) |
| AUDIT-3 | API dan domain logic | `Evidence Partial` | Ada perbaikan/regression test terarah, tetapi belum ada inventaris dan closure audit seluruh API/domain. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-3--api-dan-domain-logic) |
| AUDIT-4 | Security | `Evidence Partial` | Security Audit, dependency scan, secret scan, hardening refresh-token, dan guard permissions tercatat. Audit keamanan menyeluruh belum ditutup. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-4--security) |
| AUDIT-5 | Database dan tenant integrity | `Validation Pending` | Tenant-link guards, finance ledger, CI query-plan evidence, and cleanup worker retry/health logs are implemented; validation against historical and persistent environments remains open. | [AUDIT-5 Database](audits/AUDIT-5-DATABASE-TENANT-INTEGRITY.md) |
| AUDIT-6 | Frontend | `Not Formally Assessed` | Belum ada laporan audit frontend formal di register. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-6--frontend) |
| AUDIT-7 | DevOps dan delivery | `Evidence Partial` | CI merge gate, production smoke, dan guarded production release gate tersedia; belum ada bukti operasi pada environment persisten. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-7--devops-dan-delivery) |
| AUDIT-8 | Backup dan recovery | `Evidence Partial` | Backup PostgreSQL/MinIO serta restore verification dijalankan pada CI; restore drill staging/production belum dicatat. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-8--backup-dan-recovery) |
| AUDIT-9 | Performance dan scale | `Not Formally Assessed` | AUDIT-5 has query-plan evidence, but AUDIT-9 has not received a formal workload or capacity scope. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-9--performance-dan-scale) |
| AUDIT-10 | UAT dan commercial readiness | `Evidence Partial` | Production readiness dan client-handover checklist ada; bukti UAT/cutover nyata belum dicatat. | [Master Register](audits/AUDIT_MASTER_REGISTER.md#audit-10--uat-dan-commercial-readiness) |

## Prioritas Saat Ini

1. **AUDIT-2 `In Progress`:** review first coverage artifact, catat baseline per package/workflow kritis, lalu susun threshold ratchet. Buat dependency exception register untuk setiap advisory yang di-ignore dan tentukan manifest-version policy sebelum normalisasi dependency.
2. **AUDIT-1 tetap `Validation Pending`:** saat persistent staging tersedia, validasi dan catat topology proses web/API/worker, health/readiness, konfigurasi runtime, dan contract queue/storage. Source-level dependency review sudah selesai; pekerjaan issue #94 tidak diulang.
3. **AUDIT-5 tetap `Validation Pending`:** historical-data preflight, real query-plan evidence, object cleanup recovery drill, dan log alert membutuhkan environment persisten.
4. **Lanjut AUDIT-3 dan AUDIT-4 setelah AUDIT-2 baseline stabil:** pekerjaan hardening terdahulu adalah evidence, bukan closure otomatis.
5. **Buka AUDIT-9 setelah scope workload disepakati:** query-plan fixture tidak menggantikan benchmark, latency target, export memory profile, atau capacity planning.

## Aturan Pembaruan Roadmap

Setiap pull request harus menyatakan dampak roadmap dengan format yang dijelaskan di [Roadmap Update Policy](audits/ROADMAP_UPDATE_POLICY.md). Bila PR menutup temuan, menemukan risiko baru, menambah bukti validasi, atau mengubah prioritas, dokumen audit terkait dan register ini harus diperbarui dalam PR yang sama.

PR yang tidak mengubah status atau bukti roadmap tetap wajib menyatakan `No roadmap impact` beserta alasan singkat di bagian **Roadmap Impact**.

## Dokumen Terkait

- [Audit Master Register](audits/AUDIT_MASTER_REGISTER.md)
- [Roadmap Update Policy](audits/ROADMAP_UPDATE_POLICY.md)
- [AUDIT-1 — Repository and Architecture](audits/AUDIT-1-REPOSITORY-ARCHITECTURE.md)
- [AUDIT-1 — Dependency Graph](audits/AUDIT-1-DEPENDENCY-GRAPH.md)
- [AUDIT-2 — Dependency and Code Quality](audits/AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [AUDIT-5 — Database and Tenant Integrity](audits/AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [AUDIT-5 — Composite Foreign-Key Evaluation](audits/AUDIT-5-COMPOSITE-FK-EVALUATION.md)
- [AUDIT-5 — Report and Export Tenant Isolation](audits/AUDIT-5-REPORT-EXPORT-ISOLATION.md)
- [AUDIT-5 — Report and Export Query-Plan Evidence](audits/AUDIT-5-REPORT-EXPORT-PERFORMANCE-EVIDENCE.md)
- [AUDIT-5 — Storage Cleanup Observability and Retry](audits/AUDIT-5-STORAGE-CLEANUP-OBSERVABILITY.md)
- [Production Readiness Checklist](PRODUCTION_READINESS.md)
- [CI Merge Gate](CI_MERGE_GATE.md)
- [Security Audit Automation](SECURITY_AUDIT.md)
