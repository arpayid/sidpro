# AUDIT-2 — Dependency and Code Quality

**Status:** `In Progress` — coverage and lint baselines are established; dependency remediation and Prisma declaration alignment are applied in source via a pnpm-generated lockfile. AUDIT-2 remains open for coverage ratcheting and maintainability assessment, and this remediation is merged only after all required CI gates succeed.

## Scope

AUDIT-2 evaluates dependency hygiene and software-quality controls observable from repository source and CI configuration:

1. package manifests, lockfile resolution, version-specifier policy, and dependency-security controls;
2. lint, typecheck, test, build, and code-format quality gates;
3. test observability, coverage evidence, and regression-test expectations;
4. static quality debt visible in the configured lint policy;
5. duplication, dead code, complexity, and deprecated-dependency evidence where a repeatable source scan exists.

This audit does **not** claim production performance, runtime availability, production dependency behavior, or security closure. Those remain within AUDIT-4, AUDIT-7, AUDIT-9, and persistent-environment validation scope.

## Evidence Baseline — 29 June 2026

**Repository revisions reviewed:** PR #97 merge commit `e64ecd935978f7265c788096929440ec624243c3`; PR #98 merge commit `cf2bba2d5874ef085103d60159bbcdee5844cf91`; and the lockfile-aware remediation candidate in PR #100.

### Existing controls

| Control | Repository evidence | Assessment |
| --- | --- | --- |
| Locked installs | `pnpm-lock.yaml`, `pnpm install --frozen-lockfile` in CI | Reproducible dependency resolution is enforced in CI. |
| Static quality | Root CI executes `pnpm lint` and `pnpm typecheck` before test/build. | Present; results are required CI evidence. |
| Functional regression | Root CI executes `pnpm test`, then build, migration, seed, smoke, and production image/Compose checks. | Present; test execution is accompanied by a coverage baseline artifact. |
| Dependency vulnerability gate | Security Audit fails on high-severity dependency vulnerabilities; AUDIT-2 retains an unignored JSON inventory separately. | Present; high/critical gating is not a complete dependency lifecycle review. |
| Package isolation | AUDIT-1 source/manifest boundary test protects application/package ownership. | Covered by AUDIT-1; retained as an upstream quality control. |
| Dependency exception governance | Machine-readable exception register, exact config/registry validation, and unignored audit inventory run in the AUDIT-2 workflow. | Active; no exception is configured. |
| Lint warning inventory | The AUDIT-2 workflow retains ESLint JSON totals by workspace and rule. | Active; most recent baseline is clean. |

## Findings

### A2-P1 Resolved in CI — Test coverage had no reproducible repository artifact

Package-level `test:coverage` commands invoke Node 20's built-in experimental test-coverage mode directly through the `node` CLI. The **AUDIT-2 Code Quality Baseline** workflow retains the combined test/coverage log for 30 days.

#### First observed baseline

| Test run | Line | Branch | Function |
| --- | ---: | ---: | ---: |
| `@sidpro/api` | 61.48% | 83.75% | 70.80% |
| `@sidpro/web` | 85.98% | 78.75% | 35.29% |
| `@sidpro/worker` | 88.69% | 73.79% | 83.04% |
| `@sidpro/validators` | 94.58% | 90.00% | 51.16% |

These are measurements, not a weighted release-quality threshold. A future threshold must be package-specific, risk-based, and ratchet from a comparable second baseline.

### A2-P2 Resolved in Source — Stale dependency-audit suppressions

The inherited `pnpm.auditConfig.ignoreCves` entries were removed after the first unignored inventory found no matching active advisory. The exception registry is empty and CI requires any future configured suppression to have an exact matching registry record with owner, rationale, controls, review date, expiry, and removal condition.

### A2-P3 Remediation applied — Moderate transitive dependency advisories

The original unignored inventory identified three moderate advisory paths and no high/critical advisory:

| Dependency path | Previously resolved version | Advisory | Required secure resolution |
| --- | ---: | --- | --- |
| `apps/web → next → postcss` | `postcss@8.4.31` | `GHSA-qx2v-qp2m-jg93` / `CVE-2026-41305` | `postcss@8.5.10` |
| `apps/api → exceljs → uuid` | `uuid@8.3.2` | `GHSA-w5hq-g745-h8pq` / `CVE-2026-41907` | `uuid@11.1.1` |
| `apps/api → @nestjs/swagger → js-yaml` | `js-yaml@4.1.1` | `GHSA-h67p-54hq-rp68` / `CVE-2026-53550` | `js-yaml@4.2.0` |

