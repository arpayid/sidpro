# AUDIT-9 — Performance and Scale

**Marker:** `[[AI-CLI|AUDIT-9|NOT_FORMALLY_ASSESSED|VPS_REQUIRED]]`

**Status:** `Not Formally Assessed` — the repository contains query-plan, pagination, queue, and report/export controls, but no approved workload model, latency objective, concurrency target, or capacity benchmark evidence.

## Scope

AUDIT-9 evaluates performance and capacity against an agreed staging workload:

- public and authenticated API latency/error behavior;
- admin list, search, pagination, report, and export behavior;
- queue throughput/backlog recovery;
- database query plan and resource pressure;
- web rendering and asset delivery under representative load;
- capacity limits, degradation behavior, and operational guardrails.

No load test or performance claim is valid until the product owner agrees the workload and acceptance objectives below.

## Decision Inputs Required Before Testing

The owner must provide these values for the target deployment:

| Decision | Required value |
| --- | --- |
| Tenant model | Number of active tenants and expected largest tenant. |
| Data profile | Approximate residents, families, complaints, letters, uploads, audit logs, and report rows. |
| User profile | Expected concurrent public users, concurrent operators, and peak time window. |
| Critical journeys | Read, write, upload, tracking, export, and worker paths that must remain usable. |
| Objectives | Latency percentile, error-rate ceiling, queue-delay ceiling, export completion expectation, and acceptable degradation behavior. |
| Infrastructure | CPU, RAM, disk class, PostgreSQL/Redis/MinIO topology, network, and proxy/CDN path. |
| Test safety | Fixture tenant, non-production SMTP/storage, request limit, cleanup owner, and abort threshold. |

## Candidate Workload Matrix

Use only non-production fixture data and non-destructive requests unless a written test plan approves mutation cleanup.

| Journey | Example evidence | Guardrail |
| --- | --- | --- |
| Portal public read | Homepage, news list, service list, letter/complaint tracking with fixture references. | Do not enumerate real public identifiers. |
| Admin authenticated read | Dashboard, resident/family list, filters, bounded pagination, audit-log read. | Fixture account with least privilege needed. |
| Admin mutation | Complaint status change, CMS draft update, letter workflow transition. | Use disposable fixture records and verify audit log. |
| Upload/download | Allowed fixture file upload, signed-download authorization, cleanup queue. | No resident document or production bucket. |
| Reports/exports | Representative CSV/XLSX report reads and generated exports. | Cap data volume and clean temporary files. |
| Worker | Notification/cleanup queue enqueue, throughput, retry, and backlog recovery. | Non-production Redis/SMTP/storage only. |

## Benchmark Evidence Contract

Each benchmark record must include:

```md
Trace ID:
Environment / commit:
Infrastructure profile:
Fixture data profile:
Tool and test script version:
Warm-up / test duration / concurrency:
Journey matrix:
Latency percentiles and error rates:
Database and queue observations:
Abort thresholds and whether triggered:
Known bottlenecks:
Decision: pass / conditional / fail
Owner approval:
Secrets/PII: None recorded
```

## Go/No-Go Rules

- Do not compare results from different data profiles or hardware as a trend without clearly labeling the difference.
- Do not raise concurrency after error, queue delay, database lock, disk, memory, or proxy saturation appears without first identifying the owner and corrective action.
- Do not use production tenants, credentials, uploads, or outbound email as load-test fixtures.
- A pass at one workload does not prove capacity for a larger tenant, event-driven surge, or disaster recovery mode.

## Closure Criteria

AUDIT-9 may move to `Closed` only after workload objectives are approved, repeatable staging benchmarks are captured at agreed data/concurrency levels, bottlenecks have owned treatment, and results are reconciled with AUDIT-3, AUDIT-5, AUDIT-7, and AUDIT-8.

## Related Documents

- [AUDIT-3 API and Domain Logic](AUDIT-3-API-DOMAIN-LOGIC.md)
- [AUDIT-5 Database and Tenant Integrity](AUDIT-5-DATABASE-TENANT-INTEGRITY.md)
- [AUDIT-7 DevOps and Delivery](AUDIT-7-DEVOPS-DELIVERY.md)
- [Audit Master Register](AUDIT_MASTER_REGISTER.md)
- [AUDIT CLI Handoff](AUDIT_CLI_HANDOFF.md)
