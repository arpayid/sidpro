import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260628000400_enforce_identity_tenant_link_guards/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
const preflight = readFileSync(
  new URL('../../../scripts/db/verify-identity-tenant-link-integrity.sql', import.meta.url),
  'utf8',
);
const runtimeTest = readFileSync(
  new URL('../../../scripts/db/test-identity-tenant-link-guards.sh', import.meta.url),
  'utf8',
);

describe('identity tenant-link guard migration', () => {
  it('treats global and tenant scopes as distinct', () => {
    assert.match(migration, /assert_exact_tenant_identity_link/);
    assert.match(migration, /IS DISTINCT FROM/);
    assert.match(migration, /assert_user_role_tenant_link/);
  });

  it('guards every confirmed identity tenant relationship', () => {
    for (const relation of [
      'user_roles.user_id and user_roles.role_id',
      'notifications.user_id',
      'complaints.reporter_id',
      'complaints.assignee_id',
      'complaint_responses.responder_id',
    ]) {
      assert.match(migration, new RegExp(relation.replace(/[.]/g, '\\.').replace(/ and /g, '[\\s\\S]*')));
    }

    for (const trigger of [
      'tenant_identity_link_guard_user_roles',
      'tenant_identity_link_guard_notifications',
      'tenant_identity_link_guard_complaints',
      'tenant_identity_link_guard_complaint_responses',
    ]) {
      assert.match(migration, new RegExp(`CREATE TRIGGER ${trigger}`));
    }
  });

  it('keeps historical preflight and runtime rejection coverage aligned', () => {
    for (const relation of [
      'user_roles.role_id',
      'notifications.user_id',
      'complaints.reporter_id',
      'complaints.assignee_id',
      'complaint_responses.responder_id',
    ]) {
      assert.match(preflight, new RegExp(relation.replace('.', '\\.')));
    }

    for (const message of [
      'cross-tenant user role link was accepted',
      'tenant user received global role',
      'global user received tenant role',
      'cross-tenant notification user link was accepted',
      'cross-tenant complaint reporter link was accepted',
      'cross-tenant complaint assignee link was accepted',
      'cross-tenant response responder link was accepted',
    ]) {
      assert.match(runtimeTest, new RegExp(message));
    }
  });
});
