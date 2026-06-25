import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { API_PREFIX, buildApiUrl, DEFAULT_API_ORIGIN, getApiOrigin } from '../src/lib/api-url';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  }
});

describe('@sidpro/web', () => {
  it('should have valid package name', () => {
    const pkg = '@sidpro/web';
    assert.equal(pkg, '@sidpro/web');
  });

  it('should resolve API URL fallback to an origin without the API prefix', () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    assert.equal(getApiOrigin(), DEFAULT_API_ORIGIN);
    assert.equal(buildApiUrl('/health'), `${DEFAULT_API_ORIGIN}${API_PREFIX}/health`);
  });

  it('should build same-origin API URLs when NEXT_PUBLIC_API_URL is intentionally empty', () => {
    process.env.NEXT_PUBLIC_API_URL = '';

    assert.equal(getApiOrigin(), '');
    assert.equal(buildApiUrl('/health'), `${API_PREFIX}/health`);
  });

  it('should not duplicate /api/v1 when callers pass the legacy prefixed path', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://desa.example.test';

    assert.equal(
      buildApiUrl('/api/v1/public/stats?tenantCode=demo'),
      'https://desa.example.test/api/v1/public/stats?tenantCode=demo',
    );
    assert.equal(buildApiUrl('/health').includes('/api/v1/api/v1'), false);
  });

  it('should strip a legacy /api/v1 suffix from NEXT_PUBLIC_API_URL', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://desa.example.test/api/v1/';

    assert.equal(getApiOrigin(), 'https://desa.example.test');
    assert.equal(buildApiUrl('/health'), 'https://desa.example.test/api/v1/health');
  });
});
