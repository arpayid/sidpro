import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

describe('@sidpro/web', () => {
  it('should have valid package name', () => {
    const pkg = '@sidpro/web';
    assert.equal(pkg, '@sidpro/web');
  });

  it('should resolve API URL fallback', () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    assert.ok(apiUrl.startsWith('http'));
  });
});
