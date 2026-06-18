'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UpdateLetterSettingsInput, UpdateLetterTemplateInput } from '@sidpro/validators';
import { apiClient } from '@/lib/api-client';

export interface LetterSignatorySettings {
  name: string;
  title: string;
}

export interface LetterPdfSettings {
  maskNik: boolean;
}

export interface LetterHeaderSettings {
  useCustom: boolean;
  name?: string;
  address?: string;
  province?: string;
  regency?: string;
  district?: string;
}

export interface LetterTemplateItem {
  id: string;
  name: string;
  content: string;
  letterTypeId: string;
  isActive: boolean;
  letterType: { id: string; code: string; name: string };
}

export interface LetterSettingsResponse {
  signatory: LetterSignatorySettings;
  pdf: LetterPdfSettings;
  header: LetterHeaderSettings;
  villageProfile: {
    name: string;
    address?: string | null;
    province?: string | null;
    regency?: string | null;
    district?: string | null;
  } | null;
  letterTypes: { id: string; code: string; name: string }[];
  templates: LetterTemplateItem[];
}

export function useLetterSettings() {
  return useQuery({
    queryKey: ['letters', 'settings'],
    queryFn: async () => {
      const res = await apiClient<LetterSettingsResponse>('/letters/settings');
      if (!res.data) throw new Error('Pengaturan surat tidak ditemukan');
      return res.data;
    },
  });
}

export function useUpdateLetterSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateLetterSettingsInput) =>
      apiClient('/letters/settings', { method: 'PUT', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letters', 'settings'] });
    },
  });
}

export function useUpdateLetterTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateLetterTemplateInput }) =>
      apiClient(`/letter-templates/${id}`, { method: 'PATCH', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['letters', 'settings'] });
      qc.invalidateQueries({ queryKey: ['letters', 'types'] });
    },
  });
}
