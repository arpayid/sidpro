'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

export interface DistrictOverview {
  district: { id: string; name: string; code: string };
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

export function useDistrictOverview() {
  const { user } = useAuth();
  const isDistrictAdmin = user?.roles.includes('admin_kecamatan') ?? false;

  return useQuery({
    queryKey: ['tenants', 'district', 'overview', user?.id ?? null, user?.tenantId ?? null],
    queryFn: async () => {
      const res = await apiClient<DistrictOverview>('/tenants/district/overview');
      if (!res.data) throw new Error('Gagal memuat dashboard kecamatan');
      return res.data;
    },
    enabled: isDistrictAdmin && Boolean(user?.tenantId),
  });
}
