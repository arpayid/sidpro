# SIDPRO Audit Change Ledger

Ledger ini adalah riwayat material audit. Git history tetap sumber detail perubahan; setiap entry di bawah mencatat trace, status, evidence, dan tindakan berikutnya.

## Aturan Penggunaan

1. Tambahkan trace pada PR yang sama untuk setiap completion, mitigation, blocker, rollout, rollback, atau validasi.
2. Jangan menghapus trace; koreksi dengan entry baru yang menyebut trace sebelumnya.
3. `Closed` hanya boleh dipakai setelah closure evidence tersedia.
4. Jangan menyimpan credentials, cookie, token, data penduduk, atau PII pada evidence repository.

## Entries

| Trace ID | Status | Scope dan evidence | Remaining action | Mode |
| --- | --- | --- | --- | --- |
| AUDIT-4-SESSION-BOUNDARY | `In Progress` → `Validation Pending` | Browser refresh credential boundary; PR #115 merge `474901eb92e8094b2f1b51bd7c0f4068c728d8a0`; session/cookie regression tests. | Issue #112 pada persistent HTTPS staging. | `VPS_REQUIRED` |
| AUDIT-2-MAINTAINABILITY-TRIAGE | `In Progress` → `Validation Pending` | AUDIT-2 hotspot triage dan safe email fallback; PR #116 merge `ee9d13e41bdd6a2f0623ad5c58808b120eca2e9a`. | Bandingkan artifact schema-v2 dengan trend berikutnya; #111 scoped/test-backed. | `REPO_CI_READY` |
| AUDIT-6-STAGING-EVIDENCE | `Resolved in Source` → `Validation Pending` | Sanitized staging probe; PR #118 merge `6bc907bc45182049b60d290527b817a5723531d9`. | Jalankan pada persistent staging; tidak menutup #108/#110/#112 tanpa browser evidence. | `VPS_REQUIRED` |
| AUDIT-0-ROADMAP-RECONCILIATION | `In Progress` → `In Progress` | Register, roadmap, handoff, provider protocol, dan trace requirement direkonsiliasi. | Setiap PR material menyelaraskan register/roadmap/handoff/ledger. | `REPO_DOCS` |

## Historical Backfill — AUDIT-1 sampai AUDIT-5

