import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { ApiError, apiClient, buildQuery } from '../src/lib/api-client';
import { API_PREFIX, buildApiUrl, DEFAULT_API_ORIGIN, getApiOrigin } from '../src/lib/api-url';

const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const originalFetch = globalThis.fetch;

afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  }
  globalThis.fetch = originalFetch;
  mock.restoreAll();
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

  it('should build query strings without empty optional values', () => {
    assert.equal(buildQuery({ tenantCode: 'demo', page: 2, search: '', status: undefined }), '?tenantCode=demo&page=2');
  });

  it('should send JSON requests through the canonical API client URL builder', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://desa.example.test/api/v1';
    const calls: Array<{ url: string; init?: globalThis.RequestInit }> = [];
    globalThis.fetch = (async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({ data: { ok: true } });
    }) as typeof fetch;

    const response = await apiClient<{ ok: boolean }>('/public/stats', {
      method: 'POST',
      body: { tenantCode: 'demo' },
      skipAuth: true,
    });

    assert.deepEqual(response.data, { ok: true });
    assert.equal(calls[0]?.url, 'https://desa.example.test/api/v1/public/stats');
    assert.equal(calls[0]?.init?.body, JSON.stringify({ tenantCode: 'demo' }));
    assert.equal(new Headers(calls[0]?.init?.headers).get('content-type'), 'application/json');
  });

  it('should throw ApiError with response status and backend code', async () => {
    globalThis.fetch = (async () =>
      Response.json(
        { message: 'Data tidak valid', error: { code: 'VALIDATION_ERROR' } },
        { status: 422 },
      )) as typeof fetch;

    await assert.rejects(
      () => apiClient('/residents', { method: 'POST', body: { nik: '' }, skipAuth: true }),
      (error: unknown) => {
        assert.equal(error instanceof ApiError, true);
        assert.equal((error as ApiError).message, 'Data tidak valid');
        assert.equal((error as ApiError).status, 422);
        assert.equal((error as ApiError).code, 'VALIDATION_ERROR');
        return true;
      },
    );
  });
});
