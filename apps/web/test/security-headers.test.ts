import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import nextConfig from '../next.config.mjs';

describe('web security response headers', () => {
  it('applies a response header baseline to every web route', async () => {
    const rules = await nextConfig.headers?.();
    assert.ok(rules, 'next.config.mjs must expose response header rules');
    assert.equal(rules.length, 1);
    assert.equal(rules[0]?.source, '/:path*');

    const headers = Object.fromEntries(rules[0]?.headers.map(({ key, value }) => [key, value]) ?? []);
    assert.deepEqual(headers, {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'X-Permitted-Cross-Domain-Policies': 'none',
    });
  });
});
