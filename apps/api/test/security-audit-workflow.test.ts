import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workflow = readFileSync(
  new URL('../../../.github/workflows/security-audit.yml', import.meta.url),
  'utf8',
);

describe('security audit workflow', () => {
  it('uses least-privilege repository permissions', () => {
    assert.match(workflow, /permissions:\n\s+contents: read/);
  });

  it('fails on high-severity dependency vulnerabilities', () => {
    assert.match(workflow, /pnpm install --frozen-lockfile --ignore-scripts/);
    assert.match(workflow, /pnpm audit --audit-level=high --ignore-unfixable/);
  });

  it('scans complete Git history for committed secrets', () => {
    assert.match(workflow, /fetch-depth: 0/);
    assert.match(workflow, /gitleaks\/gitleaks-action@v2/);
  });

  it('exposes one aggregate security gate for branch protection', () => {
    assert.match(workflow, /security-gate:/);
    assert.match(workflow, /needs: \[dependency-audit, secret-scan\]/);
    assert.match(workflow, /test "\$DEPENDENCY_AUDIT_RESULT" = "success"/);
    assert.match(workflow, /test "\$SECRET_SCAN_RESULT" = "success"/);
  });
});
