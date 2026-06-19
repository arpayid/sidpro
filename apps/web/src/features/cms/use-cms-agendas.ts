'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface CmsAgenda {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startAt: string;
  endAt?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CmsAgendaInput {
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt?: string;
  status?: string;
}

export interface CmsAgendasParams {
  page?: number;
  limit?: number;
}

export function useCmsAgendas(params: CmsAgendasParams = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['cms', 'agendas', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<CmsAgenda[]>(
        `/cms/admin/agendas${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateCmsAgenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CmsAgendaInput) => {
      const res = await apiClient<CmsAgenda>('/cms/admin/agendas', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal membuat agenda');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'agendas'] }),
  });
}

export function useUpdateCmsAgenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<CmsAgendaInput> }) => {
      const res = await apiClient<CmsAgenda>(`/cms/admin/agendas/${id}`, { method: 'PATCH', body });
      if (!res.data) throw new Error('Gagal memperbarui agenda');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'agendas'] }),
  });
}

export function useDeleteCmsAgenda() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient(`/cms/admin/agendas/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cms', 'agendas'] }),
  });
}
