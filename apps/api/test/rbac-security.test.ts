import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSuperadminRoleAccess,
  assertSuperadminRoleMutation,
  isSuperAdmin,
} from '../src/common/utils/rbac-security.util.js';

const superadmin = {
  sub: '1',
  email: 'a@test.id',
  tenantId: null,
  roles: ['superadmin_system'],
  permissions: [],
};

const admin = {
  sub: '2',
  email: 'b@test.id',
  tenantId: 'tenant-1',
  roles: ['admin_desa'],
  permissions: [],
};

describe('rbac security helpers', () => {
  it('detects superadmin', () => {
    assert.equal(isSuperAdmin(superadmin), true);
    assert.equal(isSuperAdmin(admin), false);
  });

  it('blocks non-superadmin from assigning superadmin role', () => {
    assert.throws(
      () => assertSuperadminRoleAccess(admin, ['superadmin_system']),
      /superadmin/,
    );
  });

  it('blocks non-superadmin from mutating superadmin role', () => {
    assert.throws(
      () => assertSuperadminRoleMutation(admin, 'superadmin_system'),
      /superadmin/,
    );
  });
});
