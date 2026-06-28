import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function fileUrl(path: string) {
  return new URL(path, import.meta.url);
}

function readScript(path: string) {
  return readFileSync(fileUrl(path), 'utf8');
}

const release = readScript('../../../scripts/production-release.sh');
const backup = readScript('../../../scripts/production-backup.sh');
const verifyBackup = readScript('../../../scripts/verify-production-backup.sh');
const preflight = readScript('../../../scripts/production-preflight.sh');
const postDeploy = readScript('../../../scripts/production-post-deploy-validate.sh');
const compose = readScript('../../../docker-compose.prod.yml');
const ledgerVerifier = readScript('../../../scripts/db/verify-budget-realization-ledger.sql');
const releaseWorkflow = readScript('../../../.github/workflows/production-release-gate.yml');

describe('production release gate', () => {
  it('passes Bash syntax validation', () => {
    for (const path of [
      '../../../scripts/production/lib.sh',
      '../../../scripts/production-backup.sh',
      '../../../scripts/verify-production-backup.sh',
      '../../../scripts/production-preflight.sh',
      '../../../scripts/production-post-deploy-validate.sh',
      '../../../scripts/production-release.sh',
    ]) {
      execFileSync('bash', ['-n', fileUrl(path).pathname], { stdio: 'pipe' });
    }
  });

  it('requires a production environment and releases committed source only', () => {
    assert.match(release, /NODE_ENV.*production/);
    assert.match(release, /repository contains uncommitted tracked changes/);
    assert.match(release, /sidpro_compose config -q/);
  });

  it('runs backup and restore verification before migration', () => {
    const backupIndex = release.indexOf('production-backup.sh');
    const restoreIndex = release.indexOf('verify-production-backup.sh');
    const preflightIndex = release.indexOf('production-preflight.sh');
    const migrationIndex = release.indexOf('prisma migrate deploy');
    const deployIndex = release.indexOf('up -d --build --remove-orphans');
    const validationIndex = release.indexOf('production-post-deploy-validate.sh');

    assert.ok(backupIndex >= 0);
    assert.ok(restoreIndex > backupIndex);
    assert.ok(preflightIndex > restoreIndex);
    assert.ok(migrationIndex > preflightIndex);
    assert.ok(deployIndex > migrationIndex);
    assert.ok(validationIndex > deployIndex);
  });

  it('creates atomic database and object-storage archives with a manifest', () => {
    assert.match(backup, /pg_dump/);
    assert.match(backup, /gzip -t/);
    assert.match(backup, /mc mirror/);
    assert.match(backup, /tar -tzf/);
    assert.match(backup, /database_backup=/);
    assert.match(backup, /object_backup=/);
  });

  it('restores database and object archives into disposable targets before allowing migration', () => {
    assert.match(verifyBackup, /sha256sum --check/);
    assert.match(verifyBackup, /sidpro_restore_verify_/);
    assert.match(verifyBackup, /sidpro-restore-verify-/);
    assert.match(verifyBackup, /CREATE DATABASE/);
    assert.match(verifyBackup, /DROP DATABASE IF EXISTS/);
    assert.match(verifyBackup, /_prisma_migrations/);
    assert.match(verifyBackup, /Restoring object archive into a disposable bucket/);
    assert.match(verifyBackup, /mc mb/);
    assert.match(verifyBackup, /mc rb --force/);
  });

  it('supports an empty bootstrap database but rejects a partial schema without migrations', () => {
    assert.match(preflight, /Empty bootstrap database detected/);
    assert.match(preflight, /application tables but no Prisma migration history/);
    assert.match(verifyBackup, /Restored an empty bootstrap database/);
  });

  it('blocks known migration hazards and verifies ledger consistency after deployment', () => {
    assert.match(preflight, /verify-tenant-link-integrity.sql/);
    assert.match(preflight, /verify-identity-tenant-link-integrity.sql/);
    assert.match(preflight, /negative budget_items.realized/);
    assert.match(postDeploy, /prisma migrate status/);
    assert.match(postDeploy, /verify-budget-realization-ledger.sql/);
    assert.match(ledgerVerifier, /budget_items.realized_cache/);
    assert.match(ledgerVerifier, /opening_balance_count/);
  });

  it('keeps production service env files and CI validation aligned with the release runner', () => {
    assert.match(compose, /SIDPRO_COMPOSE_ENV_FILE:-\.env/);
    assert.match(postDeploy, /SIDPRO_RUN_AUTH_SMOKE/);
    assert.match(postDeploy, /SMOKE_RUN_SEED=0/);
    assert.match(releaseWorkflow, /scripts\/production-release\.sh/);
    assert.match(releaseWorkflow, /SIDPRO_BACKUP_DIR/);
  });
});