**Treatment in PR #100:** supported pnpm root overrides pin `postcss`, `uuid`, and `js-yaml` to those exact fixed versions. The lockfile is regenerated with pnpm `10.18.3`, not hand-edited. The isolated resolution preview verified both `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm audit --json`; the preview audit reported 0 advisory across 836 dependencies.

The final merge decision still requires CI, Security Audit, AUDIT-1 Architecture Boundaries, and AUDIT-2 Code Quality Baseline to pass on the PR head. This evidence does not prove deployed-runtime exploitability or reachability.

### A2-P4 Remediation applied — Prisma manifest declaration drift

The repository formerly resolved Prisma client/CLI `6.19.3` in the lockfile while several direct workspace declarations retained `^6.8.2`.

**Treatment in PR #100:** the root `prisma` CLI declaration and direct `@prisma/client` declarations in root/API/worker align to exact `6.19.3`; the duplicate root dev `@prisma/client` declaration is removed. The lockfile is regenerated with pnpm `10.18.3`. This source remediation remains subject to final Prisma generation, API/worker build, migration, production-image, and production-smoke CI gates.

### A2-P5 Resolved in Source — Lint warning inventory was not measured

The AUDIT-2 workflow emits workspace-scoped ESLint JSON reports and retains a normalized summary artifact. The initial inventory scanned 348 files with 0 errors and 1 warning in the refresh-token test mock. The unused parameter is now `_args`; the subsequent baseline recorded **0 errors and 0 warnings** across the seven audited workspaces.

This is not an automatic zero-warning rule. Logging and type-escape policy still require risk-based classification before a warning ratchet is introduced.

### A2-P6 Not Yet Assessed — Duplication, dead code, and complexity hotspots

The repository has lint/type/build/test controls, but no repeatable scan or documented review for duplicated implementations, unused exports, cyclomatic/cognitive complexity, or code ownership hotspots.

**Treatment:** do not add an unreviewed scanner merely to create a green badge. Tool selection must define source coverage, false-positive policy, owner, and triage path before it becomes a required gate.

## Override Register

| Override | Scope | Rationale | Removal / review condition |
| --- | --- | --- | --- |
| `multer >=2.2.0` | Existing upload dependency override | Retained existing security floor. | Remove or replace only after dependency graph no longer requires it and audit remains clean. |
| `postcss 8.5.10` | Next.js transitive path | Resolves #99 PostCSS advisory. | Remove when an upstream direct-parent update resolves the same or newer fixed version without this override; re-run full CI. |
| `uuid 11.1.1` | ExcelJS transitive path | Resolves #99 UUID advisory. | Remove when an upstream direct-parent update resolves the same or newer fixed version without this override; re-run report/export regression coverage. |
| `js-yaml 4.2.0` | Nest Swagger transitive path | Resolves #99 js-yaml advisory. | Remove when an upstream direct-parent update resolves the same or newer fixed version without this override; re-run API/build validation. |

## Code-Quality Evidence Contract

The AUDIT-2 workflow runs on relevant pull requests, main/develop pushes, a weekly Monday schedule, and manual dispatch:

1. Coverage job installs from the lockfile, generates Prisma, and runs API/web/worker/validators test globs with Node coverage enabled.
2. Lint job retains workspace-scoped ESLint JSON reports and normalized rule totals.
3. Dependency job validates exception registry linkage and retains an unignored audit inventory without persisting a changed manifest.
4. Artifacts are retained for 30 days, including diagnostics after a failed job.
5. None of these controls claims staging or production validation.

## Required Next Steps

1. Verify and merge PR #100 only after all required gates pass, then close issue #99 with the CI evidence.
2. Record a second comparable coverage run and define critical-path expectations before enabling any coverage threshold.
3. Classify permitted logging and type-escape warnings before introducing a package-specific warning ratchet.
4. Evaluate duplication/dead-code/complexity scanning with a documented triage workflow and false-positive policy.
5. Continue AUDIT-3 API/domain inventory and AUDIT-4 threat-model/security assessment after AUDIT-2 baseline controls stabilize.

## Closure Criteria

AUDIT-2 may move to `Validation Pending` only when:

1. dependency inventory and exception register are versioned with no stale/expired exception;
2. current dependency findings have owners and remediation status;
3. coverage baseline and risk-based test expectations are recorded;
4. lint/type/build/test quality gates and warning/threshold policies are documented;
5. runtime-critical manifest drift is remediated with lockfile-aware validation evidence;
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
