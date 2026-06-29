# SIDPRO Audit Master Register

Dokumen ini mencatat status audit berdasarkan bukti yang versioned di repository. Ketiadaan bukti bukan bukti bahwa area aman atau selesai.

## Aturan Bukti dan Closure

Klaim audit harus ditautkan ke dokumen scope/temuan, PR merged dengan validasi, workflow CI, bukti staging/production versioned, atau keputusan risiko yang disetujui.

Audit hanya boleh `Closed` ketika scope, temuan, tindakan, evidence, residual risk, dan kebutuhan environment nyata telah direkonsiliasi. CI, Docker Compose, dan production-smoke ephemeral tidak menggantikan staging atau production persisten.

## Evidence Lintas-Audit

| Bukti | Relevansi |
| --- | --- |
| [Architecture](../ARCHITECTURE.md) | Modular monolith, batas modul, dan aturan desain. |
| [AUDIT-1 Repository and Architecture](AUDIT-1-REPOSITORY-ARCHITECTURE.md) | Inventory, graph, ADR, exception, dan batas runtime AUDIT-1. |
| [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md) | Coverage/lint/dependency evidence dan quality controls. |
| [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md) | Controller inventory, access posture, pagination, domain evidence, dan staging plan. |
| [AUDIT-3 Authorization Exceptions](AUDIT-3-AUTHORIZATION-EXCEPTIONS.md) | Kontrak service-level authorization tenant management/provisioning. |
| [AUDIT-3 Compatibility and Idempotency](AUDIT-3-API-COMPATIBILITY-IDEMPOTENCY.md) | Policy API `/api/v1`, contract change, dan retry semantics. |
| [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md) | Tenant/database, query plan, storage cleanup, dan environment validation. |
| [CI Merge Gate](../CI_MERGE_GATE.md) | CI, production smoke, dan required checks. |
| [Security Audit](../SECURITY_AUDIT.md) | Dependency audit, Gitleaks, dan security automation. |
| [AI CLI Handoff](AUDIT_CLI_HANDOFF.md) | Queue machine-readable dan mode `REPO_CI_READY`/`VPS_REQUIRED`. |

---

## AUDIT-0 — Evidence Baseline dan Tata Kelola

**Status:** `In Progress`

**Scope:** status audit, evidence links, roadmap update, handoff markers, dan closure discipline.

**Evidence:** master register, roadmap update policy, roadmap, dan AI CLI handoff manifest telah versioned.

**Remaining:** jaga konsistensi seluruh status/marker saat audit baru membuka, menyelesaikan, atau memindahkan pekerjaan ke staging.

---

## AUDIT-1 — Repository dan Arsitektur

**Status:** `Validation Pending`

**Scope:** monorepo, dependency direction, module boundaries, shared packages, dan runtime architecture.

**Source evidence:** inventory/dependency graph, ADR, boundary scanner, and shared `core/addressing` ownership were reconciled through PR #95 and PR #96. The focused boundary workflow runs when relevant source or AUDIT-1 evidence changes.

**Validation pending:** persistent staging must record web/API/worker topology, health/readiness, queue/storage contracts, runtime configuration, and deployed module behavior.

**Non-claim:** static import scanning does not prove runtime DI, variable imports, queues, network/storage, or deployed topology.

---

## AUDIT-2 — Dependency dan Code Quality

**Status:** `In Progress`

**Scope:** dependency hygiene, vulnerability exceptions, lockfile/manifest policy, lint/type/test/build, coverage, maintainability, duplication/dead code/complexity.

**Source evidence:**

- PR #97 added reproducible coverage evidence.
- PR #98 added dependency-exception governance, lint inventory, and a clean warning baseline.
- PR #100 remediated the three recorded moderate transitive advisory paths, aligned Prisma declarations, and regenerated the lockfile through pnpm.
- AUDIT-2 workflow retains coverage, lint, and unignored dependency-audit artifacts.

**Remaining:** comparable coverage baseline, critical-path coverage/rachet decision, and documented duplication/dead-code/complexity assessment with triage policy.

---

## AUDIT-3 — API dan Domain Logic

**Status:** `Validation Pending`

**Scope:** endpoint/controller contract, auth/RBAC, tenant scope, DTO/Zod/query validation, error semantics, domain invariants, audit events, compatibility, idempotency, and high-risk regression evidence.

**Repository-level completion in current PR:**

