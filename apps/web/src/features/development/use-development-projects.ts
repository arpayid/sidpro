'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface DevelopmentProject {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  location?: string | null;
  budget?: string | number | null;
  fundingSource?: string | null;
  status: string;
  progress: number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevelopmentProjectInput {
  name: string;
  code: string;
  description?: string;
  location?: string;
  budget?: number;
  fundingSource?: string;
  status?: string;
  progress?: number;
  startDate?: string;
  endDate?: string;
}

export function useDevelopmentProjects(params: { page?: number; limit?: number; status?: string } = {}) {
  const { page = 1, limit = 20, status } = params;
  return useQuery({
    queryKey: ['development', 'projects', { page, limit, status }],
    queryFn: async () => {
      const res = await apiClient<DevelopmentProject[]>(
        `/development/projects${buildQuery({ page, limit, status })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateDevelopmentProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: DevelopmentProjectInput) => {
      const res = await apiClient<DevelopmentProject>('/development/projects', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal membuat proyek');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['development', 'projects'] }),
  });
}

export function useUpdateDevelopmentProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<DevelopmentProjectInput> }) => {
      const res = await apiClient<DevelopmentProject>(`/development/projects/${id}`, {
        method: 'PATCH',
        body,
      });
      if (!res.data) throw new Error('Gagal memperbarui proyek');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['development', 'projects'] }),
  });
}

export function useDeleteDevelopmentProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/development/projects/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['development', 'projects'] }),
  });
}
