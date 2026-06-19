import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertRegencyScope,
  isRegencyAdmin,
} from '../src/core/tenants/tenant-scope.util.js';

describe('tenant scope util', () => {
  it('detects regency admin role', () => {
    assert.equal(isRegencyAdmin(['admin_kabupaten']), true);
    assert.equal(isRegencyAdmin(['admin_desa']), false);
  });

  it('asserts regency scope', () => {
    assert.equal(
      assertRegencyScope({ tenantId: 'reg-1', roles: ['admin_kabupaten'] }),
      'reg-1',
    );
    assert.throws(() =>
      assertRegencyScope({ tenantId: null, roles: ['admin_kabupaten'] }),
    );
  });
});