1. The source inventory contains 26 API controllers grouped by platform/identity, population, village operations, finance/report/letters, and public interaction.
2. `api-route-access-policy.test.ts` requires each inventoried controller to declare a JWT or `@Public()` access marker; the focused AUDIT-3 workflow runs it for relevant changes.
3. `PaginationQueryValidationMiddleware` validates any supplied `page`/`limit` before controller execution while preserving endpoint defaults when absent; negative tests cover zero, negative, non-numeric, and oversized values.
4. Tenant management/provisioning service-level authorization exceptions are registered with OR-based authority rules and regression tests.
5. API compatibility and operation-specific idempotency/retry policy are versioned; generic idempotency middleware is explicitly disallowed until domain contracts are defined.
6. Existing high-risk source evidence includes refresh replay hardening, tenant-scoped reports/export, finance ledger invariants, letter validation/transition controls, storage cleanup, and related audit logs.

**Validation pending outside repository:**

1. Run authorization-negative and cross-tenant tests through persistent staging with real JWT issuance and reverse proxy.
2. Exercise finance, tenant provisioning, letters, public tracking, and refresh retry/concurrency behavior.
3. Validate client-IP/rate-limit identity, public payload limits, upload behavior, and error redaction at deployed ingress.
4. Reconcile results with AUDIT-4, AUDIT-5, AUDIT-7, and AUDIT-9.

**Non-claim:** source/CI evidence does not prove deployed routing, proxy trust, rate-limit identity, queue execution, storage behavior, or client compatibility in production.

---

## AUDIT-4 — Security

**Status:** `Evidence Partial`

**Scope:** authentication, authorization, session lifecycle, secrets, public endpoints, rate limiting, uploads, dependency/secret scanning, secure configuration, and dynamic testing.

**Evidence:** refresh hardening, Security Audit, dependency audit, Gitleaks, Dependabot, permission guard, and selected route throttles exist.

**Remaining:** formal threat model, public endpoint inventory, upload/security control reconciliation, secret/configuration review, and dynamic validation for high-risk findings.

---

## AUDIT-5 — Database dan Tenant Integrity

**Status:** `Validation Pending`

**Scope:** tenant isolation, database integrity, lifecycle, financial auditability, storage metadata, report/export query plans, cleanup recovery, and database performance evidence.

**Repository evidence:** tenant-link guards, finance ledger, PostgreSQL query-plan workflow, composite-FK decision record, report/export tenant isolation, and cleanup worker observability/retry controls are versioned.

**Validation pending:** historical dataset preflight, real query plans, persistent storage-cleanup recovery, log/alert forwarding, outage recovery drill, and migration/index behavior on staging.

---

## AUDIT-6 — Frontend

**Status:** `Not Formally Assessed`

**Scope:** route protection, tenant/permission presentation, data states, forms, accessibility, responsive behavior, and security-sensitive rendering.

**Remaining:** screen inventory, role journeys, loading/error/empty states, responsive coverage, accessibility baseline, and frontend policy evidence.

---

## AUDIT-7 — DevOps dan Delivery

**Status:** `Evidence Partial`

**Scope:** CI/CD, branch protection, container build, deployment, service supervision, configuration, observability, rollback, and operational documentation.

**Evidence:** CI validate, production smoke, Security Audit, and guarded release workflows are documented.

**Remaining:** persistent staging deployment/runbook, active branch ruleset evidence, long-running services, alerting/incident path, and rollback drill.

---

## AUDIT-8 — Backup dan Recovery

**Status:** `Evidence Partial`

**Scope:** PostgreSQL/object storage backup, integrity, restore, retention, access control, RPO/RTO, and restore drill.

**Evidence:** CI release controls create/check backup and restore into ephemeral targets.

**Remaining:** persistent backup location/retention/access evidence, defined RPO/RTO, and periodic end-to-end restore drill on non-production staging.

---

## AUDIT-9 — Performance dan Scale

**Status:** `Not Formally Assessed`

**Scope:** workload/SLA, query/API latency, export memory, queue throughput, storage behavior, capacity, and bottlenecks.

**Evidence:** AUDIT-5 has limited PostgreSQL query-plan fixture evidence.

**Remaining:** agreed workload/data volume/SLA plus staging benchmarks and capacity evidence.

---

## AUDIT-10 — UAT dan Commercial Readiness

**Status:** `Evidence Partial`

**Scope:** role journeys, acceptance criteria, privacy/data readiness, operator documentation, cutover, training, handover, and sign-off.

**Evidence:** production readiness and handover documents exist.

**Remaining:** UAT scenarios/results, defect triage, training evidence, cutover plan, and go/no-go sign-off.

---

## Register Update Rule

For any audit-related PR, update the relevant audit document, this register when status/evidence changes, `docs/ROADMAP.md` when priority changes, and `AUDIT_CLI_HANDOFF.*` when marker/execution mode/next action changes. Do not remove historical findings; update their state and link their treatment.
