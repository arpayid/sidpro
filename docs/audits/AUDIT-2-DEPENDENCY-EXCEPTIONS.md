# AUDIT-2 — Dependency Exception Register

**Status:** `Active — verification in CI`.

This register governs the vulnerability suppressions currently declared in `package.json` under `pnpm.auditConfig.ignoreCves`. Listing an identifier here does **not** mean the vulnerability is safe, accepted permanently, or validated in production.

The machine-readable source of truth is [`AUDIT-2-DEPENDENCY-EXCEPTIONS.json`](AUDIT-2-DEPENDENCY-EXCEPTIONS.json). CI checks that every configured suppression has exactly one registry record, an owner, a review date, and an expiry date. CI also produces an unignored `pnpm audit --json` artifact to identify affected dependency paths without weakening the normal Security Audit gate.

## Operating Rules

1. A suppression must have one current owner, a rationale, compensating controls, a review date, and a hard expiry date.
2. A temporary exception cannot be silently extended. An extension must update both the JSON registry and this document with a new rationale.
3. The unignored audit inventory is evidence of the dependency graph at one CI run; it is not a finding closure by itself.
4. The normal **Security Audit** remains required. This register does not replace high-severity gating, secret scanning, dependency updates, or application security review.
5. Remove the entry and the `ignoreCves` identifier when the affected dependency is absent, a fixed resolution is locked, or the unignored audit no longer reports it.

## Active Temporary Exceptions

| Identifier | Owner | Metadata status | Review by | Expires | Current treatment |
| --- | --- | --- | --- | --- | --- |
| `GHSA-4r6h-8v6p-xvw6` | `arpayid` | Pending first unignored-audit inventory | 29 July 2026 | 29 September 2026 | Keep temporary suppression only while CI inventory maps the dependency path and a remediation decision is recorded. |
| `GHSA-5pgg-2g8v-p4x9` | `arpayid` | Pending first unignored-audit inventory | 29 July 2026 | 29 September 2026 | Keep temporary suppression only while CI inventory maps the dependency path and a remediation decision is recorded. |
| `CVE-2023-30533` | `arpayid` | Pending first unignored-audit inventory | 29 July 2026 | 29 September 2026 | Keep temporary suppression only while CI inventory maps the dependency path and a remediation decision is recorded. |
| `CVE-2024-22363` | `arpayid` | Pending first unignored-audit inventory | 29 July 2026 | 29 September 2026 | Keep temporary suppression only while CI inventory maps the dependency path and a remediation decision is recorded. |

## Evidence Produced by CI

The **AUDIT-2 Code Quality Baseline** workflow retains two dependency-exception files for 30 days:

- `unignored-pnpm-audit.json`: the raw `pnpm audit --json` result after the repository's suppression configuration is removed only in the ephemeral CI workspace;
- `dependency-exception-inventory.json`: a parsed cross-reference between the configured exception identifiers and the raw audit advisories.

The workflow restores the checked-out `package.json` before it completes. The normal Security Audit continues to run against the repository's committed configuration.

## Required Review Outcome

Before the `reviewBy` date, each record must be updated with:

1. affected direct/transitive package and resolved version;
2. dependency path and severity from the CI inventory;
3. whether a fixed version is available;
4. the approved short-term disposition: update, remove, replace, isolate, or time-boxed retain;
5. release impact and a revised expiry only when retention is justified.

## Non-Claims

- This register does not state that a suppression is non-exploitable.
- This register does not prove vulnerability reachability in SIDPRO's deployed runtime.
- This register does not claim staging or production validation.

## Related Documents

- [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
