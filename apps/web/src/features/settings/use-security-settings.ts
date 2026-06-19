'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const SECURITY_REQUIRE_2FA_KEY = 'security.require_2fa_admin';

interface SettingRecord {
  key: string;
  value: { enabled: boolean };
}

export function useSecuritySettings() {
  return useQuery({
    queryKey: ['settings', 'security'],
    queryFn: async () => {
      const res = await apiClient<SettingRecord>(`/settings/${SECURITY_REQUIRE_2FA_KEY}`);
      const value = res.data?.value;
      return {
        require2FaAdmin: Boolean(value && typeof value === 'object' && 'enabled' in value && value.enabled),
      };
    },
  });
}

export function useUpdateSecuritySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (require2FaAdmin: boolean) => {
      const res = await apiClient(`/settings/${SECURITY_REQUIRE_2FA_KEY}`, {
        method: 'PUT',
        body: { value: { enabled: require2FaAdmin } },
      });
      if (!res.success) throw new Error(res.message ?? 'Gagal menyimpan kebijakan keamanan');
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings', 'security'] });
    },
  });
}
