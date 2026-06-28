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

  it('fails on high-severity dependency vulnerabilities outside the CVE allowlist', () => {
    assert.match(workflow, /pnpm install --frozen-lockfile --ignore-scripts/);
    assert.match(workflow, /pnpm audit --audit-level=high/);
    assert.doesNotMatch(workflow, /--ignore-unfixable/);
  });

  it('uses the supported Node 24 Gitleaks action against complete Git history', () => {
    assert.match(workflow, /actions\/checkout@v6/);
    assert.match(workflow, /fetch-depth: 0/);
    assert.match(workflow, /gitleaks\/gitleaks-action@v3/);
    assert.match(workflow, /GITLEAKS_ENABLE_COMMENTS: 'false'/);
  });

  it('exposes one aggregate security gate for branch protection', () => {
    assert.match(workflow, /security-gate:/);
    assert.match(workflow, /needs: \[dependency-audit, secret-scan\]/);
    assert.match(workflow, /test "\$DEPENDENCY_AUDIT_RESULT" = "success"/);
    assert.match(workflow, /test "\$SECRET_SCAN_RESULT" = "success"/);
  });
});
