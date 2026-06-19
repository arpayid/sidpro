'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface VillageProfileData {
  tenant: { id: string; name: string; code: string };
  village: {
    id: string;
    name: string;
    code: string;
    address?: string | null;
    province?: string | null;
    regency?: string | null;
    district?: string | null;
    postalCode?: string | null;
    vision?: string | null;
    mission?: string | null;
    description?: string | null;
  } | null;
}

export interface UpdateVillageProfileInput {
  name?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
  postalCode?: string;
  vision?: string;
  mission?: string;
  description?: string;
}

export function useVillageProfile() {
  return useQuery({
    queryKey: ['village-profile'],
    queryFn: async () => {
      const res = await apiClient<VillageProfileData>('/village-profile/manage');
      if (!res.data) throw new Error('Profil desa tidak tersedia');
      return res.data;
    },
  });
}

export function useUpdateVillageProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: UpdateVillageProfileInput) => {
      const res = await apiClient('/village-profile', { method: 'PATCH', body });
      if (!res.success) throw new Error(res.message ?? 'Gagal menyimpan profil desa');
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['village-profile'] });
    },
  });
}
