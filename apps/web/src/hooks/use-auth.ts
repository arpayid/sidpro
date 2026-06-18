'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@sidpro/types';
import {
  clearAuthSession,
  getStoredUser,
  hasPermission,
  hasAnyPermission,
  isAuthenticated,
} from '@/lib/auth';
import { apiClient } from '@/lib/api-client';

export function useAuth() {
  const router = useRouter();
  const user = getStoredUser();

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('sidpro_refresh_token');
      await apiClient('/auth/logout', {
        method: 'POST',
        body: { refreshToken },
      });
    } catch {
      // ignore — still clear local session
    }
    clearAuthSession();
    router.push('/login');
  }, [router]);

  return {
    user,
    isAuthenticated: isAuthenticated(),
    logout,
    can: (permission: string) => hasPermission(user, permission),
    canAny: (permissions: string[]) => hasAnyPermission(user, permissions),
  };
}

export type { AuthUser };
