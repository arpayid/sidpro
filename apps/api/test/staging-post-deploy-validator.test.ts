import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(
  new URL('../../../scripts/staging-post-deploy-validate.sh', import.meta.url),
  'utf8',
);

describe('staging post-deploy validator', () => {
  it('uses strict Bash execution and sources the server-local environment', () => {
    assert.match(script, /^#!\/usr\/bin\/env bash/m);
    assert.match(script, /set -euo pipefail/);
    assert.match(script, /SIDPRO_ENV_FILE:-\/etc\/sidpro\/sidpro\.env/);
    assert.match(script, /source "\$ENV_FILE"/);
  });

  it('requires a clean tenant-link preflight before service checks', () => {
    const preflightIndex = script.indexOf('verify-tenant-link-integrity.sql');
    const healthcheckIndex = script.indexOf('bash scripts/healthcheck.sh');

    assert.ok(preflightIndex >= 0);
    assert.ok(healthcheckIndex >= 0);
    assert.ok(preflightIndex < healthcheckIndex);
    assert.match(script, /tenant-link integrity violations found/);
  });

  it('checks migration status and runs smoke tests without reseeding', () => {
    assert.match(script, /prisma migrate status --schema=prisma\/schema\.prisma/);
    assert.match(script, /SMOKE_RUN_SEED=0 bash scripts\/smoke-test\.sh/);
  });
});
