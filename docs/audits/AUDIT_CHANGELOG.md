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
| AUDIT-4-SESSION-BOUNDARY | `In Progress` → `Validation Pending` | PR #115; browser refresh credential boundary. | Issue #112 persistent HTTPS staging. | `VPS_REQUIRED` |
| AUDIT-2-MAINTAINABILITY-TRIAGE | `In Progress` → `Validation Pending` | PR #116; hotspot triage dan safe email fallback. | Compare schema-v2 trend; #111 scoped/test-backed. | `REPO_CI_READY` |
| AUDIT-6-STAGING-EVIDENCE | `Resolved in Source` → `Validation Pending` | PR #118; sanitized staging probe. | Persistent staging/browser evidence. | `VPS_REQUIRED` |
| AUDIT-0-ROADMAP-RECONCILIATION | `In Progress` → `In Progress` | Register, roadmap, handoff, provider protocol, dan trace requirement. | Reconcile documents on every material PR. | `REPO_DOCS` |

## Historical Backfill — AUDIT-1 sampai AUDIT-5

| Trace ID | Status | Evidence | Remaining action |
| --- | --- | --- | --- |
| AUDIT-1-ARCHITECTURE-BASELINE | `Not Formally Assessed` → `In Progress` | PR #93. | Preserve boundary gate. |
| AUDIT-1-ADDRESSING-CORE | `In Progress` → `In Progress` | PR #95. | Dependency map/runtime topology. |
| AUDIT-1-DEPENDENCY-MAP | `In Progress` → `Validation Pending` | PR #96. | Persistent staging topology/health/queue/storage. |
| AUDIT-2-QUALITY-BASELINE | `Not Formally Assessed` → `In Progress` | PR #97. | Governance and remediation. |
| AUDIT-2-GOVERNANCE-BASELINES | `In Progress` → `In Progress` | PR #98. | Dependency/lint evidence. |
| AUDIT-2-DEPENDENCY-REMEDIATION | `In Progress` → `In Progress` | PR #100. | Critical-path/maintainability evidence. |
| AUDIT-2-CRITICAL-PATH-BASELINE | `In Progress` → `Validation Pending` | PR #106. | Additional comparable trend; #111 scoped. |
| AUDIT-3-API-DOMAIN-SOURCE | `In Progress` → `Validation Pending` | PR #103. | Authorization/tenant/retry/proxy staging. |
| AUDIT-4-PUBLIC-SECURITY-CONTROLS | `In Progress` → `In Progress` | PR #104. | Issue #112 staging validation. |
| AUDIT-5-INITIAL-TENANT-GUARDS | `In Progress` → `In Progress` | PR #71. | Expand tenant guards. |
| AUDIT-5-POPULATION-BUMDES-GUARDS | `In Progress` → `In Progress` | PR #74. | Runtime invalid-write gate. |
| AUDIT-5-POSTGRES-INTEGRATION-GATE | `In Progress` → `In Progress` | PR #75. | Historical preflight. |
| AUDIT-5-IDENTITY-GUARDS | `In Progress` → `In Progress` | PR #81. | Report/export/deletion evidence. |
| AUDIT-5-REPORT-EXPORT-BOUNDARIES | `In Progress` → `In Progress` | PR #82/#83. | Planner and staging validation. |
| AUDIT-5-BUMDES-HISTORY | `In Progress` → `In Progress` | PR #85. | Release preflight and migration lock. |
| AUDIT-5-SOFT-DELETE-RECONCILIATION | `In Progress` → `In Progress` | PR #87. | Backup validation and preflight. |
| AUDIT-5-REPOSITORY-GATES | `In Progress` → `Validation Pending` | PR #92. | Query evidence, recovery drill, worker-log validation. |

### 2026-07-01 — AUDIT-2-TREND-2026-06-30 — First comparable schema-v2 trend

- Status: `Validation Pending` → `Validation Pending`.
- Scope: AUDIT-2 dependency, code-quality, coverage, and maintainability evidence.
- Change: Recorded the 30 June 2026 artifact comparison. No coverage ratchet, maintainability threshold, or mechanical refactor was introduced.
- Evidence: PR #155 and `AUDIT-2-TREND-2026-06-30.md`.
- Remaining / next action: Collect one further comparable schema-v2 maintainability and coverage trend before proposing a package-specific ratchet; keep #111 limited to scoped test-backed refactors.
- Execution mode: `REPO_CI_READY`
- Provider / operator: `Repository reconciliation`
- Secrets/PII: `None recorded`
