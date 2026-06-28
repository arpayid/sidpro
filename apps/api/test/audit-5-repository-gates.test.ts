import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function fileUrl(path: string) {
  return new URL(path, import.meta.url);
}

function read(path: string) {
  return readFileSync(fileUrl(path), 'utf8');
}

const migration = read('../../../prisma/migrations/20260628001100_add_audit_5_report_export_indexes/migration.sql');
const planScript = read('../../../scripts/db/test-report-export-query-plans.sh');
const complaintPlanScript = read('../../../scripts/db/test-complaint-export-query-plan.sh');
const planWorkflow = read('../../../.github/workflows/audit-5-query-plan-evidence.yml');
const worker = read('../../worker/src/index.ts');
const queueService = read('../src/core/queue/storage-cleanup-queue.service.ts');
const observability = read('../../worker/src/queue-observability.ts');
const compositeFkEvaluation = read('../../../docs/audits/AUDIT-5-COMPOSITE-FK-EVALUATION.md');
const cleanupRunbook = read('../../../docs/audits/AUDIT-5-STORAGE-CLEANUP-OBSERVABILITY.md');

describe('AUDIT-5 repository gates', () => {
  it('keeps the PostgreSQL query-plan fixtures shell-valid', () => {
    for (const path of [
      '../../../scripts/db/test-report-export-query-plans.sh',
      '../../../scripts/db/test-complaint-export-query-plan.sh',
    ]) {
      execFileSync('bash', ['-n', fileUrl(path).pathname], { stdio: 'pipe' });
    }
  });

  it('keeps evidence for tenant-scoped report and export query shapes', () => {
    for (const index of [
      'civil_events_tenant_event_date_idx',
      'letter_requests_tenant_submitted_at_idx',
      'audit_logs_tenant_created_at_idx',
      'complaints_tenant_created_at_idx',
    ]) {
      assert.match(migration, new RegExp(index));
    }
    assert.doesNotMatch(migration, /residents_tenant_active_full_name_idx/);
    assert.match(planScript, /residents_tenant_id_nik_key/);
    assert.match(planScript, /EXPLAIN \(ANALYZE, BUFFERS, FORMAT JSON\)/);
    assert.match(complaintPlanScript, /complaints_tenant_created_at_idx/);
    assert.match(complaintPlanScript, /complaint CSV export/);
    assert.match(planWorkflow, /test-report-export-query-plans\.sh/);
    assert.match(planWorkflow, /test-complaint-export-query-plan\.sh/);
  });

  it('preserves cleanup retry evidence and structured queue health logs', () => {
    assert.match(queueService, /attempts: 8/);
    assert.match(queueService, /removeOnComplete: \{ age: 86_400, count: 1000 \}/);
    assert.match(queueService, /removeOnFail: \{ age: 604_800, count: 500 \}/);
    assert.match(worker, /storage_cleanup_queue_health/);
    assert.match(worker, /createStorageCleanupFailureEvent/);
    assert.match(worker, /STORAGE_CLEANUP_HEALTH_LOG_INTERVAL_MS/);
    assert.match(worker, /STORAGE_CLEANUP_FAILED_THRESHOLD/);
    assert.match(observability, /storage_cleanup_job_failed/);
    assert.match(observability, /finalAttempt/);
  });

  it('records the composite FK decision and pending environment validation explicitly', () => {
    assert.match(compositeFkEvaluation, /Existing tenant-link triggers remain the authoritative protection/);
    assert.match(compositeFkEvaluation, /Candidate First Pilot/);
    assert.match(cleanupRunbook, /Environment Validation Still Required/);
    assert.match(cleanupRunbook, /storage_cleanup_queue_health/);
  });
});
