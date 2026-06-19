'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
  return useQuery({
    queryKey: ['tenants', 'regency', 'overview'],
    queryFn: async () => {
      const res = await apiClient<RegencyOverview>('/tenants/regency/overview');
      if (!res.data) throw new Error('Gagal memuat dashboard kabupaten');
      return res.data;
    },
  });
}
