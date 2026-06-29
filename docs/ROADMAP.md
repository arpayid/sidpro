# SIDPRO Roadmap dan Audit Program

Dokumen ini adalah sumber ringkasan status audit, evidence, dan urutan hardening SIDPRO.

> Audit hanya boleh `Closed` bila scope, temuan, bukti validasi, pekerjaan tersisa, serta kebutuhan environment nyata telah direkonsiliasi. CI/Docker smoke bukan bukti staging atau production persisten.

## Snapshot

- Repository: `arpayid/sidpro`.
- AUDIT-1 source review: PR #95 merge `df36623615148124b7e52972712496b1f9bb0786`.
- AUDIT-2 baseline/remediation: PR #97, #98, dan #100.
- AUDIT-3 source review: PR #103 menambah inventory 26 controller, access policy, bounded pagination, service-authorization register, dan compatibility/idempotency policy.
- AUDIT-4 source review: current PR adds threat model, public endpoint inventory, strict credentialed CORS validation, API/web response headers, and a public-mutation throttle policy. Issue #105 tracks the remaining browser token/session-boundary remediation.
- Semua audit yang belum `Closed` memiliki marker dan next action di [AUDIT CLI Handoff](audits/AUDIT_CLI_HANDOFF.md) dan [manifest JSON](audits/AUDIT_CLI_HANDOFF.json).
- Tanggal pembaruan: 29 Juni 2026.

## Status Register

| Audit | Status | Evidence / Next action |
| --- | --- | --- |
| AUDIT-0 | `In Progress` | Tata kelola evidence, roadmap, dan handoff marker. |
| AUDIT-1 | `Validation Pending` | Static architecture controls selesai; butuh topology/runtime validation pada staging persisten. |
| AUDIT-2 | `In Progress` | Dependency/lint/coverage baseline tersedia; lanjut coverage ratchet dan maintainability assessment. |
| AUDIT-3 | `Validation Pending` | Source inventory, access posture, pagination, authorization exception, dan compatibility policy sudah dicatat; butuh staging API/domain validation. |
| AUDIT-4 | `In Progress` | Security source policy/hardening tersedia; issue #105 menentukan HttpOnly session boundary sebelum security audit dapat naik ke staging validation. |
| AUDIT-5 | `Validation Pending` | Tenant/database/query-plan source evidence ada; butuh preflight dan recovery/query validation pada staging persisten. |
| AUDIT-6 | `Not Formally Assessed` | Frontend inventory/accessibility/responsive audit belum formal. |
| AUDIT-7 | `Evidence Partial` | CI/release controls ada; deployment/rollback/observability staging belum dibuktikan. |
| AUDIT-8 | `Evidence Partial` | CI backup/restore ada; restore drill persisten dan RPO/RTO belum dicatat. |
| AUDIT-9 | `Not Formally Assessed` | Workload/SLA/capacity benchmark belum ditetapkan. |
| AUDIT-10 | `Evidence Partial` | UAT, cutover, training, dan sign-off belum ada. |

## Prioritas

1. **AUDIT-4 `REPO_CI_READY`:** pilih dan implementasikan architecture issue #105 untuk menggantikan browser-readable bearer credential storage; kemudian lakukan staging ingress/security validation.
2. **AUDIT-2 `REPO_CI_READY`:** coverage baseline kedua, critical-path expectation, lalu duplication/dead-code/complexity assessment.
3. **AUDIT-6 `REPO_CI_READY`:** frontend inventory, route protection, loading/error/empty states, accessibility, dan responsive baseline.
4. **AUDIT-1, AUDIT-3, dan AUDIT-5 `VPS_REQUIRED`:** ketika staging persisten tersedia, validasi topology, API authorization/tenant/retry behavior, historical-data preflight, query plan, cross-tenant test, serta recovery drill.
5. **AUDIT-7 dan AUDIT-8 `VPS_REQUIRED`:** deployment/rollback/observability dan restore drill PostgreSQL/MinIO.
6. **AUDIT-9 dan AUDIT-10:** memerlukan workload/UAT criteria dan staging yang memadai.

## Update Rules

Setiap PR audit harus memperbarui dokumen audit spesifik, register bila status berubah, roadmap bila prioritas berubah, dan handoff marker bila execution mode/next action berubah. Audit yang tidak `Closed` wajib mempertahankan marker yang sesuai.

## Documents

- [Audit Master Register](audits/AUDIT_MASTER_REGISTER.md)
- [AUDIT CLI Handoff](audits/AUDIT_CLI_HANDOFF.md)
- [AUDIT-1 Repository and Architecture](audits/AUDIT-1-REPOSITORY-ARCHITECTURE.md)
- [AUDIT-2 Dependency and Code Quality](audits/AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [AUDIT-3 API and Domain Logic](audits/AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-4 Security](audits/AUDIT-4-SECURITY.md)
- [AUDIT-4 Threat Model](audits/AUDIT-4-THREAT-MODEL.md)
- [AUDIT-4 Public Endpoint Inventory](audits/AUDIT-4-PUBLIC-ENDPOINT-INVENTORY.md)
- [AUDIT-5 Database and Tenant Integrity](audits/AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [CI Merge Gate](CI_MERGE_GATE.md)
- [Security Audit Automation](SECURITY_AUDIT.md)
