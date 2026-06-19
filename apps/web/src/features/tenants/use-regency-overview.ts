'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export interface RegencyOverview {
  regency: { id: string; name: string; code: string };
  villageCount: number;
  totals: {
    residents: number;
    families: number;
    letterRequests: number;
    pendingLetters: number;
    complaints: number;
    openComplaints: number;
  };
  villages: {
    id: string;
    name: string;
    code: string;
    status: string;
    residentCount: number;
    openComplaintCount: number;
    pendingLetterCount: number;
  }[];
}

export function useRegencyOverview() {
  const { user } = useAuth();
  const isRegencyAdmin = user?.roles.includes('admin_kabupaten') ?? false;

  return useQuery({
    queryKey: ['tenants', 'regency', 'overview', user?.id ?? null, user?.tenantId ?? null],
    queryFn: async () => {
      const res = await apiClient<RegencyOverview>('/tenants/regency/overview');
      if (!res.data) throw new Error('Gagal memuat dashboard kabupaten');
      return res.data;
    },
    enabled: isRegencyAdmin && Boolean(user?.tenantId),
  });
}
