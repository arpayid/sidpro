import type { AuthUser } from '@sidpro/types';

let accessToken: string | null = null;
let storedUser: AuthUser | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function notifyAuthChange(): void {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent('sidpro:auth-updated'));
}

export function getAccessToken(): string | null {
  return isBrowser() ? accessToken : null;
}

export function getStoredUser(): AuthUser | null {
  return isBrowser() ? storedUser : null;
}

export function setAuthSession(nextAccessToken: string, user: AuthUser): void {
  if (!isBrowser()) return;
  accessToken = nextAccessToken;
  storedUser = user;
  notifyAuthChange();
}

export function updateStoredUser(user: AuthUser): void {
  if (!isBrowser()) return;
  storedUser = user;
  notifyAuthChange();
}

export function clearAuthSession(): void {
  if (!isBrowser()) return;
  accessToken = null;
  storedUser = null;
  notifyAuthChange();
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
  return permissions.some((permission) => user.permissions.includes(permission));
}
