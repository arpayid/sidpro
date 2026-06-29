import { parseCredentialedCorsOrigins } from './cors.config';

const DEFAULT_DEVELOPMENT_VALUES: Record<string, string> = {
  JWT_SECRET: 'change-me',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  CORS_ORIGIN: 'http://localhost:3000',
  DATABASE_URL: 'postgresql://sidpro:sidpro_secret@localhost:5432/sidpro?schema=public',
  REDIS_URL: 'redis://localhost:6379',
};

const PRODUCTION_REQUIRED_KEYS = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
  'CORS_ORIGIN',
  'MINIO_ENDPOINT',
  'MINIO_ROOT_USER',
  'MINIO_ROOT_PASSWORD',
  'MINIO_BUCKET',
] as const;

const BLOCKED_PRODUCTION_VALUES = new Set([
  'change-me',
  'change-me-to-a-long-random-secret-in-production',
  'sidpro_secret',
  'Admin123!',
  'admin',
  'password',
]);

function isProduction(config: Record<string, unknown>) {
  return config.NODE_ENV === 'production';
}

function isBlank(value: unknown) {
  return typeof value !== 'string' || value.trim().length === 0;
}

function assertProductionEnv(config: Record<string, unknown>) {
  const missing = PRODUCTION_REQUIRED_KEYS.filter((key) => isBlank(config[key]));

  const blocked = PRODUCTION_REQUIRED_KEYS.filter((key) => {
    const value = config[key];
    return (
      typeof value === 'string' &&
      [...BLOCKED_PRODUCTION_VALUES].some((blockedValue) => value.trim().includes(blockedValue))
    );
  });

  const jwtSecret = config.JWT_SECRET;
  if (typeof jwtSecret === 'string' && jwtSecret.trim().length < 32) {
    blocked.push('JWT_SECRET');
  }

  if (missing.length || blocked.length) {
    const details = [
      missing.length ? `missing: ${missing.join(', ')}` : null,
      blocked.length ? `unsafe/default: ${[...new Set(blocked)].join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('; ');

    throw new Error(`Invalid production environment configuration (${details}).`);
  }

  parseCredentialedCorsOrigins(config.CORS_ORIGIN as string, 'production');
}

export function validateEnv(config: Record<string, unknown>) {
  const normalized = isProduction(config)
    ? { ...config }
    : {
        ...DEFAULT_DEVELOPMENT_VALUES,
        ...config,
      };

  if (isProduction(normalized)) {
    assertProductionEnv(normalized);
  }

  return normalized;
}
