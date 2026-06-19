'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface Asset {
  id: string;
  name: string;
  code: string;
  category: string;
  condition: string;
  location?: string | null;
  value?: string | number | null;
  description?: string | null;
}

export interface AssetInput {
  name: string;
  code: string;
  category: string;
  condition?: string;
  location?: string;
  value?: number;
  description?: string;
}

export function useAssets(params: { page?: number; limit?: number; category?: string } = {}) {
  const { page = 1, limit = 20, category } = params;
  return useQuery({
    queryKey: ['assets', { page, limit, category }],
    queryFn: async () => {
      const res = await apiClient<Asset[]>(`/assets${buildQuery({ page, limit, category })}`);
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AssetInput) => {
      const res = await apiClient<Asset>('/assets', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal menambahkan aset');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/assets/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assets'] }),
  });
}
