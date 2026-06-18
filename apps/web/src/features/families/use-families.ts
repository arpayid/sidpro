'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateFamilyInput, CreateResidentInput } from '@sidpro/validators';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';
import type { Resident } from '@/features/residents/use-residents';

export interface FamilyMember {
  id: string;
  relationship: string;
  isHead: boolean;
  resident: Pick<Resident, 'id' | 'fullName' | 'nik'>;
}

export interface Family {
  id: string;
  kkNumber: string;
  headResidentId?: string | null;
  economicStatus?: string | null;
  houseStatus?: string | null;
  familyMembers: FamilyMember[];
  address?: { id: string; rt?: string; rw?: string; fullAddress?: string } | null;
}

export interface FamiliesListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AddFamilyMemberInput {
  residentId: string;
  relationship: string;
  isHead?: boolean;
}

function familiesKey(params: FamiliesListParams) {
  return ['families', params] as const;
}

export function useFamilies(params: FamiliesListParams = {}) {
  const { page = 1, limit = 20, search } = params;
  return useQuery({
    queryKey: familiesKey({ page, limit, search }),
    queryFn: async () => {
      const res = await apiClient<Family[]>(
        `/families${buildQuery({ page, limit, search })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useFamily(id: string | null) {
  return useQuery({
    queryKey: ['families', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await apiClient<Family>(`/families/${id}`);
      if (!res.data) throw new Error('Keluarga tidak ditemukan');
      return res.data;
    },
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFamilyInput) =>
      apiClient<Family>('/families', { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<CreateFamilyInput> }) =>
      apiClient<Family>(`/families/${id}`, { method: 'PATCH', body }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['families', id] });
    },
  });
}

export function useAddFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, body }: { familyId: string; body: AddFamilyMemberInput }) =>
      apiClient<FamilyMember>(`/families/${familyId}/members`, {
        method: 'POST',
        body,
      }),
    onSuccess: (_, { familyId }) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
}

export function useRemoveFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, memberId }: { familyId: string; memberId: string }) =>
      apiClient<void>(`/families/${familyId}/members/${memberId}`, { method: 'DELETE' }),
    onSuccess: (_, { familyId }) => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['families', familyId] });
      qc.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}

export function useDeleteFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient<void>(`/families/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['families'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export type { CreateResidentInput };
