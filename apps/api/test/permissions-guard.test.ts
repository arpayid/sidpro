import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../src/common/guards/permissions.guard.js';
import { PERMISSIONS_ALL_KEY } from '../src/common/decorators/index.js';

function mockContext(user: { permissions: string[] } | null): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

describe('permissions guard all mode', () => {
  it('requires every listed permission', () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === PERMISSIONS_ALL_KEY) return ['reports.export', 'reports.population'];
        return undefined;
      },
    } as unknown as Reflector;

    const guard = new PermissionsGuard(reflector);

    assert.throws(
      () =>
        guard.canActivate(
          mockContext({ permissions: ['reports.export'] }),
        ),
      ForbiddenException,
    );

    assert.equal(
      guard.canActivate(
        mockContext({ permissions: ['reports.export', 'reports.population'] }),
      ),
      true,
    );
  });
});
