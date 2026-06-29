# AUDIT-2 — Dependency Exception Register

**Status:** `No active exceptions — verification in CI`.

This register governs any future vulnerability suppressions declared in `package.json` under `pnpm.auditConfig.ignoreCves`. It currently contains **no active exception**.

The initial AUDIT-2 unignored audit inventory showed that the four inherited suppression identifiers did not match any current advisory. The configured suppressions and their temporary records were removed rather than renewed. This does **not** mean the repository has no dependency findings: the same inventory identified three moderate transitive advisories, recorded in [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md).

The machine-readable source of truth is [`AUDIT-2-DEPENDENCY-EXCEPTIONS.json`](AUDIT-2-DEPENDENCY-EXCEPTIONS.json). CI checks that configured suppressions and registry records match exactly. CI also retains an unignored `pnpm audit --json` artifact to detect dependency findings without weakening the normal Security Audit gate.

## Operating Rules

1. A suppression must have one current owner, a rationale, compensating controls, a review date, and a hard expiry date.
2. A temporary exception cannot be silently extended. An extension must update both the JSON registry and this document with a new rationale.
3. The unignored audit inventory is evidence of the dependency graph at one CI run; it is not a finding closure by itself.
4. The normal **Security Audit** remains required. This register does not replace high-severity gating, secret scanning, dependency updates, or application security review.
5. Remove the entry and the `ignoreCves` identifier when the affected dependency is absent, a fixed resolution is locked, or the unignored audit no longer reports it.

## Current State

| Item | Result |
| --- | --- |
| Configured `pnpm.auditConfig.ignoreCves` entries | None |
| Machine-readable exception records | None |
| Removed stale identifiers | `GHSA-4r6h-8v6p-xvw6`, `GHSA-5pgg-2g8v-p4x9`, `CVE-2023-30533`, `CVE-2024-22363` |
| Registry validation | CI requires configured identifiers and registry records to remain identical. |

## Evidence Produced by CI

The **AUDIT-2 Code Quality Baseline** workflow retains dependency-audit files for 30 days:

- `unignored-pnpm-audit.json`: the raw `pnpm audit --json` result after any suppression configuration is removed only in the ephemeral CI workspace;
- `dependency-exception-inventory.json`: a parsed cross-reference between configured exception identifiers and raw audit advisories;
- `unignored-pnpm-audit.status.txt`: the command exit status, retained separately so the JSON evidence remains available even when advisories are present.

The workflow restores the checked-out `package.json` before it completes. The normal Security Audit continues to run against the repository's committed configuration.

## Requirements for a Future Exception

Before a new suppression can be merged, its JSON registry record must include:

1. affected direct/transitive package and resolved version;
2. dependency path and severity from the CI inventory;
3. whether a fixed version is available;
4. one owner, rationale, compensating control, review date, and expiry date;
5. the approved short-term disposition: update, remove, replace, isolate, or time-boxed retain;
6. release impact and a removal condition.

## Non-Claims

- The absence of active suppression does not prove every dependency issue is non-exploitable.
- This register does not prove vulnerability reachability in SIDPRO's deployed runtime.
- This register does not claim staging or production validation.

## Related Documents

- [AUDIT-2 Dependency and Code Quality](AUDIT-2-DEPENDENCY-CODE-QUALITY.md)
- [Security Audit Automation](../SECURITY_AUDIT.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
