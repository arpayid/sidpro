# AUDIT-2 — UUID Major-Version Compatibility

**Status:** `Resolved in Source — compatibility guard active`.

## Context

SIDPRO currently compiles `apps/api` as CommonJS. The report/export dependency graph includes `exceljs`, which consumes `uuid`. The repository-level `pnpm.overrides.uuid` value is `11.1.1`, a previously audited security floor for the inherited ExcelJS path.

UUID major versions 12 and later are ESM-only. The Dependabot PR that attempted the 11 → 14 transition failed its install-based CI gates and must not be treated as a routine patch update.

## Current Decision

- Retain the audited `uuid` 11.1.1 override.
- Ignore Dependabot **major** updates for `uuid`; patch/minor evaluation remains available when compatible.
- Do not add an audit suppression or lower the Security Audit threshold.
- Do not claim staging/production validation from this repository-level compatibility decision.

## Required Evidence for a Future UUID Major Upgrade

A future PR must include all of the following:

1. an explicit API module-system decision and migration plan;
2. review of the `exceljs` UUID dependency path or an upstream replacement;
3. lockfile regeneration using the declared pnpm version;
4. successful lint, typecheck, tests, API build, worker build, report/export regression checks, production-image build, and production smoke;
5. an AUDIT-2 Change Ledger entry documenting the migration and residual risk.

## Evidence

- AUDIT-2 Dependency Versioning Policy records `uuid` 11.1.1 as the reviewed ExcelJS transitive advisory floor.
- PR #125 attempted the incompatible UUID major update and failed its CI install path.
- This document and the Dependabot configuration define the repeatable remediation.

## Non-Claims

This document does not claim that UUID 11.1.1 resolves every future advisory, that UUID is unreachable, or that the application has completed an ESM migration.
