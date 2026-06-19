'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TwoFactorSetupResponse } from '@sidpro/types';

export function useSetupTwoFactor() {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient<TwoFactorSetupResponse>('/auth/2fa/setup', { method: 'POST' });
      if (!res.data) throw new Error('Gagal memulai setup 2FA');
      return res.data;
    },
  });
}

export function useEnableTwoFactor() {
  return useMutation({
    mutationFn: async (token: string) => {
      const res = await apiClient('/auth/2fa/enable', { method: 'POST', body: { token } });
      if (!res.success) throw new Error(res.message ?? 'Gagal mengaktifkan 2FA');
      return res;
    },
  });
}

export function useDisableTwoFactor() {
  return useMutation({
    mutationFn: async (body: { token: string; password: string }) => {
      const res = await apiClient('/auth/2fa/disable', { method: 'POST', body });
      if (!res.success) throw new Error(res.message ?? 'Gagal menonaktifkan 2FA');
      return res;
    },
  });
}
