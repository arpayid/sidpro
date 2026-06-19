'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';

export interface Hamlet {
  id: string;
  name: string;
  code: string;
  _count?: { neighborhoodUnits: number };
}

export interface NeighborhoodUnit {
  id: string;
  hamletId: string;
  rt: string;
  rw: string;
}

export function useHamlets(search?: string) {
  return useQuery({
    queryKey: ['hamlets', search],
    queryFn: async () => {
      const res = await apiClient<Hamlet[]>(
        `/hamlets${buildQuery({ page: 1, limit: 100, search })}`,
      );
      return res.data ?? [];
    },
  });
}

export function useNeighborhoodUnits(hamletId: string | null) {
  return useQuery({
    queryKey: ['neighborhood-units', hamletId],
    enabled: Boolean(hamletId),
    queryFn: async () => {
      const res = await apiClient<NeighborhoodUnit[]>(
        `/hamlets/${hamletId}/neighborhood-units`,
      );
      return res.data ?? [];
    },
  });
}

export function useCreateHamlet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; code: string }) => {
      const res = await apiClient<Hamlet>('/hamlets', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal menambahkan dusun');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hamlets'] }),
  });
}

export function useCreateNeighborhoodUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { hamletId: string; rt: string; rw: string }) => {
      const res = await apiClient<NeighborhoodUnit>('/neighborhood-units', {
        method: 'POST',
        body,
      });
      if (!res.data) throw new Error('Gagal menambahkan RT/RW');
      return res.data;
    },
    onSuccess: (_, { hamletId }) => {
      qc.invalidateQueries({ queryKey: ['neighborhood-units', hamletId] });
      qc.invalidateQueries({ queryKey: ['hamlets'] });
    },
  });
}
