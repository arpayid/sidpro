'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { AuthUser } from '@sidpro/types';
import {
  clearAuthSession,
  getStoredUser,
  hasPermission,
  hasAnyPermission,
  isAuthenticated,
} from '@/lib/auth';
import { apiClient, syncAuthProfile } from '@/lib/api-client';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  useEffect(() => {
    const sync = () => setUser(getStoredUser());
    window.addEventListener('sidpro:auth-updated', sync);
    return () => window.removeEventListener('sidpro:auth-updated', sync);
  }, []);

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
    queryClient.clear();
    setUser(null);
    router.push('/login');
  }, [router, queryClient]);

  const syncProfile = useCallback(async () => {
    const profile = await syncAuthProfile();
    if (profile) setUser(profile);
    return profile;
  }, []);

  return {
    user,
    isAuthenticated: isAuthenticated(),
    logout,
    syncProfile,
    can: (permission: string) => hasPermission(user, permission),
    canAny: (permissions: string[]) => hasAnyPermission(user, permissions),
  };
}

export type { AuthUser };
