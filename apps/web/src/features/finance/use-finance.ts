'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildQuery } from '@/lib/api-client';
import type { PaginationMeta } from '@sidpro/types';

export interface BudgetItem {
  id: string;
  category: string;
  name: string;
  planned: string | number;
  realized: string | number;
}

export interface BudgetYear {
  id: string;
  year: number;
  totalBudget: string | number;
  status: string;
  items: BudgetItem[];
}

export interface BudgetRealizationEntry {
  id: string;
  budgetItemId: string;
  entryType: 'realization' | 'reversal' | 'migration_opening_balance';
  amount: string | number;
  description: string | null;
  reference: string | null;
  occurredAt: string;
  createdAt: string;
}

export function useBudgetYears(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['finance', 'budget-years', { page, limit }],
    queryFn: async () => {
      const res = await apiClient<BudgetYear[]>(
        `/finance/budget-years${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useBudgetRealizationEntries(
  budgetItemId?: string,
  params: { page?: number; limit?: number } = {},
) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['finance', 'budget-realizations', budgetItemId, { page, limit }],
    enabled: Boolean(budgetItemId),
    queryFn: async () => {
      const res = await apiClient<BudgetRealizationEntry[]>(
        `/finance/budget-items/${budgetItemId}/realizations${buildQuery({ page, limit })}`,
      );
      return { data: res.data ?? [], meta: res.meta as PaginationMeta | undefined };
    },
  });
}

export function useCreateBudgetYear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { year: number; totalBudget: number; status?: string }) => {
      const res = await apiClient<BudgetYear>('/finance/budget-years', { method: 'POST', body });
      if (!res.data) throw new Error('Gagal membuat tahun anggaran');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'budget-years'] }),
  });
}

export function useCreateBudgetItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      budgetYearId,
      body,
    }: {
      budgetYearId: string;
      body: { category: string; name: string; planned: number };
    }) => {
      const res = await apiClient<BudgetItem>(`/finance/budget-years/${budgetYearId}/items`, {
        method: 'POST',
        body,
      });
      if (!res.data) throw new Error('Gagal menambahkan pos anggaran');
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'budget-years'] }),
  });
}

export function useCreateBudgetRealizationEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      budgetItemId,
      body,
    }: {
      budgetItemId: string;
      body: {
        type: 'realization' | 'reversal';
        amount: number;
        description?: string;
        reference?: string;
        occurredAt?: string;
      };
    }) => {
      const res = await apiClient<{
        entry: BudgetRealizationEntry;
        budgetItem: BudgetItem;
      }>(`/finance/budget-items/${budgetItemId}/realizations`, {
        method: 'POST',
        body,
      });
      if (!res.data) throw new Error('Gagal mencatat realisasi anggaran');
      return res.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['finance', 'budget-years'] });
      qc.invalidateQueries({ queryKey: ['finance', 'budget-realizations', variables.budgetItemId] });
    },
  });
}
