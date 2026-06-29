import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AuthController } from '../src/core/auth/auth.controller.js';
import { REFRESH_SESSION_COOKIE } from '../src/core/auth/session-cookie.util.js';

function sessionResult() {
  return {
    success: true,
    message: 'OK',
    data: {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'admin@example.test',
        name: 'Admin',
        tenantId: 'tenant-1',
        roles: ['admin_desa'],
        permissions: ['settings.read'],
      },
    },
  };
}

function responseRecorder() {
  const cookies: unknown[] = [];
  const cleared: unknown[] = [];
  return {
    response: {
      cookie: (...args: unknown[]) => {
        cookies.push(args);
        return {};
      },
      clearCookie: (...args: unknown[]) => {
        cleared.push(args);
        return {};
      },
    },
    cookies,
    cleared,
  };
}

describe('AuthController HttpOnly session transport', () => {
  it('sets a refresh cookie but removes the refresh token from login responses', async () => {
    const service = {
      login: async () => sessionResult(),
    };
    const controller = new AuthController(service as never);
    const { response, cookies } = responseRecorder();

    const result = await controller.login(
      { email: 'admin@example.test', password: 'secret' },
      { headers: {}, ip: '127.0.0.1' } as never,
      response as never,
    );

    assert.equal((result.data as { refreshToken?: string }).refreshToken, undefined);
    assert.equal((result.data as { accessToken: string }).accessToken, 'access-token');
    assert.equal((cookies[0] as [string])[0], REFRESH_SESSION_COOKIE);
  });

  it('rotates the cookie during refresh without accepting a body token', async () => {
    const refreshCalls: unknown[] = [];
    const service = {
      refresh: async (...args: unknown[]) => {
        refreshCalls.push(args);
        return sessionResult();
      },
    };
    const controller = new AuthController(service as never);
    const { response, cookies } = responseRecorder();

    const result = await controller.refresh(
      { headers: { cookie: `${REFRESH_SESSION_COOKIE}=refresh-token` }, ip: '127.0.0.1' } as never,
      response as never,
    );

    assert.equal((refreshCalls[0] as [string])[0], 'refresh-token');
    assert.equal((result.data as { refreshToken?: string }).refreshToken, undefined);
    assert.equal((cookies[0] as [string])[0], REFRESH_SESSION_COOKIE);
  });

  it('uses the refresh cookie for logout and clears it afterwards', async () => {
    const logoutCalls: unknown[] = [];
    const service = {
      logout: async (...args: unknown[]) => {
        logoutCalls.push(args);
        return { success: true, message: 'Logout berhasil' };
      },
    };
    const controller = new AuthController(service as never);
    const { response, cleared } = responseRecorder();

    await controller.logout(
      'user-1',
      { headers: { cookie: `${REFRESH_SESSION_COOKIE}=refresh-token` }, ip: '127.0.0.1' } as never,
      response as never,
    );

    assert.deepEqual((logoutCalls[0] as unknown[]).slice(0, 2), ['user-1', 'refresh-token']);
    assert.equal((cleared[0] as [string])[0], REFRESH_SESSION_COOKIE);
  });
});
