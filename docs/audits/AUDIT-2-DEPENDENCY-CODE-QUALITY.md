# AUDIT-2 — Dependency and Code Quality

**Status:** `In Progress` — coverage baseline, dependency-exception governance, manifest-version policy, and lint-warning inventory controls are versioned. This audit is not closed: exception metadata must be reviewed, Prisma declaration drift needs a lockfile-aware remediation, coverage ratchets are not yet enforced, and duplication/dead-code/complexity analysis remains unassessed.

## Scope

AUDIT-2 evaluates dependency hygiene and software-quality controls that are observable from the repository and CI configuration:

1. package manifests, lockfile resolution, version-specifier policy, and dependency-security controls;
2. lint, typecheck, test, build, and code-format quality gates;
3. test observability, coverage evidence, and regression-test expectations;
4. static quality debt visible in the configured lint policy;
5. duplication, dead-code, complexity, and deprecated-dependency evidence where a repeatable source scan exists.

This audit does **not** claim production performance, runtime availability, production dependency behavior, or security closure. Those remain within AUDIT-4, AUDIT-7, AUDIT-9, and persistent-environment validation scope.

## Evidence Baseline — 29 June 2026

**Repository revision reviewed:** `e64ecd935978f7265c788096929440ec624243c3` (PR #97 merge commit), plus the current source changes in this PR.

### Existing controls

| Control | Repository evidence | Assessment |
| --- | --- | --- |
| Locked installs | `pnpm-lock.yaml`, `pnpm install --frozen-lockfile` in CI | Reproducible dependency resolution is enforced in CI. |
| Static quality | Root CI executes `pnpm lint` and `pnpm typecheck` before test/build. | Present; results are required CI evidence. |
| Functional regression | Root CI executes `pnpm test`, then build, migration, seed, smoke, and production image/Compose checks. | Present; test execution is now accompanied by a coverage baseline artifact. |
| Dependency vulnerability gate | CI and Security Audit execute `pnpm audit --audit-level=high`; Gitleaks runs separately. | Present; this is a vulnerability gate, not a complete dependency lifecycle review. |
| Package isolation | AUDIT-1 source/manifest boundary test protects application/package ownership. | Covered by AUDIT-1; retained as an upstream quality control. |
| Dependency exception governance | Machine-readable exception register, expiry validation, and unignored audit inventory are executed in the AUDIT-2 workflow. | New in this PR; first inventory is required before exception metadata is considered complete. |
| Lint warning inventory | The AUDIT-2 workflow runs ESLint JSON output for each app/shared workspace and retains totals by workspace/rule. | New in this PR; warning baseline is evidence, not an automatic zero-warning policy. |

## Findings

### A2-P1 Resolved in CI — Test coverage had no reproducible repository artifact

The existing test commands executed Node's test runner, but neither the root scripts nor CI enabled test coverage or retained a report. A passing test result therefore did not establish an observable coverage baseline for later risk-based improvement.

**Treatment:** package-level `test:coverage` commands and a root orchestration command invoke Node 20's built-in experimental test-coverage mode directly through the `node` CLI. The dedicated **AUDIT-2 Code Quality Baseline** workflow uploads its combined log as a CI artifact. No percentage threshold is introduced before the first baseline is reviewed.

#### First observed baseline

| Test run | Line | Branch | Function |
| --- | ---: | ---: | ---: |
| `@sidpro/api` | 61.48% | 83.75% | 70.80% |
| `@sidpro/web` | 85.98% | 78.75% | 35.29% |
| `@sidpro/worker` | 88.69% | 73.79% | 83.04% |
| `@sidpro/validators` | 94.58% | 90.00% | 51.16% |

These numbers are an initial measurement, not a release-quality assertion or a weighted repository percentage. Node's report includes executed test files and shared workspace source loaded by a package run; use it for trend and risk-based planning.

#### Coverage review policy

1. Every change to authentication, tenant isolation, finance ledger, resident lifecycle, address resolution, storage cleanup, or production deployment code must include an explicit regression-test review in the PR.
2. The package-run baselines may not be converted into a hard aggregate threshold until a second comparable baseline and a source-inclusion policy are recorded.
3. A future threshold must be package-specific and ratchet from measured values; it must not reward superficial tests or hide untested critical workflows.

### A2-P2 Partially Resolved in CI — Dependency exception governance was incomplete

The root `pnpm.auditConfig.ignoreCves` contains explicit vulnerability suppressions. Previously, the repository did not record an owner, rationale, compensating control, review date, expiry, or removal condition for each entry.

**Treatment:** [`AUDIT-2-DEPENDENCY-EXCEPTIONS.json`](AUDIT-2-DEPENDENCY-EXCEPTIONS.json) is validated against `package.json` in CI. Every active exception is temporary, owned by `arpayid`, reviewable by 29 July 2026, and expires on 29 September 2026 unless renewed with rationale. The AUDIT-2 workflow removes the suppression configuration only inside the ephemeral CI workspace, captures `pnpm audit --json`, and uploads a parsed cross-reference artifact. The committed manifest is restored before the job exits.

**Remaining work:** populate each record with the affected package/path, severity, available fixed version, and remediation disposition from the first unignored inventory. This register does not declare any advisory harmless or prove runtime reachability.

### A2-P3 Open — Prisma manifest declaration drift

The lockfile consistently resolves Prisma client/CLI `6.19.3`, while several direct workspace declarations retain `^6.8.2`. This does not currently break locked CI installs, but it weakens the relationship between the reviewed runtime graph and manifest intent.

**Treatment:** [`AUDIT-2-DEPENDENCY-VERSIONING-POLICY.md`](AUDIT-2-DEPENDENCY-VERSIONING-POLICY.md) documents the required lockfile-aware update path. `pnpm audit:dependency-policy` reports the current declaration set and validates exception-register linkage. It deliberately does not fail solely on this recorded drift; exact alignment must be performed only in a PR that regenerates `pnpm-lock.yaml` with pnpm `10.18.3` and passes Prisma/build/production-image validation.

### A2-P4 Partially Resolved in CI — Typed-debt and console policy were not measured

The shared ESLint policy configures `@typescript-eslint/no-explicit-any` as a warning and disables `no-console` globally. That may be appropriate for structured worker/operational logging, but the repository previously had no retained warning count or workspace/rule inventory.

**Treatment:** the AUDIT-2 workflow now emits ESLint JSON output for API, web, worker, types, validators, UI, and config workspaces, then retains a normalized summary artifact. The baseline reports warnings; it does not convert existing warnings into errors without a reviewed remediation plan.

**Remaining work:** review the first warning inventory, distinguish operational logging from application/UI logging, classify `any` usage by risk, and decide which warnings can be ratcheted by package.

### A2-P5 Not Yet Assessed — Duplication, dead code, and complexity hotspots

The repository has lint/type/build/test controls, but no repeatable scan or documented review for duplicated implementations, unused exports, cyclomatic/cognitive complexity, or code ownership hotspots.

**Treatment:** no unreviewed third-party scanner is added merely to create a green badge. Tool selection must define its source coverage, false-positive policy, owner, and triage path before it becomes a required gate.

## Code-Quality Evidence Contract

The AUDIT-2 workflow runs on relevant pull requests, main/develop pushes, a weekly Monday schedule, and manual dispatch. It is a baseline-control, not a closure gate:

1. Coverage job installs from the lockfile, generates Prisma, and runs API/web/worker/validators test globs with Node coverage enabled.
2. Lint job runs workspace-scoped ESLint JSON reports and retains warning/error totals by rule.
3. Dependency job validates suppression registry linkage and retains an unignored audit inventory without committing or retaining a changed `package.json` in the workspace.
4. Every artifact is retained for 30 days, including diagnostic output after a failed job.
5. None of these controls claims staging or production validation.

## Required Next Steps

1. Review the first dependency-exception inventory and complete affected package/path, severity, fixed-version, and disposition fields before 29 July 2026.
2. Prepare a lockfile-aware Prisma manifest-alignment PR using pnpm `10.18.3`; do not hand-edit resolved lockfile entries.
3. Review the first lint-warning inventory; classify `any`, logging, and unused-variable warnings and propose a package-specific ratchet.
4. Record a second comparable coverage run and select critical-path coverage expectations before enabling any threshold.
5. Evaluate duplication/dead-code/complexity scanning with a documented triage workflow and false-positive policy.

## Closure Criteria

AUDIT-2 may move to `Validation Pending` only when:

1. dependency inventory and exception register are versioned with complete metadata and no expired temporary entry;
2. coverage baseline and risk-based test expectations are recorded;
3. lint/type/build/test quality gates and their warning/threshold policies are documented;
4. Prisma or other runtime-critical manifest drift is remediated with a lockfile-aware validation record;
5. duplication/dead-code/complexity assessment is completed or explicitly scoped with owners and follow-up findings;
6. unresolved dependency risks have owners, expiry/review dates, and release impact recorded.

AUDIT-2 may move to `Closed` only when the above evidence is reconciled with current CI results and no known in-scope remediation remains.

## Related Documents

- [Dependency Exception Register](AUDIT-2-DEPENDENCY-EXCEPTIONS.md)
- [Dependency Versioning Policy](AUDIT-2-DEPENDENCY-VERSIONING-POLICY.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [Audit Roadmap](../ROADMAP.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [CI Merge Gate](../CI_MERGE_GATE.md)
- [AUDIT-1 — Repository and Architecture](AUDIT-1-REPOSITORY-ARCHITECTURE.md)
