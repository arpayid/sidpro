import type { ApiResponse } from '@sidpro/types';
import type { AuthUser } from '@sidpro/types';
import { API_PREFIX, buildApiUrl, getApiOrigin } from './api-url';
import {
  getAccessToken,
  getRefreshToken,
  setAuthSession,
  clearAuthSession,
  getStoredUser,
  updateStoredUser,
} from './auth';

export const API_BASE = getApiOrigin();
export { API_PREFIX, buildApiUrl };

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

export interface RequestOptions extends Omit<globalThis.RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

async function fetchAuthProfile(accessToken: string): Promise<AuthUser | null> {
  const res = await fetch(buildApiUrl('/auth/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as ApiResponse<AuthUser>;
  return body.data ?? null;
}

function profileClaimsChanged(previous: AuthUser | null, next: AuthUser): boolean {
  if (!previous) return false;
  const signature = (values: string[]) => [...values].sort().join('\0');
  return (
    signature(previous.permissions) !== signature(next.permissions) ||
    signature(previous.roles) !== signature(next.roles)
  );
}

export async function syncAuthProfile(): Promise<AuthUser | null> {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) return null;

  let profile = await fetchAuthProfile(accessToken);
  if (!profile) {
    const newToken = await refreshAccessToken();
    if (!newToken) return null;
    return getStoredUser();
  }

  const stored = getStoredUser();
  if (profileClaimsChanged(stored, profile)) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      profile = (await fetchAuthProfile(newToken)) ?? profile;
      updateStoredUser(profile);
      return profile;
    }
  }

  updateStoredUser(profile);
  return profile;
}

export async function downloadBinary(path: string, filename: string): Promise<void> {
  const doFetch = async (token: string | null) =>
    fetch(buildApiUrl(path), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

  let response = await doFetch(getAccessToken());

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      handleUnauthorized();
      throw new ApiError('Sesi berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    }
    response = await doFetch(newToken);
  }

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new ApiError('Export gagal', response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
      const res = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) return null;

      const body = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;

      const user = getStoredUser();
      if (!body.data || !user) return null;

      const profile = (await fetchAuthProfile(body.data.accessToken)) ?? user;
      setAuthSession(body.data.accessToken, body.data.refreshToken, profile);
      return body.data.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function handleUnauthorized() {
  clearAuthSession();
  if (typeof window !== 'undefined') {
    const callback = window.location.pathname;
    const login = callback.startsWith('/admin')
      ? `/login?callbackUrl=${encodeURIComponent(callback)}`
      : '/login';
    window.location.href = login;
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { body, skipAuth, skipRefresh, headers, ...rest } = options;

  const token = skipAuth ? null : getAccessToken();

  const doFetch = async (accessToken: string | null) => {
    return fetch(buildApiUrl(path), {
      ...rest,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch(token);

  if (response.status === 401 && !skipAuth && !skipRefresh) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await doFetch(newToken);
    } else {
      handleUnauthorized();
      throw new ApiError('Sesi berakhir. Silakan login kembali.', 401, 'UNAUTHORIZED');
    }
  }

  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    if (response.status === 401 && !skipAuth) {
      handleUnauthorized();
    }
    throw new ApiError(
      json.message ?? `Permintaan gagal (${response.status})`,
      response.status,
      json.error?.code,
    );
  }

  return json;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
  const token = getAccessToken();
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const json = (await response.json().catch(() => ({}))) as ApiResponse<T>;

  if (!response.ok) {
    if (response.status === 401) handleUnauthorized();
    throw new ApiError(json.message ?? 'Upload gagal', response.status, json.error?.code);
  }

  return json;
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
