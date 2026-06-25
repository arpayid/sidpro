'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getPublicTenantCode } from '@/lib/tenant';

export interface PublicMapLayer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  layerType?: string;
}

export function usePublicMap() {
  return useQuery({
    queryKey: ['public', 'map', getPublicTenantCode()],
    queryFn: async () => {
      const res = await apiClient<{
        villageName: string;
        center: { lat: number; lng: number; zoom: number };
        layers: PublicMapLayer[];
      }>(`/public/map?tenantCode=${encodeURIComponent(getPublicTenantCode())}`, { skipAuth: true });
      if (!res.data) throw new Error('Peta tidak tersedia');
      return res.data;
    },
  });
}
