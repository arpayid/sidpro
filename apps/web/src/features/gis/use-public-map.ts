'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { getPublicTenantCode } from '@/lib/tenant';

export function usePublicMap() {
  return useQuery({
    queryKey: ['public', 'map', getPublicTenantCode()],
    queryFn: async () => {
      const res = await apiFetch<{
        villageName: string;
        center: { lat: number; lng: number; zoom: number };
      }>(`/api/v1/public/map?tenantCode=${encodeURIComponent(getPublicTenantCode())}`);
      if (!res.data) throw new Error('Peta tidak tersedia');
      return res.data;
    },
  });
}
