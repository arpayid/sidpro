'use client';

import { useMutation } from '@tanstack/react-query';
import { publicComplaintTrackSchema, type PublicComplaintTrackInput } from '@sidpro/validators';
import { apiClient, buildQuery } from '@/lib/api-client';
import { getPublicTenantCode } from '@/lib/tenant';

export interface PublicComplaintTimelineEntry {
  status: string;
  label: string;
  at: string;
}

export interface PublicComplaintResponseEntry {
  message: string;
  at: string;
}

export interface PublicComplaintTrackResult {
  ticket: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  statusLabel: string;
  submittedAt: string;
  updatedAt: string;
  closedAt: string | null;
  timeline: PublicComplaintTimelineEntry[];
  responses: PublicComplaintResponseEntry[];
}

export function useTrackPublicComplaint() {
  return useMutation({
    mutationFn: async (values: PublicComplaintTrackInput) => {
      const tenantCode = getPublicTenantCode();
      const parsed = publicComplaintTrackSchema.parse(values);
      const res = await apiClient<PublicComplaintTrackResult>(
        `/complaints/public/track${buildQuery({ tenantCode })}`,
        { method: 'POST', body: parsed, skipAuth: true },
      );
      if (!res.data) throw new Error(res.message ?? 'Pengaduan tidak ditemukan');
      return res.data;
    },
  });
}
