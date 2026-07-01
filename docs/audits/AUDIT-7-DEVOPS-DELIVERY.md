# AUDIT-7 — DevOps and Delivery

**Marker:** `[[AI-CLI|AUDIT-7|EVIDENCE_PARTIAL|VPS_REQUIRED]]`

**Status:** `Evidence Partial` — release, service, Compose, healthcheck, backup-before-migration, and rollback guidance are versioned. Persistent staging evidence for deployment, supervision, observability, secret handling, and recovery remains required.

## Scope

AUDIT-7 evaluates the path from reviewed commit to a running environment:

- source revision and release provenance;
- environment separation and server-local secrets;
- database migration ordering;
- service supervision, health, readiness, and log collection;
- deploy verification, rollback decision-making, and incident evidence.

It does not claim cloud-provider hardening, host patch posture, production uptime, external alert delivery, or successful rollback until those actions are evidenced on a persistent environment.

## Existing Repository Evidence

| Area | Versioned control | Limit |
| --- | --- | --- |
| Release gate | `scripts/production-release.sh` is documented to validate Compose, prepare backup/restore verification, run migrations, start services, and check health/public endpoints. | Must be exercised against a target environment. |
| Service topology | API, web, worker, PostgreSQL, Redis, MinIO, and reverse-proxy responsibilities are documented with staging/systemd and production Compose paths. | Actual topology and restart behavior need host evidence. |
| Secrets | Server-local env files are documented outside the repository with restrictive permissions. | Secret source, rotation, and runtime injection must be inspected on target host. |
| Rollback | Guidance warns that automatic binary rollback after migration is unsafe without compatibility review and restore approval. | A controlled rollback exercise remains required. |
| Health and smoke | Healthcheck/smoke commands are documented. | Target URLs, credentials, proxy behavior, and observability are not proven by source. |

## Persistent Staging Delivery Runbook

Use an isolated staging environment with non-production tenant fixtures and no production credentials.

1. Record the target commit SHA, container/image identifiers if used, deployment owner, UTC start time, and expected service topology.
2. Confirm secrets are server-local, permission-restricted, absent from shell history, and never emitted by command output or evidence artifacts.
3. Verify PostgreSQL, Redis, MinIO/object storage, API, web, and worker health before migration.
4. Create and checksum database/object-storage backup artifacts before release. Preserve the release-to-backup manifest reference.
5. Execute the documented release path. Capture only sanitized command result, health state, and service status.
6. Verify API health, web response, worker queue connectivity, object-storage access, migration status, and authorized smoke journeys.
7. Confirm service supervision: deliberate non-destructive restart of API, web, and worker returns each service to healthy state without manual secret re-entry.
8. Confirm logs are collected to the intended persistent sink and that storage cleanup, auth, and error logs contain no credentials, tokens, raw tenant/file metadata, or credentialed URLs.
9. Exercise a rollback decision path on staging. Do not restore data or force downgrade migrations unless the release owner has approved the compatibility decision. Record whether rollback was binary-only, restore-based, or intentionally rejected as unsafe.
10. Store a sanitized trace in the release record with commit, timestamps, expected versus actual result, backup manifest reference, and residual risks.

## Minimum Evidence Record

```md
Trace ID:
Environment: persistent staging
Commit / release identifier:
Topology verified:
Backup manifest reference:
Migration result:
Health and smoke result:
Service restart result:
Log/alert collector result:
Rollback decision and result:
Residual risk / owner:
Secrets/PII: None recorded
```

## Closure Criteria

AUDIT-7 may move to `Closed` only after a persistent environment has versioned evidence for a successful release, service recovery, observability/log redaction, approved rollback path, and reconciliation with AUDIT-1, AUDIT-4, AUDIT-5, and AUDIT-8.

## Related Documents

- [Production Release Runbook](../PRODUCTION_RELEASE.md)
- [Operations](../OPERATIONS.md)
- [AUDIT-8 Backup and Recovery](AUDIT-8-BACKUP-RECOVERY.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
