# AUDIT-2 — Dependency and Code Quality

**Marker:** `[[AI-CLI|AUDIT-2|VALIDATION_PENDING|REPO_CI_READY]]`

**Status:** `Validation Pending` — dependency remediation, lint inventory, two coverage baselines, critical-path regression expectations, and maintainability triage are versioned. Final CI for this PR must pass; closure still requires trend review and no remaining in-scope remediation.

## Scope

AUDIT-2 evaluates dependency hygiene, package/lockfile consistency, vulnerability exceptions, lint/type/test/build gates, coverage evidence, regression-test expectations, and maintainability indicators that can be measured from repository source and CI.

It does not claim production performance, runtime availability, deployed dependency behavior, or security closure.

## Existing Controls

| Control | Assessment |
| --- | --- |
| Locked installs | `pnpm-lock.yaml` plus `pnpm install --frozen-lockfile` make CI resolution reproducible. |
| Dependency governance | Exact exception registry/config validation and unignored audit inventory are retained in CI. |
| Dependency remediation | PR #100 resolved the recorded transitive moderate advisory paths and aligned Prisma declarations through pnpm-generated lockfile changes. |
| Static quality | CI requires lint, typecheck, test, build, migration, seed, smoke, dependency audit, and production image/Compose checks. |
| Lint warning baseline | Workspace inventory records 0 errors and 0 warnings across 348 audited files. |
| Coverage evidence | Coverage logs are retained for API, web, worker, and validators. |
| Critical-path regression | Named high-risk tests run independently from aggregate coverage. |
| Maintainability baseline | Native source inventory records large files, lexical control-flow signals, typed debt, suppressions, console/debugger use, TODOs, and exact duplicate files. |

## Findings and Treatment

### A2-P1 Resolved in CI — Coverage was not reproducible

The weekly/PR workflow retains Node coverage logs. Two comparable runs are now recorded:

| Package | First line/branch/function | Second line/branch/function | Interpretation |
| --- | --- | --- | --- |
| `@sidpro/api` | 61.48 / 83.75 / 70.80 | 59.74 / 84.31 / 71.13 | Test-source denominator changed after policy tests; branch/function evidence increased. |
| `@sidpro/web` | 85.98 / 78.75 / 35.29 | 86.03 / 78.75 / 35.29 | Stable baseline. |
| `@sidpro/worker` | 88.69 / 73.79 / 83.04 | 88.69 / 73.79 / 83.04 | Stable baseline. |
| `@sidpro/validators` | 94.58 / 90.00 / 51.16 | 94.67 / 90.00 / 50.00 | Stable within test-inventory variation. |

No global numeric threshold is added because Node's experimental coverage includes test source. The replacement control is a named critical-path suite plus artifact trend review. See [Critical-Path Test Expectations](AUDIT-2-CRITICAL-PATH-TEST-EXPECTATIONS.md).

### A2-P2 Resolved in Source — Stale dependency-audit suppressions

Inherited `pnpm.auditConfig.ignoreCves` entries were removed after the unignored inventory found no matching active advisory. The exception registry is empty; any future suppression must have an exact versioned record with owner, rationale, controls, review date, expiry, and removal condition.

### A2-P3 Resolved in Source — Moderate transitive dependency advisories

PR #100 pinned `postcss@8.5.10`, `uuid@11.1.1`, and `js-yaml@4.2.0` through supported pnpm overrides; the pnpm-generated lockfile was verified with frozen install and unignored audit. Final standard CI and Security Audit passed before merge. This does not prove runtime exploitability or reachability.

### A2-P4 Resolved in Source — Prisma declaration drift

PR #100 aligned direct Prisma declarations to `6.19.3`, removed the duplicate root dev declaration, and regenerated the lockfile with pnpm `10.18.3`.

### A2-P5 Resolved in Source — Lint warning inventory was absent

The lint baseline captures per-workspace ESLint JSON. It records 0 errors and 0 warnings. This is not a blanket zero-warning requirement: new logging, `any`, or suppression use must follow the maintainability triage policy.

### A2-P6 Resolved as Baseline — Maintainability had no repeatable evidence

`audit-2-maintainability-baseline.mjs` now captures a reproducible inventory and writes JSON/Markdown artifacts. Its first artifact scanned **292 source files / 28,307 code lines** and found **0 explicit `any`, 0 TypeScript/ESLint suppressions, 0 debugger statements, 0 TODO/FIXME markers, and 0 exact duplicate-file groups**. It recorded 22 console calls for classification and identified letters/auth/complaints/tenant/population services plus several admin pages as review candidates; issue #107 owns that triage.

The baseline intentionally reports rather than fails on size, lexical control-flow signals, exact duplicate files, typed debt, suppressions, console usage, and TODO markers. The triage/rachet prerequisites are documented in [Maintainability Policy](AUDIT-2-MAINTAINABILITY-POLICY.md).

**Limit:** lexical control-flow signals are not cognitive/cyclomatic complexity, and exact-file hashes are not semantic duplicate detection. A third-party scanner will not become a required gate until its false-positive process and ownership model are accepted.

## Override Register

| Override | Scope | Removal/review condition |
| --- | --- | --- |
| `multer >=2.2.0` | Existing upload dependency security floor. | Remove or replace when the dependency graph no longer needs it and unignored audit remains clean. |
| `postcss 8.5.10` | Next.js transitive path. | Remove after a reviewed parent update resolves the same/newer fixed version and all CI passes. |
| `uuid 11.1.1` | ExcelJS transitive path. | Remove after parent update and report/export regression validation. |
| `js-yaml 4.2.0` | Nest Swagger transitive path. | Remove after parent update and API/build validation. |

## Evidence Contract

The AUDIT-2 workflow runs on relevant PRs/pushes, weekly, and manually. It retains coverage, critical-path, lint, maintainability, and unignored dependency artifacts for 30 days. None of these controls claims staging or production validation.

## Validation Pending

1. Confirm this PR's expanded workflow passes on the final head.
2. Review at least one further coverage and maintainability trend before proposing a ratchet.
3. Triage issue #107 and classify any new `any`, suppression, console, large-file, or lexical-hotspot changes using the documented policy.
4. Continue source evidence reconciliation when dependencies or runtime-critical workflows change.

## Closure Criteria

AUDIT-2 may move to `Closed` only when dependency risks, coverage/critical-path expectations, lint policy, and maintainability review are reconciled with current CI results and no known in-scope remediation remains.

## Related Documents

- [Critical-Path Test Expectations](AUDIT-2-CRITICAL-PATH-TEST-EXPECTATIONS.md)
- [Maintainability Baseline and Triage Policy](AUDIT-2-MAINTAINABILITY-POLICY.md)
- [Dependency Exception Register](AUDIT-2-DEPENDENCY-EXCEPTIONS.md)
- [Dependency Versioning Policy](AUDIT-2-DEPENDENCY-VERSIONING-POLICY.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [Audit Roadmap](../ROADMAP.md)
