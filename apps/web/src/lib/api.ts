import type { ApiResponse } from '@sidpro/types';
import {
  apiClient,
  ApiError,
  API_BASE as API_URL,
  buildApiUrl,
  type RequestOptions,
} from '@/lib/api-client';

export { ApiError, API_URL, buildApiUrl };

export interface FetchOptions extends Omit<RequestOptions, 'body' | 'headers'> {
  token?: string | null;
  headers?: Record<string, string>;
  method?: string;
  body?: unknown;
  cache?: 'default' | 'force-cache' | 'no-cache' | 'no-store' | 'only-if-cached' | 'reload';
  next?: { revalidate?: number | false; tags?: string[] };
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { token, headers, skipAuth, ...rest } = options;
  return apiClient<T>(path, {
    ...rest,
    skipAuth: skipAuth ?? !token,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
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
