# AUDIT-2 — Dependency and Code Quality

**Status:** `In Progress` — a source-repository baseline is documented and a reproducible test-coverage artifact is introduced. This audit is not closed: dependency exception ownership, coverage thresholds, typed-debt reduction, and broader maintainability analysis remain outstanding.

## Scope

AUDIT-2 evaluates dependency hygiene and software-quality controls that are observable from the repository and CI configuration:

1. package manifests, lockfile resolution, version-specifier policy, and dependency-security controls;
2. lint, typecheck, test, build, and code-format quality gates;
3. test observability, coverage evidence, and regression-test expectations;
4. static quality debt visible in the configured lint policy;
5. duplication, dead-code, complexity, and deprecated-dependency evidence where a repeatable source scan exists.

This audit does **not** claim production performance, runtime availability, production dependency behavior, or security closure. Those remain within AUDIT-4, AUDIT-7, AUDIT-9, and persistent-environment validation scope.

## Evidence Baseline — 29 June 2026

**Repository revision reviewed:** `b6a09b6fc574f658b89a6eb7db3ef7693dcd22d8` (PR #96 merge commit), plus the current source changes in this PR.

### Existing controls

| Control | Repository evidence | Assessment |
| --- | --- | --- |
| Locked installs | `pnpm-lock.yaml`, `pnpm install --frozen-lockfile` in CI | Reproducible dependency resolution is enforced in CI. |
| Static quality | Root CI executes `pnpm lint` and `pnpm typecheck` before test/build. | Present; results are required CI evidence. |
| Functional regression | Root CI executes `pnpm test`, then build, migration, seed, smoke, and production image/Compose checks. | Present; test execution is not yet a coverage baseline. |
| Dependency vulnerability gate | CI and Security Audit execute `pnpm audit --audit-level=high --ignore-unfixable`; Gitleaks runs separately. | Present; this is a vulnerability gate, not a complete dependency lifecycle review. |
| Package isolation | AUDIT-1 source/manifest boundary test protects application/package ownership. | Covered by AUDIT-1; retained as an upstream quality control. |

## Findings

### A2-P1 Resolved in CI — Test coverage had no reproducible repository artifact

The existing test commands executed Node's test runner, but neither the root scripts nor CI enabled test coverage or retained a report. A passing test result therefore did not establish an observable coverage baseline for later risk-based improvement.

**Treatment:** this PR adds package-level `test:coverage` commands and a root orchestration command. Each command invokes Node 20's built-in experimental test-coverage mode directly through the `node` CLI, preserving the existing package test globs while avoiding unsupported `NODE_OPTIONS` forwarding. The dedicated **AUDIT-2 Code Quality Baseline** workflow runs these commands and uploads its combined log as a CI artifact. No percentage threshold is introduced before the first baseline is reviewed.

**Reason for no threshold yet:** a threshold chosen without a measured baseline would be arbitrary and could incentivize superficial tests. The next AUDIT-2 step must record baseline values, define critical-path coverage expectations, and propose ratcheting thresholds.

### A2-P2 Open — Dependency exception governance is incomplete

The root `pnpm.auditConfig.ignoreCves` contains explicitly ignored vulnerability identifiers. The repository supplies the identifiers but does not yet record a per-exception owner, affected dependency, compensating control, review date, expiry, or removal condition.

**Treatment:** keep the existing CI security gate intact; do not claim that the ignored advisories are harmless. Create an exception register before changing or accepting any suppression, then reconcile it with Security Audit and dependency-update policy.

### A2-P3 Open — Manifest specifier policy is not yet defined

The lockfile resolves a consistent Prisma client/CLI version today, while package manifests retain broad semver ranges in several importers. The lockfile protects CI resolution, but the repository does not state when a direct dependency must be exact-pinned, range-pinned, or centrally aligned.

**Treatment:** define a dependency versioning policy before normalizing manifests. Any normalization must update manifests and lockfile together and be validated through the production-image and Prisma generation gates; it is intentionally not bundled into this evidence PR.

### A2-P4 Open — Typed-debt and console policy are warning/permissive rather than measured gates

The shared ESLint policy configures `@typescript-eslint/no-explicit-any` as a warning and disables `no-console` globally. That may be appropriate for structured worker/operational logging, but the repository does not currently emit a warning count or distinguish intentional logging from avoidable type escapes.

**Treatment:** baseline lint warnings, classify permitted logging, and prioritize type escapes by risk. Do not change warnings to errors until the existing warning inventory and remediation plan are recorded.

### A2-P5 Not Yet Assessed — Duplication, dead code, and complexity hotspots

The repository has lint/type/build/test controls, but no repeatable scan or documented review for duplicated implementations, unused exports, cyclomatic/cognitive complexity, or code ownership hotspots.

**Treatment:** select tools and thresholds only after the coverage and lint-warning baselines are available. Avoid adding a scanner merely to create a green badge without an agreed triage process.

## Code-Quality Evidence Contract

The AUDIT-2 workflow is deliberately a baseline-control, not a closure gate:

1. It installs from the lockfile using `--frozen-lockfile`.
2. It generates the Prisma client before running tests.
3. It builds the required shared workspaces, then runs the existing API, web, worker, and validators test globs with Node test coverage enabled.
4. It uploads the coverage/test log even when a test fails, so a failure remains diagnosable.
5. It does not publish a coverage percentage as a quality guarantee and does not claim persistent-environment validation.

## Required Next Steps

1. Review the first coverage artifact and record per-package and critical-workflow baseline values.
2. Create a dependency exception register for every currently ignored advisory, including owner, rationale, compensating control, review cadence, and expiry/removal condition.
3. Define manifest version policy for runtime-critical dependencies, beginning with Prisma and production-image packages.
4. Capture lint warning inventory; decide whether `no-explicit-any` and logging policy should be ratcheted by package or risk tier.
5. Evaluate duplication/dead-code/complexity scanning with a documented triage workflow and false-positive policy.

## Closure Criteria

AUDIT-2 may move to `Validation Pending` only when:

1. dependency inventory and exception register are versioned;
2. coverage baseline and risk-based test expectations are recorded;
3. lint/type/build/test quality gates and their warning/threshold policies are documented;
4. duplication/dead-code/complexity assessment is completed or explicitly scoped with owners and follow-up findings;
5. unresolved dependency risks have owners, expiry/review dates, and release impact recorded.

AUDIT-2 may move to `Closed` only when the above evidence is reconciled with current CI results and no known in-scope remediation remains.

## Related Documents

- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [Audit Roadmap](../ROADMAP.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [CI Merge Gate](../CI_MERGE_GATE.md)
- [AUDIT-1 — Repository and Architecture](AUDIT-1-REPOSITORY-ARCHITECTURE.md)
