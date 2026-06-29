# AUDIT-2 — Dependency Versioning Policy

**Status:** `Active — runtime-critical Prisma declarations are aligned in the PR #100 source candidate`.

This policy reduces manifest/lockfile drift without claiming that exact versions alone make dependencies secure or production-ready.

## Source of Truth

- `package.json` and workspace manifests declare intended direct dependencies.
- `pnpm-lock.yaml` records the resolved graph used by CI.
- `pnpm install --frozen-lockfile` is required in CI.
- A dependency change is incomplete unless its manifests, lockfile, and relevant validation gates are updated in the same pull request.

## Versioning Rules

| Dependency class | Manifest policy | Validation requirement |
| --- | --- | --- |
| Package manager | Exact `packageManager` version | CI installs with the declared pnpm version. |
| Prisma runtime group | `prisma` and every direct `@prisma/client` declaration use one exact, tested version | Prisma generate, API/worker build, migration, production-image build, and production smoke must pass. |
| Security overrides | Each `pnpm.overrides` entry has a documented rationale and removal/review condition | Security Audit, unignored dependency audit, and affected regression validation. |
| Application runtime dependencies | Semver range is permitted only when a package compatibility policy is known and CI validates the resolved lockfile graph | Lint/type/test/build and affected production-image/smoke gates. |
| Shared package dependencies | Must not introduce application dependencies or violate AUDIT-1 boundary rules | AUDIT-1 Architecture Boundaries and package build/typecheck. |
| Tooling/development dependencies | Range is permitted unless reproducibility or compatibility requires pinning | Locked install and relevant lint/type/test/build gates. |

## Prisma Alignment Record

PR #100 applies the previously required lockfile-aware remediation:

| Declaration | Required source value |
| --- | --- |
| Root `dependencies.@prisma/client` | `6.19.3` |
| Root `devDependencies.prisma` | `6.19.3` |
| API `dependencies.@prisma/client` | `6.19.3` |
| Worker `dependencies.@prisma/client` | `6.19.3` |
| Root `devDependencies.@prisma/client` | Removed; it duplicated the runtime declaration. |

The same PR regenerated `pnpm-lock.yaml` through pnpm `10.18.3`, verified a frozen lockfile installation in an isolated Actions workspace, and requires final CI before merge. No resolved lockfile entry was edited by hand.

## Security Override Register

| Override | Reason | Removal condition |
| --- | --- | --- |
| `multer >=2.2.0` | Existing repository security floor. | Remove or replace only when the dependency graph no longer requires it and an unignored audit remains clean. |
| `postcss 8.5.10` | Fixes the #99 Next.js transitive PostCSS advisory. | Remove after a reviewed upstream parent update resolves at least this fixed version and all CI gates pass. |
| `uuid 11.1.1` | Fixes the #99 ExcelJS transitive UUID advisory while remaining compatible with the current CommonJS API and ExcelJS report/export path. | Remove or replace only after the upstream parent resolves a compatible fixed version, or after an explicit ESM compatibility migration passes report/export, API build, production-image, and smoke gates. |
| `js-yaml 4.2.0` | Fixes the #99 Nest Swagger transitive js-yaml advisory. | Remove after a reviewed upstream parent update resolves at least this fixed version and API/build gates pass. |

## UUID Major-Version Compatibility

`uuid` v12 and later are ESM-only. SIDPRO's API is currently compiled as CommonJS, while `exceljs` consumes `uuid` in the report/export dependency path. Therefore the direct API declaration and `pnpm.overrides.uuid` are pinned to `11.1.1`, and Dependabot is configured to ignore `uuid` major-version PRs.

This is not a vulnerability suppression and does not weaken the normal Security Audit. It is a compatibility guard. A future UUID major upgrade must be proposed as a dedicated migration with a module-system decision, upstream compatibility review, lockfile regeneration via declared pnpm, and report/export plus production-smoke evidence.

The `pnpm audit:dependency-policy` command validates configured suppression identifiers against the exception register and reports Prisma declarations. The standard Security Audit and AUDIT-2 unignored inventory remain the source of vulnerability evidence.

## Change Procedure

1. Identify whether the dependency belongs to a runtime-critical group.
2. Update every direct declaration in that group together.
3. Regenerate `pnpm-lock.yaml` with the declared pnpm version; do not hand-edit resolved package entries.
4. Run affected package tests/builds, Prisma generation, and production-image validation in CI.
5. For overrides, suppressions, deprecations, or breaking changes, update the relevant AUDIT-2 register/document in the same PR.
6. Record the roadmap impact.

## Non-Goals and Limits

- This policy does not require exact pinning for every npm package.
- A lockfile does not replace vulnerability review, license review, or runtime compatibility testing.
- Dependabot or other updater output still requires normal CI and audit review.
- This policy does not claim that a dependency is suitable for staging or production merely because the version graph is aligned.

## Related Documents

- [Dependency Exception Register](AUDIT-2-DEPENDENCY-EXCEPTIONS.md)
- [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [AUDIT-1 Repository and Architecture](AUDIT-1-REPOSITORY-ARCHITECTURE.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
