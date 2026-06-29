import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException } from '@nestjs/common';
import { TenantsService } from '../src/core/tenants/tenants.service.js';
import { JwtPayload } from '../src/common/decorators/current-user.decorator.js';

function makeUser(overrides: Partial<JwtPayload> = {}): JwtPayload {
  return {
    sub: 'user-1',
    email: 'operator@example.test',
    tenantId: 'tenant-1',
    roles: ['operator_desa'],
    permissions: [],
    ...overrides,
  };
}

function createService() {
  return new TenantsService({} as never, {} as never);
}

describe('TenantsService authorization exceptions', () => {
  it('rejects tenant management without superadmin or settings.manage authority', () => {
    const service = createService();
    assert.throws(() => service.assertAccess(makeUser()), ForbiddenException);
  });

  it('allows tenant management for settings.manage or superadmin authority', () => {
    const service = createService();
    assert.doesNotThrow(() => service.assertAccess(makeUser({ permissions: ['settings.manage'] })));
    assert.doesNotThrow(() => service.assertAccess(makeUser({ roles: ['superadmin_system'] })));
  });

  it('requires dedicated provisioning authority when settings and superadmin authority are absent', () => {
    const service = createService();
    assert.throws(() => service.assertProvisionAccess(makeUser()), ForbiddenException);
    assert.doesNotThrow(() =>
      service.assertProvisionAccess(makeUser({ permissions: ['tenants.provision_village'] })),
    );
  });
});
