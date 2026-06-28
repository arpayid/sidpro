# AUDIT-1 — Repository and Architecture

**Status:** `Validation Pending` — repository topology, package contracts, import boundaries, shared core address ownership, and the dependency-map source review are versioned. This audit is not `Closed`: persistent staging validation of the deployed web/API/worker topology has not occurred.

## Scope

AUDIT-1 evaluates whether SIDPRO can continue to evolve as a modular monolith without accidental coupling between applications, shared packages, core platform concerns, and business domains.

This audit covers:

1. Monorepo workspace topology and build graph.
2. Responsibilities of `apps/*`, `packages/*`, `prisma`, and `docs`.
3. Backend layering and cross-domain dependencies.
4. Compile-time/runtime import boundaries.
5. Architecture exceptions and decisions that must be visible before release.

It does **not** assess individual API behavior, database integrity, UI correctness, security posture, or production capacity. Those remain AUDIT-2 through AUDIT-10 concerns.

## Current Repository Inventory

| Area | Responsibility | Allowed dependency direction |
| --- | --- | --- |
| `apps/web` | Next.js presentation layer, client state, forms, API client usage | `packages/ui`, `packages/types`, `packages/validators`; communicates with API through HTTP only |
| `apps/api` | NestJS application, authorization, business workflows, database and storage orchestration | `packages/types`, `packages/validators`; owns server-side access to Prisma, queues, storage, and core services |
| `apps/worker` | BullMQ asynchronous processing | `packages/types`; owns job processors and infrastructure adapters needed for jobs |
| `packages/ui` | Framework-level shared UI primitives | React peer dependencies and internal utility dependencies only |
| `packages/types` | Cross-application transport/job/type contracts | No application dependency |
| `packages/validators` | Shared Zod validation contracts | No application dependency |
| `packages/config` | Shared TypeScript and ESLint configuration | Tooling dependencies only |
| `prisma` | Schema, migrations, seed data | Database ownership for `apps/api` and `apps/worker` |
| `docs` | Product, operation, audit, and decision evidence | No runtime dependency |

## Backend Module Inventory

### Platform and core

`database`, `config`, `health`, `common`, `addressing`, `auth`, `users`, `roles`, `permissions`, `tenants`, `audit-logs`, `files`, `storage`, `queue`, `settings`, and `notifications` are platform/core concerns.

Core services may be consumed by domain modules. Core code must not import domain modules because this would reverse the dependency direction and make platform changes depend on business features.

`core/addressing` owns tenant-scoped address creation and territory hierarchy validation used by both population and family workflows.

### Domain modules

`village-profile`, `population`, `families`, `territories`, `civil-events`, `letters`, `complaints`, `cms`, `social-assistance`, `assets`, `development`, `finance`, `reports`, `bumdes`, `assistant`, and `public` are domain or delivery modules.

A domain module may use `common`, `database`, and required core services. A domain module must not directly import another domain module's source files. Cross-domain workflows should use one of these explicitly documented mechanisms:

- a database read model or aggregate query owned by the coordinating module;
- a shared transport/validation contract in `packages/types` or `packages/validators`;
- an event or queue contract for asynchronous work;
- a narrowly scoped exported core service, introduced with an architecture decision and regression coverage.

## Dependency-Map Review — 29 June 2026

**Review scope:** source repository revision `df36623615148124b7e52972712496b1f9bb0786`, the merge commit of PR #95. This is a source-repository review only. It does not claim staging or production validation.

**Method:**

1. Reconcile the NestJS composition root with the documented core and domain inventory.
2. Inspect the executable static-import scanner that walks `apps/api/src`, `apps/web/src`, `apps/worker/src`, and `packages` source roots plus shared-package manifests.
3. Trace the source edges that are architectural exceptions or shared cross-domain capabilities: `families → core/addressing`, `population → core/addressing`, and `reports → Prisma/audit-log read model`.
4. Reconcile the result with the dependency graph, exception register, audit master register, and roadmap.

