# SIDPRO Roadmap dan Audit Program

Dokumen ini adalah sumber ringkasan status audit, evidence, dan urutan hardening SIDPRO.

> Audit hanya boleh `Closed` bila scope, temuan, bukti validasi, pekerjaan tersisa, serta kebutuhan environment nyata telah direkonsiliasi. CI/Docker smoke bukan bukti staging atau production persisten.

## Snapshot

- Repository: `arpayid/sidpro`.
- **AUDIT-1 — architecture:** PR #93 menetapkan boundary policy/ADR/exception register; PR #95 memindahkan shared address resolution ke `core/addressing`; PR #96 merekonsiliasi dependency map dan status menjadi `Validation Pending`. Persistent staging topology tetap diperlukan.
- **AUDIT-2 — quality:** PR #97 baseline dependency/coverage, #98 governance exception/lint, #100 transitive advisory remediation, #106 critical-path/maintainability baseline, dan #116 maintainability triage/email fallback. Issue #107 closed; #111 adalah backlog refactor non-blocking.
- **AUDIT-3 — API/domain:** PR #103 menambah inventory 26 controller, access policy, bounded pagination, service-authorization register, serta compatibility/idempotency policy. Persistent authorization/tenant/retry/proxy validation masih wajib.
- **AUDIT-4 — security:** PR #104 menambah threat model, strict credentialed CORS, header baseline, dan public-mutation throttle policy. PR #115 merge `474901eb92e8094b2f1b51bd7c0f4068c728d8a0` mengganti refresh credential browser-readable dengan sesi refresh `HttpOnly`; issue #105 closed. Issue #112 adalah security release gate pada persistent staging.
- **AUDIT-5 — database/tenant integrity:** PR #71, #74, #75, #81, #82, #83, #85, #87, dan #92 menambahkan database tenant-link guard, PostgreSQL integration gate, report/export isolation and query validation, BUMDes history retention, soft-delete reconciliation, query-plan evidence, serta storage-cleanup observability. Historical-data preflight dan persistent staging/recovery evidence masih wajib.
- **AUDIT-6 — frontend:** route/UI inventory, safe login callback, admin loading/error states, semantic navigation baseline, and focused frontend policy CI are versioned. PR #117 menambah probe staging non-destruktif; PR #118 merge `6bc907bc45182049b60d290527b817a5723531d9` membatasi artifact probe ke allowlist header dan menambahkan self-test redaction. Issue #108 tetap membutuhkan browser/staging validation; issue #110 mengotomasi journey stabil sesudahnya.
- Semua audit yang belum `Closed` memiliki marker dan next action di [AUDIT CLI Handoff](audits/AUDIT_CLI_HANDOFF.md), manifest JSON, dan [Audit Change Ledger](audits/AUDIT_CHANGELOG.md).
- Tanggal rekonsiliasi: 29 Juni 2026.

## Status Register

| Audit | Status | Evidence / Next action |
| --- | --- | --- |
| AUDIT-0 | `In Progress` | Tata kelola evidence, roadmap, handoff marker, dan change ledger lintas provider. |
| AUDIT-1 | `Validation Pending` | Architecture boundary, core addressing, dependency map, dan exception register telah versioned; butuh topology/runtime staging validation. |
| AUDIT-2 | `Validation Pending` | Dependency/coverage/lint/critical-path/maintainability controls dan triage telah versioned; review schema-v2 trend sebelum ratchet. |
| AUDIT-3 | `Validation Pending` | Controller inventory, access posture, pagination, authorization exception, dan compatibility policy telah dicatat; butuh staging API/domain validation. |
| AUDIT-4 | `Validation Pending` | CORS/header/public policy dan HttpOnly source boundary telah merged; issue #112 membutuhkan staging session/security evidence. |
| AUDIT-5 | `Validation Pending` | Tenant guard, PostgreSQL runtime gate, report/export evidence, accounting/history protection, dan observability controls telah versioned; butuh preflight/recovery/query staging validation. |
| AUDIT-6 | `Validation Pending` | Route/UI inventory, callback guard, admin loading/error, shell accessibility policy, focused CI, serta sanitized staging probe ada; #108 membutuhkan browser/responsive/role validation dan #110 automation sesudah kontrak stabil. |
| AUDIT-7 | `Evidence Partial` | CI/release controls ada; deployment/rollback/observability staging belum dibuktikan. |
| AUDIT-8 | `Evidence Partial` | CI backup/restore ada; restore drill persisten dan RPO/RTO belum dicatat. |
| AUDIT-9 | `Not Formally Assessed` | Workload/SLA/capacity benchmark belum ditetapkan. |
| AUDIT-10 | `Evidence Partial` | UAT, cutover, training, dan sign-off belum ada. |

