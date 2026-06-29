import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCredentialedCorsOrigins } from '../src/config/cors.config.js';
import { API_SECURITY_HEADERS, applyApiSecurityHeaders } from '../src/config/security-http.config.js';

describe('Security HTTP configuration', () => {
  it('uses a local development CORS origin only when no origin is configured', () => {
    assert.deepEqual(parseCredentialedCorsOrigins(undefined, 'development'), ['http://localhost:3000']);
  });

  it('normalizes and de-duplicates configured credentialed CORS origins', () => {
    assert.deepEqual(
      parseCredentialedCorsOrigins('https://sid.example.test, https://admin.example.test/,https://sid.example.test', 'production'),
      ['https://sid.example.test', 'https://admin.example.test'],
    );
  });

  it('rejects wildcard, blank production, and non-origin CORS configuration', () => {
    assert.throws(() => parseCredentialedCorsOrigins(undefined, 'production'), /required in production/);
    assert.throws(() => parseCredentialedCorsOrigins('*', 'production'), /must not include/);
    assert.throws(() => parseCredentialedCorsOrigins('https://sid.example.test/path', 'production'), /origin only/);
  });

  it('applies the API response security header baseline', () => {
    const headers = new Map<string, string>();
    applyApiSecurityHeaders({
      setHeader(name, value) {
        headers.set(name, value);
      },
    });

    assert.deepEqual(Object.fromEntries(headers), API_SECURITY_HEADERS);
  });
});
