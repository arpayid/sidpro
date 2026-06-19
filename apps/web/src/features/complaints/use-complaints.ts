'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateComplaintInput, RespondComplaintInput } from '@sidpro/validators';
import { apiClient, apiUpload, buildQuery, downloadBinary } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface ComplaintUser {
  id: string;
  name: string;
  email?: string;
}

export interface ComplaintResponse {
  id: string;
  response: string;
  status?: string | null;
  createdAt: string;
  responderId?: string | null;
}

export interface ComplaintAttachment {
  id: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  location?: string | null;
  reporterName?: string | null;
  reporterPhone?: string | null;
  reporterEmail?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  reporter?: ComplaintUser | null;
  assignee?: ComplaintUser | null;
  responses?: ComplaintResponse[];
  attachments?: ComplaintAttachment[];
  _count?: { responses: number };
}

export interface ComplaintsParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  submitted: 'Masuk',
  verified: 'Diverifikasi',
  assigned: 'Ditugaskan',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  rejected: 'Ditolak',
  closed: 'Ditutup',
};

export const COMPLAINT_PRIORITY_LABELS: Record<string, string> = {
  low: 'Rendah',
  medium: 'Sedang',
  high: 'Tinggi',
  urgent: 'Mendesak',
};

export function useComplaints(params: ComplaintsParams = {}) {
  const { page = 1, limit = 20, status, priority, search, dateFrom, dateTo } = params;
  return useQuery({
    queryKey: ['complaints', { page, limit, status, priority, search, dateFrom, dateTo }],
    queryFn: async () => {
      const res = await apiClient<Complaint[]>(
        `/complaints${buildQuery({ page, limit, status, priority, search, dateFrom, dateTo })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useComplaint(id: string | null) {
  return useQuery({
    queryKey: ['complaints', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<Complaint>(`/complaints/${id}`);
      if (!res.data) throw new Error('Pengaduan tidak ditemukan');
      return res.data;
    },
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CreateComplaintInput) => {
      const res = await apiClient<Complaint>('/complaints', { method: 'POST', body });
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['complaints'] }),
  });
}

export function useUpdateComplaintStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: string;
      note?: string;
    }) => {
      const res = await apiClient<Complaint>(`/complaints/${id}/status`, {
        method: 'PATCH',
        body: { status, note },
      });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      qc.invalidateQueries({ queryKey: ['complaints', id] });
    },
  });
}

export function useAssignComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, assigneeId }: { id: string; assigneeId: string }) => {
      const res = await apiClient<Complaint>(`/complaints/${id}/assign`, {
        method: 'PATCH',
        body: { assigneeId },
      });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      qc.invalidateQueries({ queryKey: ['complaints', id] });
    },
  });
}

export function useAddComplaintResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: RespondComplaintInput;
    }) => {
      const res = await apiClient<ComplaintResponse>(`/complaints/${id}/responses`, {
        method: 'POST',
        body,
      });
      return res;
    },
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      qc.invalidateQueries({ queryKey: ['complaints', id] });
    },
  });
}

export function useCloseComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient<Complaint>(`/complaints/${id}/close`, { method: 'PATCH' });
      return res;
    },
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['complaints'] });
      qc.invalidateQueries({ queryKey: ['complaints', id] });
    },
  });
}

export function useDownloadComplaintFile() {
  return useMutation({
    mutationFn: async (fileId: string) => {
      const res = await apiClient<{ url: string }>(`/files/${fileId}/download`);
      if (!res.data?.url) throw new Error('URL unduhan tidak tersedia');
      return res.data.url;
    },
  });
}

export function useUploadComplaintAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ complaintId, file }: { complaintId: string; file: File }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ownerType', 'complaint');
      formData.append('ownerId', complaintId);
      const res = await apiUpload<{ id: string }>('/files/upload', formData);
      if (!res.data) throw new Error('Upload gagal');
      return res.data;
    },
    onSuccess: (_, { complaintId }) => {
      qc.invalidateQueries({ queryKey: ['complaints', complaintId] });
      qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

export function useExportComplaints() {
  return useMutation({
    mutationFn: () => downloadBinary('/complaints/export', 'pengaduan-export.csv'),
  });
}

export interface ComplaintSlaStats {
  slaDays: number;
  openCount: number;
  overdueCount: number;
  avgResolutionDays: number;
  byStatus: { status: string; count: number }[];
}

export function useComplaintSlaStats() {
  return useQuery({
    queryKey: ['complaints', 'sla-stats'],
    queryFn: async () => {
      const res = await apiClient<ComplaintSlaStats>('/complaints/sla-stats');
      if (!res.data) throw new Error('Gagal memuat statistik SLA');
      return res.data;
    },
  });
}
