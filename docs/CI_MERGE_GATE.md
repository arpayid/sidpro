# CI Merge Gate

This repository uses GitHub Actions as the merge gate. Configure the branch rule or ruleset for `main` to require a pull request and the following status checks before merging:

1. `CI / validate`
2. `CI / production-smoke`
3. `Security Audit / Security Gate`

`Security Audit / Security Gate` is an aggregate check. It fails when either the high-severity dependency audit or the Gitleaks committed-secret scan fails.

`Tenant Link Integrity / tenant-link-integration` remains a conditional PostgreSQL integration workflow for schema, migration, tenant-guard script, and tenant-workflow changes. It must pass whenever GitHub starts it, but it is not a global required check because path-filtered workflows do not create a status check for unrelated pull requests.

## Recommended `main` rule settings

- Require a pull request before merging.
- Require the status checks above to pass.
- Require all review threads to be resolved.
- Block force pushes and branch deletion.
- Do not allow direct pushes to `main`.

Apply these settings only after the first successful `Security Audit` run, because GitHub lists a check as selectable only after it has reported at least once.
