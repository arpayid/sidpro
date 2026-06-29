import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../../', import.meta.url));

function source(path: string): string {
  return readFileSync(`${root}${path}`, 'utf8');
}

describe('browser session boundary policy', () => {
  it('keeps browser credential state out of localStorage and JavaScript cookies', () => {
    const auth = source('apps/web/src/lib/auth.ts');
    assert.doesNotMatch(auth, /localStorage/);
    assert.doesNotMatch(auth, /document\.cookie/);
    assert.doesNotMatch(auth, /sidpro_refresh_token/);
    assert.match(auth, /let accessToken: string \| null = null/);
  });

  it('hydrates session state through credentialed refresh without a browser refresh token', () => {
    const apiClient = source('apps/web/src/lib/api-client.ts');
    assert.doesNotMatch(apiClient, /getRefreshToken/);
    assert.match(apiClient, /fetch\(buildApiUrl\('\/auth\/refresh'\), \{/);
    assert.match(apiClient, /credentials: 'include'/);
    assert.doesNotMatch(apiClient, /refreshToken\s*:/);
  });

  it('removes the JavaScript-readable middleware cookie guard', () => {
    assert.equal(existsSync(`${root}apps/web/src/middleware.ts`), false);
  });
});
