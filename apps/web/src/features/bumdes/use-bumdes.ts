'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface BumdesUnit {
  id: string;
  name: string;
  code: string;
  businessType?: string | null;
  status: string;
  description?: string | null;
}

export interface BumdesUnitInput {
  name: string;
  code: string;
  businessType?: string;
  description?: string;
}

export function useBumdesUnits(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['bumdes', 'units', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<BumdesUnit[]>(
        `/bumdes/units${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateBumdesUnit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: BumdesUnitInput) => {
      const res = await apiClient('/bumdes/units', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.success) throw new Error(res.message ?? 'Gagal menambah unit');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bumdes'] }),
  });
}

export interface BumdesFinancialRecord {
  id: string;
  type: 'revenue' | 'expense';
  amount: string;
  description?: string | null;
  recordDate: string;
  unit?: { id: string; name: string; code: string };
}

export interface BumdesFinancialInput {
  unitId: string;
  type: 'revenue' | 'expense';
  amount: number;
  description?: string;
  recordDate: string;
}

export function useBumdesFinancialRecords(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['bumdes', 'financial-records', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<BumdesFinancialRecord[]>(
        `/bumdes/financial-records${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateBumdesFinancialRecord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: BumdesFinancialInput) => {
      const res = await apiClient('/bumdes/financial-records', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.success) throw new Error(res.message ?? 'Gagal mencatat transaksi');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bumdes'] }),
  });
}