## Prioritas

1. **Persistent staging release gate:** deploy commit `main` pada HTTPS staging dengan account/tenant fixture non-production, test inbox, object storage fixture, rollback plan, dan evidence location.
2. **AUDIT-4 / issue #112 `VPS_REQUIRED`:** validasi login/2FA/reload/restart/refresh rotation/logout, cookie `HttpOnly`/`Secure`/`SameSite`, CORS/CSRF, proxy/CDN, token leakage, dan rollback.
3. **AUDIT-6 / issue #108 `VPS_REQUIRED`:** validasi role/tenant, direct route, keyboard/screen reader, 320px/768px/desktop, loading/error/upload/tracking/export, dan browser storage.
4. **AUDIT-6 / issue #110 `VPS_REQUIRED`:** setelah #112 dan #108 menghasilkan kontrak stabil, tambahkan browser journey automation dengan secrets/fixtures staging yang tidak pernah di-commit.
5. **AUDIT-1, AUDIT-3, AUDIT-5, AUDIT-7, dan AUDIT-8 `VPS_REQUIRED`:** topology, API authorization/tenant/retry behavior, historical-data preflight, query plan, recovery drill, deployment/rollback/observability, dan restore evidence.
6. **AUDIT-2 `VALIDATION_PENDING`:** bandingkan artifact maintainability schema-v2 dengan satu trend berikutnya; #111 hanya dikerjakan sebagai refactor kecil yang test-backed dan bukan blocker release.
7. **AUDIT-9 dan AUDIT-10:** memerlukan workload/UAT criteria dan staging yang memadai.

## Update Rules

Setiap PR audit harus memperbarui dokumen audit spesifik, register bila status berubah, roadmap bila prioritas berubah, handoff marker bila execution mode/next action berubah, dan [Audit Change Ledger](audits/AUDIT_CHANGELOG.md) untuk perubahan material. Audit yang tidak `Closed` wajib mempertahankan marker yang sesuai.

Setiap provider AI atau operator harus memulai dari [AI Provider Handoff Protocol](audits/AI_PROVIDER_HANDOFF_PROTOCOL.md), bukan dari ringkasan chat. Provider tidak boleh mengulang pekerjaan yang berstatus `Closed`, `Validation Pending`, atau `Blocked by Environment` tanpa bukti baru yang dijelaskan pada ledger.

## Documents

- [Audit Master Register](audits/AUDIT_MASTER_REGISTER.md)
- [Audit Change Ledger](audits/AUDIT_CHANGELOG.md)
- [AI Provider Handoff Protocol](audits/AI_PROVIDER_HANDOFF_PROTOCOL.md)
- [AUDIT CLI Handoff](audits/AUDIT_CLI_HANDOFF.md)
- [AUDIT-1 Repository and Architecture](audits/AUDIT-1-REPOSITORY-ARCHITECTURE.md)
- [AUDIT-2 Dependency and Code Quality](audits/AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [AUDIT-2 Critical-Path Expectations](audits/AUDIT-2-CRITICAL-PATH-TEST-EXPECTATIONS.md)
- [AUDIT-2 Maintainability Policy](audits/AUDIT-2-MAINTAINABILITY-POLICY.md)
- [AUDIT-3 API and Domain Logic](audits/AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-4 Security](audits/AUDIT-4-SECURITY.md)
- [AUDIT-5 Database and Tenant Integrity](audits/AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [AUDIT-6 Frontend](audits/AUDIT-6-FRONTEND.md)
- [AUDIT-6 Route and UI Inventory](audits/AUDIT-6-ROUTE-UI-INVENTORY.md)
- [AUDIT-6 Staging Validation Runbook](audits/AUDIT-6-STAGING-VALIDATION-RUNBOOK.md)
- [CI Merge Gate](CI_MERGE_GATE.md)
- [Security Audit Automation](SECURITY_AUDIT.md)
