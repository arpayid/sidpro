# Security Audit Automation

GitHub Actions workflow `Security Audit` runs for pull requests and pushes to `main` and `develop`, weekly on Monday, and on manual dispatch.

## Checks

- **Dependency Audit** installs the lockfile with lifecycle scripts disabled and fails on dependency vulnerabilities with severity `high` or `critical`, except the repository's documented unfixable CVE allowlist.
- **Secret Scan** uses Gitleaks against the complete Git history.
- **Security Gate** aggregates both results into one required status check: `Security Audit / Security Gate`.

The workflow has read-only repository token permissions and does not deploy or access production secrets.

## Dependency updates

Dependabot opens weekly pull requests for npm/pnpm dependencies and GitHub Actions versions. Every Dependabot PR must pass the global `CI` and `Security Audit` gates. The conditional `Tenant Link Integrity` workflow must also pass whenever a pull request changes its configured schema, migration, guard-script, or workflow paths.
