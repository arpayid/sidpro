'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
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
      const res = await apiFetch<{
        villageName: string;
        center: { lat: number; lng: number; zoom: number };
        layers: PublicMapLayer[];
      }>(`/api/v1/public/map?tenantCode=${encodeURIComponent(getPublicTenantCode())}`);
      if (!res.data) throw new Error('Peta tidak tersedia');
      return res.data;
    },
  });
}