| Review area | Source evidence | Result |
| --- | --- | --- |
| Composition root | `AppModule` imports the recorded core/platform modules and all documented domain/delivery modules. `AddressingModule` is composed through its consuming domain modules rather than being registered as a root feature. | Inventory is reconciled; no module is added to the graph by this review. |
| Prohibited API source edges | `architecture-boundaries.test.ts` resolves relative and `@/` imports, then rejects `core → domain`, `domain → other domain`, and `common → core/domain` edges. | No undocumented direct domain-to-domain source-import exception is accepted. The dedicated CI gate is the executable evidence. |
| Application and package isolation | The same scanner rejects web/worker/package source-path imports into other deployable applications and rejects shared package manifests that depend on `@sidpro/api`, `@sidpro/web`, or `@sidpro/worker`. | Boundary policy covers both source paths and manifest declarations. |
| Shared address capability | `FamiliesModule` and `PopulationModule` each import `AddressingModule`; both services inject `AddressResolutionService` for embedded address input. | Shared address ownership remains in `core/addressing`; no new population/family direct dependency is introduced. |
| Report aggregation | `ReportsService` reads tenant-scoped aggregates through `PrismaService` and records audit activity through `AuditLogsService`, without importing domain services. | Existing read-model exception remains justified and is retained. |

### Review limits

The scanner is intentionally a static source-import control. It recognizes `from`, literal `import()`, and literal `require()` forms, then resolves API-relative and `@/` imports. It does not prove Nest runtime dependency-injection wiring, queue execution, filesystem/object-storage behavior, external network calls, variable import specifiers, or deployed process topology. Those operational concerns require persistent staging evidence and therefore prevent AUDIT-1 from becoming `Closed`.

## Enforced Import Boundary Rules

`apps/api/test/architecture-boundaries.test.ts` scans source imports and package manifests and rejects:

1. `apps/api/src/core/**` importing `apps/api/src/modules/**`.
2. One backend domain module directly importing another backend domain module.
3. `apps/api/src/common/**` importing core or domain code.
4. `apps/web/src/**` importing source paths from API or worker.
5. `apps/worker/src/**` importing source paths from API or web.
6. `packages/**` importing source paths from any application.
7. Any shared package manifest declaring `@sidpro/api`, `@sidpro/web`, or `@sidpro/worker` as a dependency.

The gate resolves both API alias imports (`@/…`) and relative source imports. It runs as part of the existing API test command and in the dedicated **AUDIT-1 Architecture Boundaries** workflow, which retains a compact diagnostic artifact on failure. The dedicated workflow also runs when AUDIT-1 architecture evidence, the audit master register, the roadmap, or the architecture workflow definition changes, so a status transition cannot bypass the current source scan.

## Current Architecture Decisions

| ID | Decision | Status |
| --- | --- | --- |
| ADR-A1-001 | SIDPRO remains a modular monolith. Deployable units are web, API, and worker; domain modules are not independently deployed services. | Accepted |
| ADR-A1-002 | `packages/*` are dependency roots; they may not import `apps/*`. | Accepted |
| ADR-A1-003 | Core platform code may be imported by domain modules; core must not import domain code. | Accepted |
| ADR-A1-004 | Direct domain-to-domain source imports are prohibited by default. | Accepted |
| ADR-A1-005 | Report/dashboard aggregation may issue tenant-scoped Prisma reads across domain tables without importing domain services. | Accepted with review requirement |
| ADR-A1-006 | Cross-domain workflow that needs write coordination must use a core contract, queue/event, or explicitly documented interface; it must not be introduced as an undocumented relative import. | Accepted |
| ADR-A1-007 | Tenant-scoped address resolution is a shared core capability. Family and population workflows use `AddressResolutionService`; no domain owns a duplicate resolver. | Accepted |
| ADR-A1-008 | Any AUDIT-1 status or dependency-map evidence change must trigger the dedicated static-boundary workflow. | Accepted |

## Architecture Exceptions Register

| Exception | Rationale | Guard |
| --- | --- | --- |
| `reports` reads several domain tables through Prisma | Reports are a read-model/aggregation concern. Importing every domain service would create a dependency cycle and blur ownership. | Tenant filtering, report isolation tests, query-plan evidence, and review of every new aggregate. |
| `public` delivery module may expose selected tenant data | Public pages are a delivery boundary, not a new business domain. | Explicit field selection and tenant/public visibility checks in service tests. |
| Worker may use Prisma and object storage | Jobs need durable cleanup/PDF/email orchestration independently of the API process. | Shared job contracts, retry/observability controls, and CI production smoke. |

No undocumented source-import exception is accepted at this baseline.

## Findings

### A1-P1 Resolved in Source — No executable architecture boundary existed

Before this audit, the architecture document described module isolation, but TypeScript and ESLint only exposed broad aliases and generic lint rules. There was no executable guard against a core module importing a business module, a business module importing another business module, or application source being imported by a shared package.

