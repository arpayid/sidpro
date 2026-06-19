'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface VillageSummary {
  village: { id: string; name: string; code: string; status: string; level: string };
  profile: {
    name: string;
    regency: string | null;
    district: string | null;
    address: string | null;
    province: string | null;
  } | null;
  stats: {
    residents: number;
    families: number;
    pendingLetters: number;
    openComplaints: number;
    totalComplaints: number;
  };
}

export function useVillageSummary(villageId: string | null) {
  return useQuery({
    queryKey: ['tenants', 'villages', 'summary', villageId],
    queryFn: async () => {
      const res = await apiClient<VillageSummary>(`/tenants/villages/${villageId}/summary`);
      if (!res.data) throw new Error('Gagal memuat ringkasan desa');
      return res.data;
    },
    enabled: Boolean(villageId),
  });
}
