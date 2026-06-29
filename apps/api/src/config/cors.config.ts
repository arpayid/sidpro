const DEVELOPMENT_CORS_ORIGIN = 'http://localhost:3000';

function isProduction(environment?: string): boolean {
  return environment === 'production';
}

function normalizeOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid CORS origin: ${value}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`CORS origin must use http or https: ${value}`);
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`CORS origin must be an origin only, without path, credentials, query, or hash: ${value}`);
  }

  return parsed.origin;
}

export function parseCredentialedCorsOrigins(raw: string | undefined, environment?: string): string[] {
  const configured = raw?.trim();
  if (!configured) {
    if (isProduction(environment)) {
      throw new Error('CORS_ORIGIN is required in production.');
    }
    return [DEVELOPMENT_CORS_ORIGIN];
  }

  const origins = configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!origins.length) {
    throw new Error('CORS_ORIGIN must include at least one origin.');
  }
  if (origins.includes('*')) {
    throw new Error('CORS_ORIGIN must not include * when credentials are enabled.');
  }

  return [...new Set(origins.map(normalizeOrigin))];
}
