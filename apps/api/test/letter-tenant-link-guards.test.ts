import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000600_enforce_letter_tenant_link_guards/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

const preflight = readFileSync(
  new URL('../../../scripts/db/verify-tenant-link-integrity.sql', import.meta.url),
  'utf8',
);

const workflow = readFileSync(
  new URL('../../../.github/workflows/tenant-link-integrity.yml', import.meta.url),
  'utf8',
);

describe('letter tenant-link guard migration', () => {
  it('protects every letter-owned reference at the database boundary', () => {
    assert.match(migration, /assert_exact_tenant_identity_link\([\s\S]*letter_requests\.requester_id/);
    assert.match(migration, /assert_same_tenant_link\([\s\S]*letter_requests\.resident_id/);
    assert.match(migration, /assert_same_tenant_link\([\s\S]*letter_requests\.letter_type_id/);
    assert.match(migration, /assert_same_tenant_link\([\s\S]*letter_approvals\.letter_request_id/);
    assert.match(migration, /assert_exact_tenant_identity_link\([\s\S]*letter_approvals\.approver_id/);
    assert.match(migration, /assert_same_tenant_link\([\s\S]*letter_number_sequences\.letter_type_id/);
  });

  it('blocks parent tenant drift for users, residents, requests, and letter types', () => {
    for (const trigger of [
      'tenant_dependent_guard_letter_requests',
      'tenant_dependent_guard_letter_types',
      'tenant_dependent_guard_users_letter_links',
      'tenant_dependent_guard_residents_letter_links',
    ]) {
      assert.match(migration, new RegExp(`CREATE TRIGGER ${trigger}`));
    }
  });

  it('adds a nullable approver foreign key with safe deletion semantics', () => {
    assert.match(
      migration,
      /ADD CONSTRAINT letter_approvals_approver_id_fkey\s+FOREIGN KEY \(approver_id\) REFERENCES users\(id\) ON DELETE SET NULL/,
    );
  });

  it('extends production preflight checks for every new letter relation', () => {
    for (const relation of [
      'letter_requests.requester_id',
      'letter_requests.resident_id',
      'letter_requests.letter_type_id',
      'letter_approvals.letter_request_id',
      'letter_approvals.approver_id',
      'letter_number_sequences.letter_type_id',
    ]) {
      assert.match(preflight, new RegExp(relation.replace('.', '\\.')));
    }
  });

  it('runs the PostgreSQL letter guard script in the tenant-integrity workflow', () => {
    assert.match(workflow, /scripts\/db\/test-letter-tenant-link-guards\.sh/);
    assert.match(workflow, /bash scripts\/db\/test-letter-tenant-link-guards\.sh/);
  });
});