| Trace ID | Status | Evidence | Remaining action |
| --- | --- | --- | --- |
| AUDIT-1-ARCHITECTURE-BASELINE | `Not Formally Assessed` → `In Progress` | PR #93; architecture boundary policy dan focused workflow. | Pertahankan gate dan lanjutkan remediation dependency. |
| AUDIT-1-ADDRESSING-CORE | `In Progress` → `In Progress` | PR #95; core address ownership dan regression tests. | Validasi dependency map dan runtime topology. |
| AUDIT-1-DEPENDENCY-MAP | `In Progress` → `Validation Pending` | PR #96; dependency-map reconciliation. | Topology, queue/storage, health, dan runtime staging. |
| AUDIT-2-QUALITY-BASELINE | `Not Formally Assessed` → `In Progress` | PR #97; dependency/coverage/code-quality baseline. | Governance dan remediation tanpa runtime claim. |
| AUDIT-2-GOVERNANCE-BASELINES | `In Progress` → `In Progress` | PR #98; dependency exception/lint inventory. | Advisory/declaration remediation dan critical-path evidence. |
| AUDIT-2-DEPENDENCY-REMEDIATION | `In Progress` → `In Progress` | PR #100; Prisma alignment dan dependency overrides. | Coverage/critical-path/maintainability evidence. |
| AUDIT-2-CRITICAL-PATH-BASELINE | `In Progress` → `Validation Pending` | PR #106; second coverage baseline, named critical-path, maintainability inventory. | Compare schema-v2 trend; #111 only scoped/test-backed. |
| AUDIT-3-API-DOMAIN-SOURCE | `In Progress` → `Validation Pending` | PR #103; controller, access, pagination, authorization, compatibility policy. | Persistent staging authorization/tenant/retry/proxy validation. |
| AUDIT-4-PUBLIC-SECURITY-CONTROLS | `In Progress` → `In Progress` | PR #104; threat model, CORS, headers, public-route throttle policy. | #112 staging security validation. |
| AUDIT-5-INITIAL-TENANT-GUARDS | `In Progress` → `In Progress` | PR #71; initial tenant-link PostgreSQL guards. | Expand guards and verify invalid writes. |
| AUDIT-5-POPULATION-BUMDES-GUARDS | `In Progress` → `In Progress` | PR #74; population hierarchy/BUMDes integrity guards. | Runtime invalid-write gate and identity scope. |
| AUDIT-5-POSTGRES-INTEGRATION-GATE | `In Progress` → `In Progress` | PR #75; PostgreSQL trigger runtime proof. | Historical preflight before persistent deploy. |
| AUDIT-5-IDENTITY-GUARDS | `In Progress` → `In Progress` | PR #81; user-role, notification, complaint scope guards. | Report/export, deletion, ledger, and operational evidence. |
| AUDIT-5-REPORT-EXPORT-BOUNDARIES | `In Progress` → `In Progress` | PR #82/#83; tenant report/export tests and validation. | Planner and representative-data staging validation. |
| AUDIT-5-BUMDES-HISTORY | `In Progress` → `In Progress` | PR #85; accounting retention protection. | Migration/release preflight and staging migration lock. |
| AUDIT-5-SOFT-DELETE-RECONCILIATION | `In Progress` → `In Progress` | PR #87; household-link cleanup and regression coverage. | Backup validation and historical preflight. |
| AUDIT-5-REPOSITORY-GATES | `In Progress` → `Validation Pending` | PR #92; query plan and storage-cleanup observability. | Historical preflight, query evidence, recovery drill, and worker-log validation. |

### 2026-07-01 — AUDIT-7-10-EXECUTION-CONTRACTS — Versioned delivery, recovery, scale, and cutover contracts

- Status: `In Progress` → `In Progress`; AUDIT-7/AUDIT-8/AUDIT-10 remain `Evidence Partial`, and AUDIT-9 remains `Not Formally Assessed`.
- Scope: AUDIT-0 governance and AUDIT-7 through AUDIT-10 execution contracts.
- Change: Added dedicated runbooks for delivery/rollback, backup/recovery, performance/scale, and UAT/cutover; reconciled register, roadmap, and handoff entrypoints.
- Evidence: PR #154; `AUDIT-7-DEVOPS-DELIVERY.md`, `AUDIT-8-BACKUP-RECOVERY.md`, `AUDIT-9-PERFORMANCE-SCALE.md`, `AUDIT-10-UAT-CUTOVER-READINESS.md`, `AUDIT_MASTER_REGISTER.md`, `AUDIT_CLI_HANDOFF.*`, and `docs/ROADMAP.md`.
- Remaining / next action: Execute the documented staging delivery, restore, benchmark, and UAT/cutover work; do not claim environment validation or owner acceptance without required evidence.
- Execution mode: `REPO_DOCS`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`

### 2026-07-01 — AUDIT-2-TREND-2026-06-30 — First comparable schema-v2 trend

- Status: `Validation Pending` → `Validation Pending`.
- Scope: AUDIT-2 dependency, code-quality, coverage, and maintainability evidence.
- Change: Recorded the 30 June 2026 artifact comparison. No coverage ratchet, maintainability threshold, or mechanical refactor was introduced.
- Evidence: PR #155 and `AUDIT-2-TREND-2026-06-30.md`.
- Remaining / next action: Collect one further comparable schema-v2 maintainability and coverage trend before proposing a package-specific ratchet; keep #111 limited to scoped test-backed refactors.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`
