# AUDIT-5 — Storage Cleanup Observability and Retry

## Scope

This document covers the durable cleanup path for orphaned uploaded objects and letter-PDF prefixes. The path starts when the API enqueues a `storage-cleanup` BullMQ job and ends after the worker deletes the object/prefix or exhausts retries.

## Confirmed Repository Controls

- Jobs use a stable job ID based on `fileId`, eight attempts, and exponential backoff beginning at five seconds.
- The worker validates tenant-scoped object paths before any storage deletion.
- Prefix cleanup claims a letter request and re-checks file metadata to avoid deleting an object that a retry or successful operation has already attached.
- Each completed, skipped, retrying, and final failed cleanup operation writes an audit-log event.
- Completed jobs are retained for one day (up to 1,000); failed jobs are retained for seven days (up to 500) so the queue state remains inspectable during incident follow-up.
- The worker emits JSON logs for completion, retry/failure, queue health, and worker-level errors. Cleanup completion/failure events expose only an opaque `jobReference`, attempt metadata, and sanitized error text; raw file IDs, tenant IDs, and object paths are excluded.

## Worker Configuration

The worker only processes cleanup jobs when this setting is enabled:

```dotenv
ENABLE_STORAGE_CLEANUP_WORKER=true
```

The following optional controls have safe defaults:

```dotenv
# default: 60000 milliseconds
STORAGE_CLEANUP_HEALTH_LOG_INTERVAL_MS=60000

# default: 1 retained failed job
STORAGE_CLEANUP_FAILED_THRESHOLD=1
```

When the retained failure count reaches the threshold, the worker emits a JSON event with `status: "degraded"` and writes it to stderr. This is an alert contract for the eventual platform log collector; it is not a claim that an external alert destination is already configured.

## Structured Log Events

| Event | Meaning | Operator action |
| --- | --- | --- |
| `storage_cleanup_queue_health` | Periodic counts for waiting, active, delayed, failed, and paused jobs. | Investigate when `status` is `degraded`, or when waiting/delayed grows unexpectedly. |
| `storage_cleanup_job_completed` | The worker deleted the intended tenant-scoped object or prefix. The event retains an opaque `jobReference`, not the source file, tenant, or object path. | No action unless unexpected volume is observed; correlate with the matching audit log and queue state. |
| `storage_cleanup_job_failed` | A deletion attempt failed. `finalAttempt: false` means BullMQ will retry; `true` means retries are exhausted. Failure text redacts known job metadata and URL-like values. | Inspect the matching audit log and object-storage error. Requeue only after the underlying cause is corrected. |
| `storage_cleanup_worker_error` | Worker/Redis-level error outside a specific job. | Treat as service-health incident; inspect Redis connectivity and worker logs. |
| `storage_cleanup_queue_health_error` | The worker could not retrieve queue counts. | Inspect Redis connectivity and queue permissions. |

## Verification Evidence in Repository

- `apps/worker/test/storage-cleanup.test.ts` verifies tenant path validation, skip conditions, retry audit events, and final failure audit events.
- `apps/worker/test/queue-observability.test.ts` verifies health-state, threshold, opaque job references, and metadata/URL redaction behavior without requiring Redis.
- `apps/api/test/audit-5-repository-gates.test.ts` rejects source regressions that would restore raw file, tenant, or object-path fields to cleanup structured events.
- API/worker CI tests validate the source and runtime types.

## Environment Validation Still Required

The following cannot be proven from repository CI alone and remain pending until a persistent staging/production environment exists:

1. Confirm `ENABLE_STORAGE_CLEANUP_WORKER=true` is present in the deployed worker environment.
2. Forward JSON worker logs to a persistent log system, verify that raw file/tenant/object-path metadata is absent from collected events, and create alerts for `storage_cleanup_queue_health.status = degraded`, `storage_cleanup_job_failed.finalAttempt = true`, and worker errors.
3. Execute a controlled object-storage outage/recovery drill and verify delayed jobs recover after MinIO/Redis returns.
4. Record queue retention and incident response evidence in the release or operations log.
