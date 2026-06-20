'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface ProvisionParent {
  id: string;
  name: string;
  code: string;
  level: string;
}

export function useProvisionParents() {
  return useQuery({
    queryKey: ['tenants', 'provision', 'parents'],
    queryFn: async () => {
      const res = await apiClient<{ parents: ProvisionParent[] }>('/tenants/provision/parents');
      if (!res.data) throw new Error('Gagal memuat opsi parent');
      return res.data.parents;
    },
  });
}
