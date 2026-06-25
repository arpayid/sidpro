import type { ApiResponse } from '@sidpro/types';
import { buildApiUrl, getApiOrigin } from '@/lib/api-url';

const API_URL = getApiOrigin();

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions {
  token?: string | null;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
  cache?: 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';
  next?: { revalidate?: number | false; tags?: string[] };
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { token, headers, ...rest } = options;

  const response = await fetch(buildApiUrl(path), {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiError(
      body.message ?? `Request failed with status ${response.status}`,
      response.status,
      body.error?.code,
    );
  }

  return body;
}

export async function apiFetchWithFallback<T>(
  path: string,
  fallback: T,
  options?: FetchOptions,
): Promise<T> {
  try {
    const response = await apiFetch<T>(path, options);
    return response.data ?? fallback;
  } catch {
    return fallback;
  }
}

export { API_URL, buildApiUrl };
