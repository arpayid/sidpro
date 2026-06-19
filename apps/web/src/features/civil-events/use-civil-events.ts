'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface CivilEventResident {
  id: string;
  fullName: string;
  nik: string;
}

export interface CivilEvent {
  id: string;
  residentId: string;
  eventType: string;
  eventDate: string;
  notes?: string | null;
  createdAt: string;
  resident?: CivilEventResident | null;
}

export interface CivilEventsListParams {
  page?: number;
  limit?: number;
  eventType?: string;
}

function civilEventsKey(params: CivilEventsListParams) {
  return ['civil-events', params] as const;
}

export function useCivilEvents(params: CivilEventsListParams = {}) {
  const { page = 1, limit = 20, eventType } = params;
  return useQuery({
    queryKey: civilEventsKey({ page, limit, eventType }),
    queryFn: async () => {
      const res = await apiClient<CivilEvent[]>(
        `/civil-events${buildQuery({ page, limit, eventType })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCivilEvent(id: string | null) {
  return useQuery({
    queryKey: ['civil-events', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<CivilEvent>(`/civil-events/${id}`);
      if (!res.data) throw new Error('Peristiwa tidak ditemukan');
      return res.data;
    },
  });
}

export function useCreateCivilEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      residentId: string;
      eventType: string;
      eventDate: string;
      notes?: string;
    }) => {
      const res = await apiClient<CivilEvent>('/civil-events', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal mencatat peristiwa');
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['civil-events'] });
      qc.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

export function useDeleteCivilEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/civil-events/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['civil-events'] }),
  });
}