**Treatment:** `architecture-boundaries.test.ts` establishes a source and manifest regression gate. The focused workflow provides explicit architecture-scan evidence independent of the general CI log.

### A1-P1 Resolved in Source — `families` imported `population`

The initial scan found `FamiliesModule` importing `PopulationModule` and `FamiliesService` importing `PopulationService`. The only shared behavior was tenant-scoped address resolution. This was a direct domain-to-domain dependency and made family behavior dependent on population module implementation.

**Treatment:** `AddressResolutionService` and `AddressingModule` now own the shared address capability. `families` imports core addressing, not population. Tests cover the resolver's tenant, hamlet, and RT/RW safeguards plus the family workflow delegation.

### A1-P2 Resolved in Source — Population address logic now delegates to core

`PopulationService` previously retained the legacy address resolver after family workflows moved to `core/addressing`. That duplicated tenant, hamlet, and RT/RW validation across a domain service and the core service.

**Treatment:** PR #95 injects `AddressResolutionService` through `PopulationModule`, removes the local resolver and local address input interface, and delegates resident create/update address input to core. Regression tests prove both family and population workflows use the shared capability.

### A1-P2 Resolved in Documentation — Dependency and exception records were missing

The previous architecture document listed folders and high-level rules but did not state allowed dependency direction, the role of reports as a cross-domain read model, or the process for accepting exceptions.

**Treatment:** this audit document and the expanded architecture guide define the rules, decisions, and exception register.

### A1-P2 Resolved in Test Setup — Shared package build contract was implicit

Shared packages expose compiled `dist` artifacts. API tests build `@sidpro/types` and `@sidpro/validators` before running, which prevents a clean checkout from resolving stale or nonexistent package output.

**Treatment:** retained in the API `pretest` hook and verified by CI.

### A1-R1 Resolved in Documentation — Audit master register status drift

The audit master register still classified AUDIT-1 as `Not Formally Assessed` even though the repository already contained an architecture report, dependency graph, executable boundary gate, and merged source remediation. That conflict could misstate the program's next required action.

**Treatment:** the register and roadmap now record `Validation Pending`, distinguish completed repository-level evidence from persistent-environment validation, and reference this dependency-map review.

### A1-R2 Resolved in CI Trigger Coverage — AUDIT evidence edits did not run the focused gate

Before this review, a change limited to `docs/audits/AUDIT-1-*.md`, `docs/audits/AUDIT_MASTER_REGISTER.md`, `docs/ROADMAP.md`, or `docs/ARCHITECTURE.md` did not trigger the dedicated architecture-boundary workflow. A documentation-only status transition could therefore merge without re-running the current static source scan.

**Treatment:** the workflow path filters now include those architecture and audit-evidence files. This does not turn a source scan into runtime validation; it preserves source-gate provenance when the audit record is updated.

## Repository Evidence Completed for `Validation Pending`

1. The architecture boundary test and focused workflow run against the full current repository source.
2. CI covers lint, typecheck, test, build, migration, smoke, and production Compose validation.
3. The documented inventory and exception register are reconciled with the static source dependency map above.
4. Resident create/update and family address workflows retain regression coverage for the shared core resolver.

## Validation Pending Outside the Repository

1. Validate the deployed web, API, and worker process topology on a persistent staging environment, including their required configuration and health/readiness behavior.
2. Record evidence that deployed runtime wiring matches the documented boundaries, particularly queue/worker operation and allowed cross-process contracts.
3. Reconcile any staging-only exception or topology finding with this graph before considering AUDIT-1 closure.

## Closure Criteria

AUDIT-1 may move to `Closed` only when:

1. the complete module inventory and dependency graph are versioned;
2. architecture boundary rules run in required CI checks;
3. every permitted exception has owner, rationale, and regression guard;
4. the operational architecture of API/worker/web is validated on a persistent staging environment;
5. the current dependency graph and exception register are reconciled with CI evidence;
6. related AUDIT-2 through AUDIT-10 findings are not being incorrectly used as architecture closure evidence.

## Related Documents

- [SIDPRO Architecture](../ARCHITECTURE.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [Audit Roadmap](../ROADMAP.md)
- [AUDIT-1 Dependency Graph](AUDIT-1-DEPENDENCY-GRAPH.md)
- [AUDIT-5 — Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [Production Readiness](../PRODUCTION_READINESS.md)
