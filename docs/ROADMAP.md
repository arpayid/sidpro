# SIDPRO Roadmap dan Audit Program

Dokumen ini adalah sumber ringkasan status audit, evidence, dan urutan hardening SIDPRO.

> Audit hanya boleh `Closed` bila scope, temuan, bukti validasi, pekerjaan tersisa, serta kebutuhan environment nyata telah direkonsiliasi. CI/Docker smoke bukan bukti staging atau production persisten.

## Snapshot

- Repository: `arpayid/sidpro`.
- AUDIT-1 source review: PR #95 merge `df36623615148124b7e52972712496b1f9bb0786`.
- AUDIT-2 baseline/remediation: PR #97, #98, #100, and PR #106 second coverage/critical-path/maintainability controls.
- AUDIT-3 source review: PR #103 menambah inventory 26 controller, access policy, bounded pagination, service-authorization register, dan compatibility/idempotency policy.
- AUDIT-4 source review: PR #104 adds threat model, public endpoint inventory, strict credentialed CORS validation, API/web response headers, and public-mutation throttle policy. PR #115 merged the HttpOnly refresh-session boundary; issue #112 owns persistent staging verification.
- AUDIT-6 source review: PR #109 added callback/accessibility/state controls; PR #117 added the manual staging probe and validation runbook. Issue #108 remains the browser/responsive/role validation record.
- Semua audit yang belum `Closed` memiliki marker dan next action di [AUDIT CLI Handoff](audits/AUDIT_CLI_HANDOFF.md) dan [manifest JSON](audits/AUDIT_CLI_HANDOFF.json).
- Tanggal pembaruan: 29 Juni 2026.

## Status Register

| Audit | Status | Evidence / Next action |
| --- | --- | --- |
| AUDIT-0 | `In Progress` | Tata kelola evidence, roadmap, dan handoff marker. |
| AUDIT-1 | `Validation Pending` | Static architecture controls selesai; butuh topology/runtime validation pada staging persisten. |
| AUDIT-2 | `Validation Pending` | Dua coverage baseline, critical-path suite, lint/dependency governance, dan maintainability baseline ada; inspeksi artefak pertama dan trend berikutnya sebelum ratchet. |
| AUDIT-3 | `Validation Pending` | Source inventory, access posture, pagination, authorization exception, dan compatibility policy sudah dicatat; butuh staging API/domain validation. |
| AUDIT-4 | `Validation Pending` | HttpOnly refresh-session boundary sudah merged; #112 membutuhkan validasi HTTPS/proxy/CORS/origin/session pada staging persisten. |
| AUDIT-5 | `Validation Pending` | Tenant/database/query-plan source evidence ada; butuh preflight dan recovery/query validation pada staging persisten. |
| AUDIT-6 | `Validation Pending` | Route/UI inventory, callback guard, accessibility/state baseline, dan probe staging ada; #108 membutuhkan browser/responsive/role validation pada staging. |
| AUDIT-7 | `Evidence Partial` | CI/release controls ada; deployment/rollback/observability staging belum dibuktikan. |
| AUDIT-8 | `Evidence Partial` | CI backup/restore ada; restore drill persisten dan RPO/RTO belum dicatat. |
| AUDIT-9 | `Not Formally Assessed` | Workload/SLA/capacity benchmark belum ditetapkan. |
| AUDIT-10 | `Evidence Partial` | UAT, cutover, training, dan sign-off belum ada. |

## Prioritas

1. **AUDIT-1, AUDIT-3, AUDIT-4, AUDIT-5, dan AUDIT-6 `VPS_REQUIRED`:** ketika staging persisten tersedia, validasi topology, authorization/tenant/retry behavior, HttpOnly session/CORS/TLS/origin/proxy, historical-data preflight, query/recovery, serta browser role/accessibility/responsive journey #108.
2. **AUDIT-2 `VALIDATION_PENDING`:** inspeksi maintainability artifact dan review trend berikutnya; jangan pasang threshold mekanis sebelum klasifikasi metrik stabil.
3. **AUDIT-7 dan AUDIT-8 `VPS_REQUIRED`:** deployment/rollback/observability dan restore drill PostgreSQL/MinIO.
4. **AUDIT-9 dan AUDIT-10:** memerlukan workload/UAT criteria dan staging yang memadai.

## Update Rules

Setiap PR audit harus memperbarui dokumen audit spesifik, register bila status berubah, roadmap bila prioritas berubah, dan handoff marker bila execution mode/next action berubah. Audit yang tidak `Closed` wajib mempertahankan marker yang sesuai.

## Documents

- [Audit Master Register](audits/AUDIT_MASTER_REGISTER.md)
- [AUDIT CLI Handoff](audits/AUDIT_CLI_HANDOFF.md)
- [AUDIT-1 Repository and Architecture](audits/AUDIT-1-REPOSITORY-ARCHITECTURE.md)
- [AUDIT-2 Dependency and Code Quality](audits/AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [AUDIT-2 Critical-Path Expectations](audits/AUDIT-2-CRITICAL-PATH-TEST-EXPECTATIONS.md)
- [AUDIT-2 Maintainability Policy](audits/AUDIT-2-MAINTAINABILITY-POLICY.md)
- [AUDIT-3 API and Domain Logic](audits/AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-4 Security](audits/AUDIT-4-SECURITY.md)
- [AUDIT-4 Session Boundary](audits/AUDIT-4-SESSION-BOUNDARY.md)
- [AUDIT-5 Database and Tenant Integrity](audits/AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [AUDIT-6 Frontend](audits/AUDIT-6-FRONTEND.md)
- [AUDIT-6 Route and UI Inventory](audits/AUDIT-6-ROUTE-UI-INVENTORY.md)
- [AUDIT-6 Staging Validation Runbook](audits/AUDIT-6-STAGING-VALIDATION-RUNBOOK.md)
- [CI Merge Gate](CI_MERGE_GATE.md)
- [Security Audit Automation](SECURITY_AUDIT.md)
