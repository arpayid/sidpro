'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface AidProgram {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
  _count?: { recipients: number };
}

export interface AidProgramInput {
  name: string;
  code: string;
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export function useAidPrograms(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['aid', 'programs', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<AidProgram[]>(
        `/social-assistance/programs${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateAidProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: AidProgramInput) => {
      const res = await apiClient<AidProgram>('/social-assistance/programs', {
        method: 'POST',
        body,
      });
      if (!res.data) throw new Error('Gagal membuat program bantuan');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aid', 'programs'] }),
  });
}
