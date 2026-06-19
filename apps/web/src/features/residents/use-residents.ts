'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateResidentInput, ResidentMutationInput } from '@sidpro/validators';
import {
  apiClient,
  apiUpload,
  buildQuery,
  downloadBinary,
} from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface ResidentAddress {
  id: string;
  rt?: string;
  rw?: string;
  hamlet?: string;
  fullAddress?: string;
}

export interface ResidentFamily {
  id: string;
  kkNumber: string;
}

export interface Resident {
  id: string;
  nik: string;
  fullName: string;
  gender: 'male' | 'female';
  birthPlace: string;
  birthDate: string;
  religion?: string | null;
  education?: string | null;
  occupation?: string | null;
  maritalStatus?: string | null;
  residentStatus: string;
  family?: ResidentFamily | null;
  address?: ResidentAddress | null;
}

export interface ResidentsListParams {
  page?: number;
  limit?: number;
  search?: string;
  residentStatus?: string;
}

function residentsKey(params: ResidentsListParams) {
  return ['residents', params] as const;
}

async function downloadFile(path: string, filename: string) {
  await downloadBinary(path, filename);
}

function downloadCsv(rows: Resident[], filename: string) {
  const headers = ['NIK', 'Nama', 'JK', 'Tempat Lahir', 'Tanggal Lahir', 'Status'];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.nik,
        `"${r.fullName.replace(/"/g, '""')}"`,
        r.gender === 'male' ? 'L' : 'P',
        `"${r.birthPlace.replace(/"/g, '""')}"`,
        r.birthDate.slice(0, 10),
        r.residentStatus,
      ].join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function useResidents(params: ResidentsListParams = {}) {
  const { page = 1, limit = 20, search, residentStatus } = params;
  return useQuery({
    queryKey: residentsKey({ page, limit, search, residentStatus }),
    queryFn: async () => {
      const res = await apiClient<Resident[]>(
        `/residents${buildQuery({ page, limit, search, residentStatus })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useResident(id: string | null) {
  return useQuery({
    queryKey: ['residents', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<Resident>(`/residents/${id}`);
      if (!res.data) throw new Error('Penduduk tidak ditemukan');
      return res.data;
    },
  });
}

export function useCreateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateResidentInput) =>
      apiClient<Resident>('/residents', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateResidentInput> }) =>
      apiClient<Resident>(`/residents/${id}`, { method: 'PATCH', body }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['residents'] });
      qc.invalidateQueries({ queryKey: ['residents', id] });
    },
  });
}

export function useMutateResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ResidentMutationInput }) =>
      apiClient<Resident>(`/residents/${id}/mutate`, { method: 'POST', body }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['residents'] });
      qc.invalidateQueries({ queryKey: ['residents', id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteResident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<void>(`/residents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useExportResidents() {
  return useMutation({
    mutationFn: async () => {
      try {
        await downloadFile('/residents/export', 'penduduk-export.csv');
      } catch {
        const res = await apiClient<Resident[]>(
          `/residents${buildQuery({ page: 1, limit: 10000 })}`,
        );
        downloadCsv(res.data ?? [], 'penduduk-export.csv');
      }
    },
  });
}

export function useImportResidents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiUpload<{ imported: number }>('/residents/import', formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['residents'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
