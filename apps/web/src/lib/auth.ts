import type { AuthUser } from '@sidpro/types';

const ACCESS_TOKEN_KEY = 'sidpro_access_token';
const REFRESH_TOKEN_KEY = 'sidpro_refresh_token';
const USER_KEY = 'sidpro_user';
export const ACCESS_COOKIE = 'sidpro_access_token';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days for refresh session marker

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function setCookie(name: string, value: string, maxAge: number) {
  if (!isBrowser()) return;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (!isBrowser()) return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuthSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser,
): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  setCookie(ACCESS_COOKIE, accessToken, COOKIE_MAX_AGE);
  window.dispatchEvent(new CustomEvent('sidpro:auth-updated'));
}

export function updateStoredUser(user: AuthUser): void {
  if (!isBrowser()) return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent('sidpro:auth-updated'));
}

export function clearAuthSession(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearCookie(ACCESS_COOKIE);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(user: AuthUser | null, permissions: string[]): boolean {
  if (!user) return false;
  return permissions.some((p) => user.permissions.includes(p));
}
