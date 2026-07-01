# AUDIT-2 — Trend Record 30 June 2026

**Marker:** `[[AI-CLI|AUDIT-2|VALIDATION_PENDING|REPO_CI_READY]]`

## Scope

This record compares the latest AUDIT-2 workflow artifacts with the prior versioned baseline. It records evidence only; it does not introduce a coverage threshold, maintainability threshold, or automatic refactor requirement.

## Evidence

| Item | Prior baseline | Latest artifact | Delta / interpretation |
| --- | ---: | ---: | --- |
| Source files | 292 | 296 | +4 files; expected repository evolution, not a quality finding by itself. |
| Code lines | 28,307 | 28,517 | +210 lines; no automatic file-size action. |
| Console calls | 22 | 24 | +2 calls; per-file review remains required before declaring a regression. |
| Explicit `any` | 0 | 0 | No typed-debt signal added. |
| TypeScript suppressions | 0 | 0 | No signal added. |
| ESLint suppressions | 0 | 0 | No signal added. |
| Debugger statements | 0 | 0 | No signal added. |
| TODO/FIXME/HACK/XXX markers | 0 | 0 | No signal added. |
| Exact duplicate groups | 0 | 0 | No exact file-content duplicates detected. |

Latest maintainability artifact timestamp: `2026-06-30T01:31:30.132Z`.

## Coverage Trend

| Package | Prior line/branch/function | Latest line/branch/function | Interpretation |
| --- | --- | --- | --- |
| `@sidpro/api` | 59.74 / 84.31 / 71.13 | 60.75 / 84.76 / 72.01 | Small increase across all reported dimensions. |
| `@sidpro/web` | 86.03 / 78.75 / 35.29 | 85.95 / 82.91 / 47.11 | Line coverage remains essentially stable; branch/function evidence increased. |
| `@sidpro/worker` | 88.69 / 73.79 / 83.04 | 86.64 / 74.80 / 81.29 | Normal variation in source/test denominator; not a standalone regression. |
| `@sidpro/validators` | 94.67 / 90.00 / 50.00 | 94.67 / 90.00 / 50.00 | Stable. |

Node experimental coverage includes test-source and denominator changes. These values must not be converted into a global numeric gate without a separately approved ownership, exception, and false-positive process.

## Maintainability Review

The latest inventory retains the same classes of review candidates: orchestration-heavy API services and admin route pages. No explicit `any`, suppression, debugger, TODO marker, or exact-duplicate finding requires remediation. The 24 console calls require classification by source area; they are not automatically a defect because approved operational logs and sanitized error boundaries remain in scope.

The artifact identifies `letters.service.ts`, auth, complaints, tenant, population, and several admin pages as large or lexical-control-flow candidates. This is an inventory, not a mandate to split files. Any extraction remains subject to issue #111, its existing regression suite, and the relevant AUDIT-3/AUDIT-6 policy gates.

## Decision

- No coverage ratchet is introduced.
- No maintainability threshold is introduced.
- No automatic refactor backlog is opened.
- AUDIT-2 remains `Validation Pending`.
- Collect one more comparable coverage and schema-v2 maintainability artifact before proposing any package-specific ratchet.

## Evidence References

- Workflow: `AUDIT-2 Code Quality Baseline`, run `28414139377`.
- Maintainability artifact: `audit-2-maintainability-baseline`, artifact `7968779037`.
- Coverage log artifact: `audit-2-test-coverage-log`, artifact `7968789085`.
- [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [Maintainability Triage Record](AUDIT-2-MAINTAINABILITY-TRIAGE.md)
- [Maintainability Baseline and Triage Policy](AUDIT-2-MAINTAINABILITY-POLICY.md)
