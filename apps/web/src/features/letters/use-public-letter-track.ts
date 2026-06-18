'use client';

import { useMutation } from '@tanstack/react-query';
import { publicLetterTrackSchema, type PublicLetterTrackInput } from '@sidpro/validators';
import { apiClient, buildQuery } from '@/lib/api-client';
import { getPublicTenantCode } from '@/lib/tenant';

export interface PublicLetterTimelineEntry {
  status: string;
  label: string;
  at: string;
}

export interface PublicLetterTrackResult {
  ticket: string;
  letterType: string;
  purpose: string;
  status: string;
  statusLabel: string;
  letterNumber: string | null;
  submittedAt: string;
  updatedAt: string;
  timeline: PublicLetterTimelineEntry[];
}

export function useTrackPublicLetter() {
  return useMutation({
    mutationFn: async (values: PublicLetterTrackInput) => {
      const tenantCode = getPublicTenantCode();
      const parsed = publicLetterTrackSchema.parse(values);
      const res = await apiClient<PublicLetterTrackResult>(
        `/letters/public/track${buildQuery({ tenantCode })}`,
        { method: 'POST', body: parsed, skipAuth: true },
      );
      if (!res.data) throw new Error(res.message ?? 'Permohonan surat tidak ditemukan');
      return res.data;
    },
  });
}
