# AUDIT-8 — Backup and Recovery

**Marker:** `[[AI-CLI|AUDIT-8|EVIDENCE_PARTIAL|VPS_REQUIRED]]`

**Status:** `Evidence Partial` — repository release controls create database and object-storage backups, verify checksums, and document a database restore verification path. A persistent restore drill with measured recovery objectives is still required.

## Scope

AUDIT-8 evaluates recoverability of SIDPRO state:

- PostgreSQL backup completeness and integrity;
- object-storage/uploads backup completeness and integrity;
- restore isolation and destructive-action safeguards;
- recovery point objective (RPO) and recovery time objective (RTO) observations;
- ownership, retention, and evidence preservation.

It does not claim disaster-recovery readiness, off-site replication, or compliance retention until the target environment demonstrates them.

## Existing Repository Evidence

| Area | Versioned control | Limit |
| --- | --- | --- |
| Pre-release backup | Production release guidance creates database and upload/object-storage archives before migration. | Must be validated on the actual persistent storage path. |
| Integrity | Backup artifacts include SHA-256 checksums and release manifest references. | Checksums do not prove a usable application restore. |
| Database restore verification | Release guidance restores database dump into an isolated temporary database before migration. | Restore must be repeated against target version and representative data. |
| Restore guardrails | Development restore commands refuse `NODE_ENV=production`; production recovery requires explicit operator decision. | Host access controls and operator procedure need validation. |
| Operations | Staging backup schedule and artifact locations are documented. | Scheduler execution, retention, and off-host copy need evidence. |

## Persistent Staging Restore Drill

Run only in an isolated non-production environment. Do not restore into the active production database, bucket, or tenant.

1. Record Trace ID, target commit, environment, backup creation time, and intended restore target.
2. Produce database and object-storage/upload backups using the documented release or operations path.
3. Verify every checksum before restoration. Stop on a mismatch.
4. Restore PostgreSQL into an isolated database name and restore uploads/object storage into an isolated bucket or prefix.
5. Run migration-status validation against the restored database without applying destructive changes.
6. Start an isolated API/web/worker configuration pointing only at restored services.
7. Run read-only and non-destructive smoke checks: health, authorized login with fixture account, public tracking lookup using fixture data, file metadata access policy, and representative report read.
8. Measure elapsed time from restore start to usable smoke result. Record the latest recoverable backup timestamp and calculate the observed RPO/RTO; do not infer objectives that have not been agreed by the owner.
9. Verify the active staging environment is unchanged. Remove isolated restore resources only after evidence is captured.
10. Record failures, manual steps, missing permissions, and action owner before scheduling the next drill.

## Minimum Evidence Record

```md
Trace ID:
Environment and restore isolation:
Commit / schema version:
Database backup checksum result:
Object-storage backup checksum result:
Restore start / usable timestamp:
Observed RPO:
Observed RTO:
Smoke result against restored services:
Active environment unchanged: yes/no
Residual risk / owner:
Secrets/PII: None recorded
```

## Closure Criteria

AUDIT-8 may move to `Closed` only after a persistent non-production restore drill has demonstrated database and object-storage recovery, measured RPO/RTO, validated the restored application surface, and reconciled recovery findings with AUDIT-5, AUDIT-7, and AUDIT-10.

## Related Documents

- [Production Release Runbook](../PRODUCTION_RELEASE.md)
- [Operations](../OPERATIONS.md)
- [AUDIT-7 DevOps and Delivery](AUDIT-7-DEVOPS-DELIVERY.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
