'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { LoginResponse, TwoFactorSetupResponse } from '@sidpro/types';

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

export function useSetupEnrollLogin() {
  return useMutation({
    mutationFn: async (enrollmentToken: string) => {
      const res = await apiClient<TwoFactorSetupResponse>('/auth/2fa/enroll-login/setup', {
        method: 'POST',
        body: { enrollmentToken },
        skipAuth: true,
      });
      if (!res.data) throw new Error('Gagal memulai enrollment 2FA');
      return res.data;
    },
  });
}

export function useCompleteEnrollLogin() {
  return useMutation({
    mutationFn: async (body: { enrollmentToken: string; token: string }) => {
      const res = await apiClient<LoginResponse>('/auth/2fa/enroll-login/complete', {
        method: 'POST',
        body,
        skipAuth: true,
      });
      if (!res.data) throw new Error('Gagal menyelesaikan enrollment 2FA');
      return res.data;
    },
  });
}
