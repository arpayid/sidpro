# AUDIT-2 — Dependency Versioning Policy

**Status:** `Active for runtime-critical dependency groups`.

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
| Prisma runtime group | `prisma` and every direct `@prisma/client` declaration use the same exact version | Prisma generate, API/worker build, migration, production-image build, and production smoke must pass. |
| Security overrides | Each `pnpm.overrides` entry must have a documented reason and removal condition | Security Audit plus AUDIT-2 exception/decision documentation. |
| Application runtime dependencies | Semver range is permitted only when a package's compatibility policy is known and CI validates the resolved lockfile graph | Lint/type/test/build and affected production-image/smoke gates. |
| Shared package dependencies | Must not introduce application dependencies or violate AUDIT-1 boundary rules | AUDIT-1 Architecture Boundaries and package build/typecheck. |
| Tooling/development dependencies | Range is permitted unless a reproducibility or compatibility issue requires pinning | Locked install and relevant lint/type/test/build gates. |

## Prisma Alignment Baseline

SIDPRO uses Prisma in root scripts plus API and worker runtime paths. The direct declarations for `prisma` and `@prisma/client` are therefore treated as one runtime-critical group.

Current enforced baseline:

- `prisma`: `6.19.3` at the root;
- `@prisma/client`: `6.19.3` at the root, API, and worker;
- no other direct workspace declaration may introduce a divergent `prisma` or `@prisma/client` version.

The `pnpm audit:dependency-policy` command checks these declarations and verifies that the documented exception registry matches the configured `ignoreCves` list. The AUDIT-2 workflow runs the check on every relevant pull request, main/develop push, scheduled review, and manual dispatch.

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
