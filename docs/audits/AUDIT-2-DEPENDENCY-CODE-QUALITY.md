# AUDIT-2 — Dependency and Code Quality

**Status:** `In Progress` — coverage baseline, lint-warning inventory, dependency-exception governance, and manifest-version policy are versioned. This audit is not closed: three moderate transitive dependencies require remediation, Prisma declaration drift needs a lockfile-aware update, coverage ratchets are not yet enforced, and duplication/dead-code/complexity analysis remains unassessed.

## Scope

AUDIT-2 evaluates dependency hygiene and software-quality controls that are observable from the repository and CI configuration:

1. package manifests, lockfile resolution, version-specifier policy, and dependency-security controls;
2. lint, typecheck, test, build, and code-format quality gates;
3. test observability, coverage evidence, and regression-test expectations;
4. static quality debt visible in the configured lint policy;
5. duplication, dead-code, complexity, and deprecated-dependency evidence where a repeatable source scan exists.

This audit does **not** claim production performance, runtime availability, production dependency behavior, or security closure. Those remain within AUDIT-4, AUDIT-7, AUDIT-9, and persistent-environment validation scope.

## Evidence Baseline — 29 June 2026

**Repository revision reviewed:** `e64ecd935978f7265c788096929440ec624243c3` (PR #97 merge commit), plus the current source changes in PR #98.

### Existing controls

| Control | Repository evidence | Assessment |
| --- | --- | --- |
| Locked installs | `pnpm-lock.yaml`, `pnpm install --frozen-lockfile` in CI | Reproducible dependency resolution is enforced in CI. |
| Static quality | Root CI executes `pnpm lint` and `pnpm typecheck` before test/build. | Present; results are required CI evidence. |
| Functional regression | Root CI executes `pnpm test`, then build, migration, seed, smoke, and production image/Compose checks. | Present; test execution is accompanied by a coverage baseline artifact. |
| Dependency vulnerability gate | Security Audit fails on high-severity dependency vulnerabilities; unignored JSON inventory is retained separately by AUDIT-2. | Present; high/critical gating is not a complete lifecycle review. |
| Package isolation | AUDIT-1 source/manifest boundary test protects application/package ownership. | Covered by AUDIT-1; retained as an upstream quality control. |
| Dependency exception governance | Machine-readable exception register, expiry validation, and unignored audit inventory are executed in the AUDIT-2 workflow. | Active; no exception is currently configured. |
| Lint warning inventory | The AUDIT-2 workflow runs ESLint JSON output for each app/shared workspace and retains totals by workspace/rule. | Active; initial clean baseline is recorded below. |

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

### A2-P2 Resolved in Source — Stale dependency-audit suppressions

The root `pnpm.auditConfig.ignoreCves` previously contained four inherited suppression identifiers. The first unignored inventory found no matching current advisory for any of them, so retaining them would only obscure future audit changes.

**Treatment:** remove all four stale `ignoreCves` entries and clear the machine-readable exception register. The CI registry check remains active: any future suppression must have a matching owner, rationale, compensating controls, review date, expiry, and removal condition before it can pass the AUDIT-2 dependency-policy check.

### A2-P3 Open — Moderate transitive dependency advisories

The unignored `pnpm audit --json` inventory found **three moderate** transitive advisories and no high/critical advisory:

| Dependency path | Resolved vulnerable version | Advisory | Audit-indicated fix |
| --- | ---: | --- | --- |
| `apps/web → next → postcss` | `postcss@8.4.31` | `GHSA-qx2v-qp2m-jg93` / `CVE-2026-41305` | `postcss >= 8.5.10` |
| `apps/api → exceljs → uuid` | `uuid@8.3.2` | `GHSA-w5hq-g745-h8pq` / `CVE-2026-41907` | `uuid >= 11.1.1` |
| `apps/api → @nestjs/swagger → js-yaml` | `js-yaml@4.1.1` | `GHSA-h67p-54hq-rp68` / `CVE-2026-53550` | `js-yaml >= 4.2.0` |

**Treatment:** tracked in issue [#99](https://github.com/arpayid/sidpro/issues/99). Remediation must determine compatible direct-parent updates or supported overrides, regenerate `pnpm-lock.yaml` with pnpm `10.18.3`, and pass normal CI/security/production-image gates. The inventory does not prove exploitability or deployed-runtime reachability.

### A2-P4 Open — Prisma manifest declaration drift

The lockfile consistently resolves Prisma client/CLI `6.19.3`, while several direct workspace declarations retain `^6.8.2`. This does not currently break locked CI installs, but it weakens the relationship between the reviewed runtime graph and manifest intent.

**Treatment:** [`AUDIT-2-DEPENDENCY-VERSIONING-POLICY.md`](AUDIT-2-DEPENDENCY-VERSIONING-POLICY.md) documents the required lockfile-aware update path. `pnpm audit:dependency-policy` reports the current declaration set and validates exception-register linkage. It deliberately does not fail solely on this recorded drift; exact alignment must be performed only in a PR that regenerates `pnpm-lock.yaml` with pnpm `10.18.3` and passes Prisma/build/production-image validation.

### A2-P5 Resolved in Source — Lint warning inventory was not measured

The shared ESLint policy configures `@typescript-eslint/no-explicit-any` as a warning and disables `no-console` globally. Previously the repository had no retained warning count or workspace/rule inventory.

**Treatment:** the AUDIT-2 workflow now emits ESLint JSON output for API, web, worker, types, validators, UI, and config workspaces, then retains a normalized summary artifact. The first inventory scanned **348 files**, returned **0 errors** and **1 warning** (`@typescript-eslint/no-unused-vars` in the refresh-token test mock). The unused mock parameter is renamed `_args` in this PR, so the next baseline is expected to be warning-free.

This is not a mandate to make every future warning an error. Operational logging and type escapes still require risk-based classification before a package-specific ratchet is enabled.

### A2-P6 Not Yet Assessed — Duplication, dead code, and complexity hotspots

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

1. Resolve issue [#99](https://github.com/arpayid/sidpro/issues/99) through compatible direct-parent updates or a reviewed supported override; regenerate the lockfile rather than hand-editing it.
2. Prepare a lockfile-aware Prisma manifest-alignment PR using pnpm `10.18.3`.
3. Confirm the next lint baseline is warning-free, then classify logging/type-escape policy before adding a warning ratchet.
4. Record a second comparable coverage run and select critical-path coverage expectations before enabling any threshold.
5. Evaluate duplication/dead-code/complexity scanning with a documented triage workflow and false-positive policy.

## Closure Criteria

AUDIT-2 may move to `Validation Pending` only when:

1. dependency inventory and exception register are versioned with no stale/expired exception;
2. current dependency findings have owners and remediation status;
3. coverage baseline and risk-based test expectations are recorded;
4. lint/type/build/test quality gates and their warning/threshold policies are documented;
5. Prisma or other runtime-critical manifest drift is remediated with a lockfile-aware validation record;
6. duplication/dead-code/complexity assessment is completed or explicitly scoped with owners and follow-up findings;
7. unresolved dependency risks have owners, expiry/review dates, and release impact recorded.

AUDIT-2 may move to `Closed` only when the above evidence is reconciled with current CI results and no known in-scope remediation remains.

## Related Documents

- [Dependency Exception Register](AUDIT-2-DEPENDENCY-EXCEPTIONS.md)
- [Dependency Versioning Policy](AUDIT-2-DEPENDENCY-VERSIONING-POLICY.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [Audit Roadmap](../ROADMAP.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [CI Merge Gate](../CI_MERGE_GATE.md)
- [AUDIT-1 — Repository and Architecture](AUDIT-1-REPOSITORY-ARCHITECTURE.md)
