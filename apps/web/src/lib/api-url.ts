export const API_PREFIX = '/api/v1';
export const DEFAULT_API_ORIGIN = 'http://localhost:4000';

const LEGACY_API_PREFIX_PATTERN = /\/api\/v1\/?$/;

export function getApiOrigin(): string {
  const configuredOrigin = process.env.NEXT_PUBLIC_API_URL;
  if (configuredOrigin === '') return '';

  const normalizedOrigin = (configuredOrigin ?? DEFAULT_API_ORIGIN).replace(/\/+$/, '');

  return normalizedOrigin.replace(LEGACY_API_PREFIX_PATTERN, '');
}

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pathWithoutApiPrefix = normalizedPath.startsWith(`${API_PREFIX}/`)
    ? normalizedPath.slice(API_PREFIX.length)
    : normalizedPath === API_PREFIX
      ? ''
      : normalizedPath;

  return `${getApiOrigin()}${API_PREFIX}${pathWithoutApiPrefix}`;
}
