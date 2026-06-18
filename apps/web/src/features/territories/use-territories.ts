'use client';

import { useQuery } from '@tanstack/react-query';
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
