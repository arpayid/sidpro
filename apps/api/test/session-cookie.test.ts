import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  REFRESH_SESSION_COOKIE,
  REFRESH_SESSION_PATH,
  assertAllowedSessionOrigin,
  clearRefreshSessionCookie,
  readRefreshSessionCookie,
  readRequestCookie,
  setRefreshSessionCookie,
} from '../src/core/auth/session-cookie.util.js';

describe('HttpOnly refresh session cookie boundary', () => {
  it('reads and decodes the named refresh cookie only', () => {
    const request = {
      headers: {
        cookie: `other=value; ${REFRESH_SESSION_COOKIE}=refresh%2Dtoken; malformed; ${REFRESH_SESSION_COOKIE}=ignored`,
      },
    };

    assert.equal(readRequestCookie(request as never, REFRESH_SESSION_COOKIE), 'refresh-token');
    assert.equal(readRequestCookie(request as never, 'missing'), null);
  });

  it('rejects a request without the refresh session cookie', () => {
    assert.throws(
      () => readRefreshSessionCookie({ headers: {} } as never),
      UnauthorizedException,
    );
  });

  it('sets a host-only HttpOnly session cookie with production-safe attributes', () => {
    const calls: unknown[] = [];
    setRefreshSessionCookie(
      {
        cookie: (...args: unknown[]) => {
          calls.push(args);
          return {} as never;
        },
      } as never,
      'raw-refresh-token',
      { nodeEnv: 'production' },
    );

    const [name, value, options] = calls[0] as [string, string, Record<string, unknown>];
    assert.equal(name, REFRESH_SESSION_COOKIE);
    assert.equal(value, 'raw-refresh-token');
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, 'lax');
    assert.equal(options.path, REFRESH_SESSION_PATH);
  });

  it('clears the session cookie with the same path and security attributes', () => {
    const calls: unknown[] = [];
    clearRefreshSessionCookie(
      {
        clearCookie: (...args: unknown[]) => {
          calls.push(args);
          return {} as never;
        },
      } as never,
      { nodeEnv: 'production' },
    );

    const [name, options] = calls[0] as [string, Record<string, unknown>];
    assert.equal(name, REFRESH_SESSION_COOKIE);
    assert.equal(options.path, REFRESH_SESSION_PATH);
    assert.equal(options.httpOnly, true);
    assert.equal(options.secure, true);
    assert.equal(options.sameSite, 'lax');
    assert.equal('maxAge' in options, false);
  });

  it('permits absent/same-site origins but rejects untrusted browser origins', () => {
    assert.doesNotThrow(() =>
      assertAllowedSessionOrigin({ headers: {} } as never, {
        nodeEnv: 'production',
        corsOrigin: 'https://sid.example.test',
      }),
    );
    assert.doesNotThrow(() =>
      assertAllowedSessionOrigin({ headers: { origin: 'https://sid.example.test' } } as never, {
        nodeEnv: 'production',
        corsOrigin: 'https://sid.example.test',
      }),
    );
    assert.throws(
      () =>
        assertAllowedSessionOrigin({ headers: { origin: 'https://attacker.example.test' } } as never, {
          nodeEnv: 'production',
          corsOrigin: 'https://sid.example.test',
        }),
      ForbiddenException,
    );
  });
});
