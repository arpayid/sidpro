'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateLetterRequestInput } from '@sidpro/validators';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface LetterType {
  id: string;
  code: string;
  name: string;
  requiredFields?: Record<string, unknown> | null;
}

export interface LetterApproval {
  id: string;
  level: string;
  status: string;
  notes?: string | null;
  createdAt: string;
}

export interface LetterRequest {
  id: string;
  status: string;
  purpose: string;
  letterNumber?: string | null;
  submittedAt: string;
  letterType: LetterType;
  resident?: { id: string; fullName: string; nik?: string } | null;
  requester?: { id: string; name: string } | null;
  approvals?: LetterApproval[];
  outputs?: { id: string; qrCode: string }[];
}

export interface LetterRequestsParams {
  page?: number;
  limit?: number;
  status?: string;
}

export function useLetterTypes() {
  return useQuery({
    queryKey: ['letters', 'types'],
    queryFn: async () => {
      const res = await apiClient<LetterType[]>(
        `/letter-types${buildQuery({ page: 1, limit: 100 })}`,
      );
      return res.data ?? [];
    },
  });
}

export function useLetterRequests(params: LetterRequestsParams = {}) {
  const { page = 1, limit = 20, status } = params;
  return useQuery({
    queryKey: ['letters', 'requests', { page, limit, status }],
    queryFn: async () => {
      const res = await apiClient<LetterRequest[]>(
        `/letter-requests${buildQuery({ page, limit, status })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useLetterRequest(id: string | null) {
  return useQuery({
    queryKey: ['letters', 'requests', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<LetterRequest>(`/letter-requests/${id}`);
      if (!res.data) throw new Error('Permohonan tidak ditemukan');
      return res.data;
    },
  });
}

export function useCreateLetterRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateLetterRequestInput) =>
      apiClient<LetterRequest>('/letter-requests', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letters', 'requests'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useVerifyLetterRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      approved,
      notes,
    }: {
      id: string;
      approved: boolean;
      notes?: string;
    }) =>
      apiClient(`/letter-requests/${id}/verify`, {
        method: 'PATCH',
        body: { approved, notes },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['letters', 'requests'] });
      qc.invalidateQueries({ queryKey: ['letters', 'requests', id] });
    },
  });
}

export function useApproveLetterRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      approved,
      notes,
    }: {
      id: string;
      approved: boolean;
      notes?: string;
    }) =>
      apiClient(`/letter-requests/${id}/approve`, {
        method: 'PATCH',
        body: { approved, notes },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['letters', 'requests'] });
      qc.invalidateQueries({ queryKey: ['letters', 'requests', id] });
    },
  });
}

export function useRejectLetterRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      apiClient(`/letter-requests/${id}/reject`, {
        method: 'PATCH',
        body: { notes },
      }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['letters', 'requests'] });
      qc.invalidateQueries({ queryKey: ['letters', 'requests', id] });
    },
  });
}

export function useGenerateLetterPdf() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient<{
        letterNumber: string;
        qrCode: string;
        outputId: string;
        fileId: string;
        verificationUrl: string;
      }>(`/letter-requests/${id}/generate-pdf`, { method: 'POST' }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['letters', 'requests'] });
      qc.invalidateQueries({ queryKey: ['letters', 'requests', id] });
    },
  });
}

export function useDownloadLetterPdf() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient<{
        url: string;
        fileName: string;
        letterNumber?: string;
      }>(`/letter-requests/${id}/download`);
      if (!res.data?.url) throw new Error('URL unduhan tidak tersedia');
      return res.data;
    },
  });
}

export const LETTER_STATUS_LABELS: Record<string, string> = {
  submitted: 'Diajukan',
  verified: 'Terverifikasi',
  approved: 'Disetujui',
  completed: 'Selesai',
  rejected: 'Ditolak',
};
