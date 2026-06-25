import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEnv } from '../src/config/env.validation.js';

describe('environment validation', () => {
  it('provides safe development defaults for local execution', () => {
    const config = validateEnv({ NODE_ENV: 'development' });

    assert.equal(config.JWT_SECRET, 'change-me');
    assert.equal(config.CORS_ORIGIN, 'http://localhost:3000');
  });

  it('rejects production with missing required configuration', () => {
    assert.throws(
      () => validateEnv({ NODE_ENV: 'production' }),
      /Invalid production environment configuration/,
    );
  });

  it('rejects production default secrets', () => {
    assert.throws(
      () =>
        validateEnv({
          NODE_ENV: 'production',
          DATABASE_URL: 'postgresql://sidpro:sidpro_secret@postgres:5432/sidpro',
          REDIS_URL: 'redis://redis:6379',
          JWT_SECRET: 'change-me',
          CORS_ORIGIN: 'https://desa.example.id',
          MINIO_ENDPOINT: 'minio',
          MINIO_ROOT_USER: 'sidpro',
          MINIO_ROOT_PASSWORD: 'sidpro_secret',
          MINIO_BUCKET: 'sidpro-files',
        }),
      /unsafe\/default/,
    );
  });
});
